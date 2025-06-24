const router = require("express").Router();
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const { v4: uuidv4 } = require("uuid");
const eventCat = require("../models/eventCat");
const LeaderBoard = require("../models/eventLeaderboard");
const { authenticateToken } = require("./userAuth");

router.post(
  "/create-event-category",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { title, description } = req.body;

      // Validate required fields
      if (!title?.trim() || !description?.trim() || !req.file) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Upload to Cloudinary
      const avatar = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "event-category",
            resource_type: "image",
            public_id: uuidv4(),
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      // Save to MongoDB
      const newCat = new eventCat({
        title,
        description,
        image: avatar.secure_url,
      });

      await newCat.save();

      return res.status(201).json({
        message: "New category added successfully",
        category: newCat,
      });
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/get-event-categories", async (req, res) => {
  try {
    const categories = await eventCat.find();
    //.populate("pastEvents")
    //.populate("liveEvents");

    return res.status(200).json({
      message: "Event categories fetched successfully",
      categories,
    });
  } catch (error) {
    console.error("Error fetching event categories:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/update-event-category/:id",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description } = req.body;

      // Find category
      const category = await eventCat.findById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      // If new image uploaded, replace on Cloudinary
      if (req.file) {
        // Optional: delete old image using `public_id` if you store it
        const newImage = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "event-category",
              resource_type: "image",
              public_id: uuidv4(),
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        category.image = newImage.secure_url;
      }

      // Update title & description
      if (title) category.title = title;
      if (description) category.description = description;

      await category.save();

      return res.status(200).json({
        message: "Category updated successfully",
        category,
      });
    } catch (error) {
      console.error("Error updating category:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.delete(
  "/delete-event-category/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const category = await eventCat.findById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      await eventCat.findByIdAndDelete(id);

      return res.status(200).json({
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/getEventsOfCategory/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const category = await eventCat
      .findById(id)
      .populate("upcomingEvents")
      .populate("pastEvents")
      .populate("liveEvents");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ category });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
