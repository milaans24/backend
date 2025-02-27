const mongoose = require("mongoose");

const category = new mongoose.Schema(
  {
    img: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    books: [
      {
        type: mongoose.Types.ObjectId,
        ref: "books",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("category", category);
