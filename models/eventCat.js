const mongoose = require("mongoose");

const eventCategory = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Category title is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String, // URL to the category image (e.g., Cloudinary)
      required: true,
    },
    upcomingEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    pastEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    liveEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventCategory", eventCategory);
