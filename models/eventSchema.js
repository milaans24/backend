const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: String,
  image: String,
  description: String,
  isLive: {
    type: Boolean,
    deafult: false,
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "EventCategory" },
  startDate: Date,
  endDate: Date,
  registrations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRegistration",
    },
  ],
});

module.exports = mongoose.model("Event", EventSchema);
