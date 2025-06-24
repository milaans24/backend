const mongoose = require("mongoose");

const EventRegistrationFormSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  formFields: [
    {
      label: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true },
      required: { type: Boolean, default: false },
      options: { type: [String], default: [] }, // For dropdown, radio, etc.
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "EventRegistrationForm",
  EventRegistrationFormSchema
);
