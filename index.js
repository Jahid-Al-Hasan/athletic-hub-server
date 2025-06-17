const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3001;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// create mongodb client
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// jwt middleware
const verifyJWT = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access!",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userEmail = req?.query?.email;
    if (userEmail !== decoded.email) {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "Unauthorized access!",
    });
  }
};

const run = async () => {
  try {
    // await client.connect();
    const db = client.db("athleticHubDB");
    const eventsCollection = db.collection("events");
    const testimonialsCollection = db.collection("testimonials");

    // jwt generate
    app.post("/api/v1/jwt", (req, res) => {
      const user = { email: req.body.email };
      // console.log(email);
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      if (!token) {
        return res.status(401).json({
          error: "Token not generated",
        });
      }
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ message: "JWT generated successfully" });
    });

    // create event
    app.post("/api/v1/createEvent", async (req, res) => {
      try {
        const newEvent = req.body;
        if (
          !newEvent.name ||
          !newEvent.category ||
          !newEvent.date ||
          !newEvent.description ||
          !newEvent.creatorEmail ||
          !newEvent.creatorName
        ) {
          return res
            .status(400)
            .json({ error: "All required fields must be provided." });
        }

        newEvent.createdAt = new Date();
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

        res.status(200).send(events);
      } catch (error) {
        console.error("Error getting events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
    });

    // get event by id
    app.get("/api/v1/event/:id", async (req, res) => {
      try {
        const eventId = req.params.id;
        if (!eventId) {
          return res.status(401).json({
            message: "Event id not found!",
          });
        }
        const event = await eventsCollection.findOne({
          _id: new ObjectId(eventId),
        });
        if (!event) {
          return res.status(400).json({
            message: "Event not found",
          });
        }
        res.status(201).send(event);
      } catch (error) {
        console.error("Error fetching event:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching event from the database.",
        });
      }
    });

    // update event participants
    app.patch(
      "/api/v1/update-eventParticipants/:id",
      verifyJWT,
      async (req, res) => {
        try {
          const email = req.query?.email;
          const eventId = req.params?.id;

          if (!eventId || !email) {
            return res.status(400).json({
              message: "Event ID or user email is missing!",
            });
          }

          const filter = { _id: new ObjectId(eventId) };
          const update = { $addToSet: { participants: email } };

          const result = await eventsCollection.updateOne(filter, update);

          if (!result) {
            return res.status(404).json({ message: "Event not updated." });
          }
          // console.log(result);

          res.status(200).json({
            message: "Updated successfully",
            result,
          });
        } catch (error) {
          console.error("Error fetching event:", error.message);
          res.status(500).json({
            error:
              "An error occurred while fetching the event from the database.",
          });
        }
      }
    );

    // get my booking events
    app.get("/api/v1/my-bookings", verifyJWT, async (req, res) => {
      try {
        const userEmail = req.query.email;
        if (!userEmail) {
          return res.status(400).json({
            error: "Email is required to fetch booking",
          });
        }

        const query = { participants: userEmail };
        const myBookings = await eventsCollection.find(query).toArray();
        if (!myBookings) {
          return res.status(401).json({
            error: "No booking found",
          });
        }
        res.status(200).send(myBookings);
      } catch (error) {
        console.error("Error fetching events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
    });

    // cancel event booking
    app.patch("/api/v1/cancel-booking/:id", verifyJWT, async (req, res) => {
      try {
        const email = req.query.email;
        const id = req.params.id;

        if (!email || !id) {
          return res.status(401).json({
            error: "email or id not found",
          });
        }

        const filter = { _id: new ObjectId(id) };
        const update = { $pull: { participants: email } };

        const result = await eventsCollection.updateOne(filter, update);

        if (!result) {
          return res.status(400).json({
            error: "Booking not canceled",
          });
        }
        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
    });

    // get events by creator
    app.get("/api/v1/creator-events", verifyJWT, async (req, res) => {
      try {
        const creatorEmail = req.query.email;
        if (!creatorEmail) {
          return res.status(401).json({
            error: "Creator Email not found",
          });
        }
        const result = await eventsCollection
          .find({ creatorEmail: creatorEmail })
          .toArray();
        if (!result) {
          return res.status(400).json({
            error: "Event not found",
          });
        }
        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
    });

    // delete event by creator
    app.delete("/api/v1/delete-event/:id", verifyJWT, async (req, res) => {
      try {
        const creatorEmail = req.query.email;
        const id = req.params.id;
        if (!creatorEmail || !id) {
          return res.status(401).json({
            error: "Creator Email or eventId not found",
          });
        }
        const result = await eventsCollection.deleteOne(
          { creatorEmail: creatorEmail },
          { _id: new ObjectId(id) }
        );
        if (!result) {
          return res.status(400).json({
            error: "Event not found",
          });
        }
        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
    });

    // update event by creator
    app.patch("/api/v1/update-event/:id", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const updateForm = req.body;
        // console.log(id, updateForm);
        if (!id || !updateForm) {
          return res.status(401).json({
            error: "Id or data is missing",
          });
        }
        const filter = { _id: new ObjectId(id) };
        const query = { $set: updateForm };
        // console.log(query);
        const result = await eventsCollection.updateOne(filter, query);
        if (!result) {
          return res.status(400).json({
            error: "Something went wrong try again",
          });
        }
        if (!result.modifiedCount > 0) {
          return res.status(400).json({
            error: "event does not updated",
          });
        }
        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching events:", error.message);
        res.status(500).json({
          error: "An error occurred while fetching events from the database.",
        });
      }
    });

    // insert testimonials
    app.post("/api/v1/insert-testimonials", async (req, res) => {
      try {
        const testimonial = req.body;
        const result = testimonialsCollection.insertOne(testimonial);

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // get testimonials
    app.get("/api/v1/testimonials", async (req, res) => {
      try {
        const result = await testimonialsCollection.find().toArray();
        if (!result) {
          return res.status(401).json({
            error: "testimonials not found",
          });
        }

        res.status(200).send(result);
      } catch (error) {
        console.log(error);
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
