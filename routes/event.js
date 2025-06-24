const router = require("express").Router();
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const { v4: uuidv4 } = require("uuid");
const Event = require("../models/eventSchema");
const EventCat = require("../models/eventCat");
const Leaderboard = require("../models/eventLeaderboard");
const EventRegistrationForm = require("../models/eventRegistrationFormSchema");
const { authenticateToken } = require("./userAuth");

router.post(
  "/create-event",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description, category, startDate, endDate } = req.body;

      // Validate required fields
      if (
        !title?.trim() ||
        !description?.trim() ||
        !category ||
        !startDate ||
        !endDate ||
        !req.file
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const date = new Date();
      const isoString = date.toISOString();
      if (startDate < isoString) {
        return res
          .status(400)
          .json({ message: "Event can be created for the future dates only" });
      }
      if (endDate < startDate) {
        return res
          .status(400)
          .json({ message: "End date must be greater than start date!" });
      }

      // Upload image to Cloudinary
      const uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "event-images",
            public_id: uuidv4(),
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      // Create event document
      const newEvent = new Event({
        title,
        description,
        image: uploadedImage.secure_url,
        category,
        startDate,
        endDate,
      });
      const eventCat = await EventCat.findById(category);
      eventCat.upcomingEvents.push(newEvent._id);
      await newEvent.save();
      await eventCat.save();
      return res.status(201).json({
        message: "Event created successfully",
        event: newEvent,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/getSingleEvent/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    let leaderboardData = null;

    // If the event is not live, fetch the leaderboard
    if (!event.isLive) {
      leaderboardData = await Leaderboard.findOne({ event: id });
    }

    res.status(200).json({
      success: true,
      event,
      leaderboard: leaderboardData,
    });
  } catch (error) {
    console.error("Error fetching event:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET /api/v1/getAllEvents
router.get("/getAllEvents", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

router.put("/updateEvent/:id", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const updatedData = req.body;

    // If user tries to make event live
    if (updatedData.isLive) {
      const form = await EventRegistrationForm.findOne({ event: eventId });

      if (!form || !form.formFields || form.formFields.length === 0) {
        return res.status(400).json({
          error: "Please create registration form",
        });
      }
    }

    // Step 1: Update the event
    const updatedEvent = await Event.findByIdAndUpdate(eventId, updatedData, {
      new: true,
    });

    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Step 2: Get the category from the event
    const categoryId = updatedEvent.category;

    if (!categoryId) {
      return res.status(400).json({ error: "Category not found in event" });
    }

    const category = await EventCat.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Event category not found" });
    }

    // Step 3: Update live/upcoming/past arrays
    const eventObjectId = updatedEvent._id;

    const isLive = updatedData.isLive;

    // Remove from all lists
    category.upcomingEvents = category.upcomingEvents.filter(
      (id) => id.toString() !== eventObjectId.toString()
    );
    category.liveEvents = category.liveEvents.filter(
      (id) => id.toString() !== eventObjectId.toString()
    );
    category.pastEvents = category.pastEvents.filter(
      (id) => id.toString() !== eventObjectId.toString()
    );

    // If live and not ended, add to liveEvents
    if (isLive) {
      category.liveEvents.push(eventObjectId);
    }

    // If ended, add to pastEvents
    if (!isLive) {
      category.pastEvents.push(eventObjectId);
    }

    await category.save();

    res.status(200).json({
      message: "Event updated successfully",
      updatedEvent,
    });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//generate form for the event
router.put(
  "/event-registration-form/:eventId",
  authenticateToken,
  async (req, res) => {
    const { eventId } = req.params;
    const { formFields } = req.body;
    if (!formFields || !Array.isArray(formFields)) {
      return res.status(400).json({ message: "Invalid form fields." });
    }

    try {
      const existingForm = await EventRegistrationForm.findOne({
        event: eventId,
      });
      if (existingForm) {
        existingForm.formFields = formFields;
        await existingForm.save();
        return res.status(200).json({ message: "Form updated successfully" });
      }
      const newForm = new EventRegistrationForm({ event: eventId, formFields });
      await newForm.save();
      res.status(200).json({ message: "Form saved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to save form" });
    }
  }
);

// GET /api/v1/event-registration-form/:eventId
router.get("/event-registration-form/:eventId", async (req, res) => {
  const { eventId } = req.params;

  try {
    const form = await EventRegistrationForm.findOne({ event: eventId });

    if (!form) {
      return res.status(404).json({ message: "Form not found for this event" });
    }

    res.status(200).json({ formFields: form.formFields });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch form fields" });
  }
});

router.post(
  "/event-leaderboard/:eventId",
  authenticateToken,
  async (req, res) => {
    const { eventId } = req.params;
    const { leaderboard } = req.body;

    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if event is ended
      const currentDate = new Date();
      const eventEnded = event.endDate
        ? new Date(event.endDate) <= currentDate
        : false;

      if (!eventEnded) {
        return res
          .status(400)
          .json({ message: "Cannot generate leaderboard before event ends" });
      }

      const newLeaderboard = await Leaderboard.create({
        event: eventId,
        entries: leaderboard,
      });

      res.status(201).json({
        message: "Leaderboard created successfully",
        data: newLeaderboard,
      });
    } catch (error) {
      console.error("Leaderboard creation failed:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

module.exports = router;
