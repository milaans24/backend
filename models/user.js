const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    address: [
      {
        type: String,
      },
    ], // User can save multiple addresses

    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/128/3177/3177440.png",
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    favourite: [
      {
        type: mongoose.Types.ObjectId,
        ref: "books",
      },
    ],
    cart: {
      books: [
        {
          bookId: { type: mongoose.Types.ObjectId, ref: "books" },
          quantity: {
            type: Number,
            default: 1,
            min: 1,
          },
        },
      ],
      address: {
        type: String,
      },
    },
    orders: [
      {
        type: mongoose.Types.ObjectId,
        ref: "order",
      },
    ],
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
