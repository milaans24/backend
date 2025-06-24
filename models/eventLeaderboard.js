// models/Leaderboard.js

const mongoose = require("mongoose");

const leaderboardEntrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  description: { type: String },
});

const leaderboardSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    entries: [leaderboardEntrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventLeaderboard", leaderboardSchema);
