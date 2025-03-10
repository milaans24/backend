const router = require("express").Router();
const User = require("../models/user");
const { authenticateToken } = require("./userAuth");
const Order = require("../models/order");

// Place Order
router.post("/place-order", authenticateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const { order, address } = req.body;

    if (!address.trim()) {
      return res.status(400).json({
        status: "Failed",
        message: "Address is required to place an order",
      });
    }

    if (!order || order.length === 0) {
      return res.status(400).json({
        status: "Failed",
        message: "Cart is empty",
      });
    }

    const formattedOrder = order.map((item) => ({
      book: item.bookId._id,
      quantity: item.quantity,
    }));

    const newOrder = new Order({
      user: id,
      books: formattedOrder,
      address,
    });

    const savedOrder = await newOrder.save();

    // Add order ID to the user's order history
    await User.findByIdAndUpdate(id, {
      $push: { orders: savedOrder._id },
      $set: { cart: { books: [], address: "" } }, // Reset cart properly
    });

    return res.json({
      status: "Success",
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

// Get order history of a particular user
router.get("/get-order-history", authenticateToken, async (req, res) => {
  try {
    const { id } = req.headers;

    const orders = await Order.find({ user: id }).populate("books.book").exec();

    return res.json({
      status: "Success",
      data: orders.reverse(),
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

// Get all orders (Admin)
router.get("/get-all-orders", authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("books.book")
      .populate("user", "username email") // Correct populate call
      .sort({ createdAt: -1 })
      .exec();
    //console.log(orders);
    return res.json({
      status: "Success",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

// Update order status (Admin)
router.put("/update-status/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Order.findByIdAndUpdate(id, { status: req.body.status });

    return res.json({
      status: "Success",
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

module.exports = router;
