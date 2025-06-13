const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3001;
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
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

    // create event
    app.post("/api/v1/createEvent", async (req, res) => {
      try {
        const newEvent = req.body;
        if (
          !newEvent.eventName ||
          !newEvent.eventType ||
          !newEvent.date ||
          !newEvent.description ||
          !newEvent.creatorEmail ||
          !newEvent.creatorName
        ) {
          return res
            .status(400)
            .json({ error: "All required fields must be provided." });
        }

        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).json({
          message: "Event created successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.log("Error creating event:", error.message);
        res.status(500).json({
          error: "error occured while creating the event.",
        });
      }
    });

    // Get all events
    app.get("/api/v1/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray();

        if (events.length === 0) {
          return res.status(404).json({
            message: "No events found.",
          });
        }

        res.status(200).json({
          message: "Events retrieved successfully.",
          count: events.length,
          events,
        });
      } catch (error) {
        console.error("Error getting events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
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
