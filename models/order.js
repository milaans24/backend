const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    books: [
      {
        book: {
          type: mongoose.Types.ObjectId,
          ref: "books",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    pinCode: {
      type: Number,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      default: "Order not placed",
      enum: [
        "Order not placed",
        "In progress",
        "Order placed",
        "Out for delivery",
        "Delivered",
        "Canceled",
      ],
    },
    manualPayment: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      default: "Not done",
      enum: ["Not done", "In progress", "Failed", "Success"],
    },
    transactionId: {
      type: String,
    },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
