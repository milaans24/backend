const router = require("express").Router();
const User = require("../models/user");
const { authenticateToken } = require("./userAuth");
const Order = require("../models/order");
const sendEmail = require("../utils/sendEmail");

// Place Order
router.post("/place-order", authenticateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const { order, address, total, mobileNumber } = req.body;

    if (!address.trim()) {
      return res.status(400).json({
        status: "Failed",
        message: "Address is required to place an order",
      });
    }
    if (mobileNumber.trim().length < 10 || mobileNumber.trim().length > 10) {
      return res.status(400).json({
        status: "Failed",
        message: "Please enter a valid mobile number",
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
      mobileNumber,
      total,
    });

    const savedOrder = await newOrder.save();

    // Add order ID to the user's order history
    await User.findByIdAndUpdate(id, {
      $push: { orders: savedOrder._id },
      //$set: { cart: { books: [], address: "" } }, // Reset cart properly
    });

    return res.json({
      orderId: savedOrder._id,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

router.get(
  "/get-order-details/:orderId",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { id } = req.headers;

      // Fetch order and verify user ownership
      const order = await Order.findById(orderId)
        .populate("user")
        .populate("books.book");
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.user._id.toString() !== id) {
        return res.status(403).json({ message: "Unauthorized access" });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get order history of a particular user
router.get("/get-order-history", authenticateToken, async (req, res) => {
  try {
    const { id } = req.headers;

    const orders = await Order.find({ user: id, manualPayment: true })
      .populate("books.book")
      .exec();

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

router.put(
  "/manualPaymentDoneByUser/:orderId",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { transactionId } = req.body;
      const userId = req.headers.id; // Extract user ID from auth middleware

      if (!transactionId) {
        return res.status(400).json({ error: "Transaction ID is required" });
      }

      // Find the order and populate book details
      const order = await Order.findById(orderId)
        .populate("books.book", "title") // Populate book details but fetch only the title
        .exec();

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if the user is the owner of the order
      if (order.user.toString() !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to modify this order" });
      }

      // Update order status and set transaction ID
      order.orderStatus = "In progress";
      order.paymentStatus = "In progress";
      order.manualPayment = true;
      order.transactionId = transactionId;
      await order.save();

      // Empty user's cart
      await User.findByIdAndUpdate(userId, {
        $set: { cart: { books: [], address: "" } },
      });

      // Fetch user details
      const getUser = await User.findById(userId);

      // 📨 User Email Template
      const emailTemplateUser = `
      <p>Dear Buyer,</p>
      <p>Your pre-order has been successfully accepted. </p>
      <p>You will recieve a conirmation email shortly with details about the dispatch date and time of your book. </p>
      <p>If you have any questions, feel free to contact us.</p>
      <p><strong>Transaction ID:</strong> ${transactionId}</p>
      <p><strong>Total Amount:</strong> ₹${order.total}</p>
      <p>Best regards, </p>
      <p>Milaan Publication Team</p>
      `;
      await sendEmail({
        to: getUser.email,
        subject: "Your Order Has Accepted",
        html: emailTemplateUser,
      });

      // 📝 Format books for Admin Email
      const booksDetails = order.books
        .map(
          (item) => `<li>${item.book.title} - Quantity : ${item.quantity}</li>`
        )
        .join("");

      // 📨 Admin Email Template
      const emailTemplateAdmin = `
        <h2>New Order Received</h2>
        <p>A new order has been placed.</p>
        <ul>${booksDetails}</ul>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Total Amount:</strong> ₹${order.total}</p>
        <p><strong>Address:</strong> ${order.address}</p>
      `;
      await sendEmail({
        to: process.env.EMAIL,
        subject: "New Order Arrived",
        html: emailTemplateAdmin,
      });

      return res.status(200).json({
        message: "Success, You will get updates about your order.",
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Update order status (Admin)
router.put("/update-status/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Order.findByIdAndUpdate(id, { orderStatus: req.body.status });

    return res.json({
      status: "Success",
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//update PaymentStatus (Admin)
router.put(
  "/update-payment-status/:id",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    try {
      const order = await Order.findById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      order.paymentStatus = paymentStatus;
      await order.save();

      res.status(200).json({
        success: true,
        message: "Payment status updated successfully",
      });
    } catch (error) {
      console.error("Failed to update payment status:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update payment status" });
    }
  }
);

module.exports = router;
