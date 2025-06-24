const mongoose = require("mongoose");

const EventRegistrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  formData: {}, // dynamic key-value fields
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("EventRegistration", EventRegistrationSchema);
