const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3001;
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

// middlewares
app.use(cors());
app.use(express.json());

// create mongodb client
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    await client.connect();
    const db = client.db("athleticHubDB");
    const eventsCollection = db.collection("events");
    const bookingsCollection = db.collection("bookings");

    app.get("/", (req, res) => {
      res.send("Server is running...");
    });

    console.log("Connected to MongoDB successfully");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
};

run();

app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
