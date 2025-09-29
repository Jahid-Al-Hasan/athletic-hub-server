const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3001;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { sendEventCreationEmail } = require("./src/services/emailServices");
const QRCode = require("qrcode");

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://athletichub-ce630.web.app"],
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
  try {
    const token = req?.cookies?.token;
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized access!",
      });
    }
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
    return res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

const run = async () => {
  try {
    // database
    const db = client.db("athleticHubDB");
    // collections
    const eventsCollection = db.collection("events");
    const testimonialsCollection = db.collection("testimonials");
    const newsLetterSignupCollection = db.collection("newsLetterSubscriptions");
    const ticketsCollection = db.collection("tickets");

    // jwt generate
    app.post("/api/v1/jwt", (req, res) => {
      try {
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
            secure: process.env.NODE_ENV === "production", // true on Vercel
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          })
          .send({ message: "JWT generated successfully" });
      } catch (error) {
        console.error("JWT generation failed:", error.message);
        res.status(500).send({ error: "JWT creation failed" });
      }
    });

    // clear cookie
    app.get("/api/v1/clear-cookie", (req, res) => {
      try {
        res
          .clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          })
          .send({ message: "Cookie cleared successfully" });
      } catch (error) {
        console.error("Clear Cookie Error:", error.message);
        res
          .status(500)
          .send({ error: "Something happened while Clear cookie" });
      }
    });

    // create event
    app.post("/api/v1/createEvent", verifyJWT, async (req, res) => {
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

        newEvent.createdAt = new Date().toISOString();
        const result = await eventsCollection.insertOne(newEvent);
        if (!result) {
          return res.status(400).send({ message: "Something went wrong" });
        }
        const subscribersCollection = await newsLetterSignupCollection
          .find()
          .toArray();

        const subscribersEmail = subscribersCollection.map(
          (user) => user.email
        );

        res.status(201).json({
          message: "Event created successfully",
          insertedId: result.insertedId,
        });

        if (result && subscribersCollection) {
          await sendEventCreationEmail(subscribersEmail, newEvent);
        }
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

    app.patch(
      "/api/v1/update-eventParticipants/:id",
      verifyJWT,
      async (req, res) => {
        try {
          const email = req.query?.email;
          const eventId = req.params?.id;

          if (!eventId || !email) {
            return res
              .status(400)
              .json({ message: "Event ID or user email is missing!" });
          }

          // Add participant to event
          const filter = { _id: new ObjectId(eventId) };
          const update = { $addToSet: { participants: email } };

          const result = await eventsCollection.updateOne(filter, update);

          if (!result.modifiedCount) {
            return res.status(400).json({
              message: "User was already a participant or event not found.",
            });
          }

          // Check if ticket already exists
          const ticketExists = await ticketsCollection.findOne({
            eventId: new ObjectId(eventId),
            email,
          });

          if (ticketExists) {
            return res.status(200).json({
              message: "Booking successful (ticket already exists).",
              ticket: ticketExists,
            });
          }

          // Create unique ticket ID
          const ticketId = `TCK-${Date.now()}-${Math.floor(
            Math.random() * 1000
          )}`;

          // Generate QR Code
          const qrPayload = { ticketId, eventId, email };
          const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));

          // Save ticket
          const ticket = {
            eventId: new ObjectId(eventId),
            email,
            ticketId,
            qrCode,
            status: "valid",
            createdAt: new Date().toISOString(),
          };

          await ticketsCollection.insertOne(ticket);

          // Final response
          return res.status(201).json({
            message: "Booking successful & ticket generated!",
            result,
            ticket,
          });
        } catch (error) {
          console.error("Error booking event:", error.message);
          return res.status(500).json({
            message: "An error occurred while booking the event.",
            error: error.message,
          });
        }
      }
    );

    // get ticket by eventId and email
    app.get("/api/v1/tickets/:eventId", verifyJWT, async (req, res) => {
      try {
        const { eventId } = req.params;
        const email = req.query.email;

        if (!eventId || !email) {
          return res.status(400).json({ message: "Missing eventId or email" });
        }

        const ticket = await ticketsCollection.findOne({
          eventId: new ObjectId(eventId),
          email,
        });

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        res.status(200).json(ticket);
      } catch (error) {
        console.error("Error fetching ticket:", error.message);
        res.status(500).json({ message: "Failed to fetch ticket" });
      }
    });

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

        if (!result.modifiedCount) {
          return res.status(400).json({
            error: "Booking not canceled",
          });
        }

        // Delete ticket for this event & user
        const ticketResult = await ticketsCollection.deleteOne({
          eventId: new ObjectId(id),
          email,
        });

        if (!ticketResult.deletedCount) {
          return res.status(200).json({
            message: "Booking canceled, but no ticket was found to delete.",
            result,
          });
        }

        return res.status(200).json({
          message: "Booking and ticket canceled successfully",
          result,
          ticketResult,
        });
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

    // subscribe newsletter
    app.post("/api/v1/subscribe/newsletter", async (req, res) => {
      try {
        const { name, email } = req.body;
        if (!name || !email) {
          return res.status(403).send({ message: "credentials not found" });
        }

        const exists = await newsLetterSignupCollection.findOne({ email });

        if (exists) {
          return res.status(400).send({ message: "User already exists" });
        } else {
          const result = await newsLetterSignupCollection.insertOne({
            name,
            email,
          });

          if (!result) {
            return res.status(401).send({ message: "Server error" });
          }
          res.status(200).send(result);
        }
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

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running locally on port ${port}`);
  });
}

module.exports = app;
