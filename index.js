const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 3000;
var serviceAccount = require("./ph-a10-2ab9e-firebase-adminsdk.json");

app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  const authorized = req.headers.authorization;
  if (!authorized) {
    return res.status(401).send({
      message: "unauthorized access token",
    });
  }

  const token = authorized.split(" ")[1];

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: "unauthorized access",
    });
  }
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  "mongodb+srv://ph-a10-db:uPeEYyKHCGfNWyXv@cluster0.2ow2vy0.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("ph-a10-db");
    const eventCollection = db.collection("events");
    const joinedEventCollection = db.collection("joined-events");

    app.get("/events", async (req, res) => {
      const result = await eventCollection.find().toArray();
      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      const { id } = req.params;
      const result = await eventCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/events", async (req, res) => {
      const data = req.body;
      const result = await eventCollection.insertOne(data);
      res.send({ result });
    });

    app.get("/joined-events",verifyToken, async (req, res) => {
      const userEmail = req.query.userEmail; 
      const result = await joinedEventCollection.find({joinedBy: userEmail}).toArray();

      const sorted = result.sort(
        (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
      );

      res.send(sorted);
    });

    app.post("/joined-events", async (req, res) => {
      const data = req.body;
      const result = await joinedEventCollection.insertOne(data);
      res.send({ result });
    });

    app.get("/my-events/:email",verifyToken, async (req, res) => {
      const { email } = req.params;
      const result = await eventCollection.find({ createdBy: email }).toArray();

      res.send(result);
    });

    app.put("/events/:id", async (req, res) => {
      const { id } = req.params;
      const updateEvent = req.body;

      const filter = {
        _id: new ObjectId(id),
        createdBy: updateEvent.createdBy,
      };

      const updateDoc = {
        $set: {
          title: updateEvent.title,
          description: updateEvent.description,
          eventType: updateEvent.eventType,
          thumbnail: updateEvent.thumbnail,
          location: updateEvent.location,
          eventDate: updateEvent.eventDate,
        },
      };

      app.delete("/events/:id", async (req, res) => {
        const { id } = req.params;
        const { email } = req.query;

        try {
          const result = await eventCollection.deleteOne({
            _id: new ObjectId(id),
            createdBy: email,
          });

          res.send(result);
        } catch (error) {
          res.status(500).send({ message: "Failed to delete event" });
        }
      });

      const result = await eventCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
