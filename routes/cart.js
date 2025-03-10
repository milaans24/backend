const router = require("express").Router();
const User = require("../models/user");
const { authenticateToken } = require("./userAuth");

router.put("/add-to-cart", authenticateToken, async (req, res) => {
  try {
    const { bookid, id } = req.headers;

    if (!bookid) {
      return res.status(400).json({ message: "Book ID is required" });
    }

    const userData = await User.findById(id);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fix cart structure if needed
    if (!userData.cart || Array.isArray(userData.cart)) {
      userData.cart = { books: [], address: "" };
    } else if (!userData.cart.books) {
      userData.cart.books = [];
    }

    // Check if book already exists in cart
    const existingCartItem = userData.cart.books.find((item) =>
      item.bookId.equals(bookid)
    );

    if (existingCartItem) {
      existingCartItem.quantity += 1; // Increase quantity if book exists
    } else {
      userData.cart.books.push({ bookId: bookid, quantity: 1 });
    }

    await userData.save();

    return res.json({
      status: "Success",
      message: existingCartItem
        ? "Book quantity updated in cart"
        : "Book added to cart",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

router.put("/update-cart", authenticateToken, async (req, res) => {
  try {
    const { id } = req.headers; // User ID
    const { bookId, quantity } = req.body; // Book ID and new quantity

    if (quantity < 1) {
      return res.status(400).json({
        status: "Error",
        message: "Quantity must be at least 1",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User not found",
      });
    }

    // Find the book in the cart
    const cartItem = user.cart.books.find((item) => item.bookId.equals(bookId));

    if (!cartItem) {
      return res.status(404).json({
        status: "Error",
        message: "Book not found in cart",
      });
    }

    // Update quantity
    cartItem.quantity = quantity;
    await user.save();

    return res.json({
      status: "Success",
      message: "Cart updated successfully",
      cart: user.cart.books,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//get cart of a particular user
router.get("/get-user-cart", authenticateToken, async (req, res) => {
  try {
    const { id } = req.headers;

    // Fetch user and populate cart.books.bookId
    const userData = await User.findById(id).populate({
      path: "cart.books.bookId", // Correct path for population
      model: "books",
    });

    if (!userData) {
      return res.status(404).json({
        status: "Error",
        message: "User not found",
      });
    }

    if (!userData.cart || !userData.cart.books.length) {
      return res.json({
        status: "Success",
        data: [],
        message: "Cart is empty",
      });
    }

    // Reverse books order to show latest first
    const cartBooks = userData.cart.books.reverse();

    return res.json({
      status: "Success",
      data: {
        books: cartBooks,
        address: userData.cart.address, // Include shipping address
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

router.put("/remove-from-cart/:bookid", authenticateToken, async (req, res) => {
  try {
    const { bookid } = req.params;
    const userId = req.headers.id;

    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "Failure", message: "User not found" });
    }

    // Ensure cart exists and has a books array
    if (!user.cart || !Array.isArray(user.cart.books)) {
      return res
        .status(500)
        .json({ status: "Failure", message: "Cart structure is invalid" });
    }

    // Remove the book from the cart's books array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { "cart.books": { bookId: bookid } } }, // Correctly targeting cart.books
      { new: true }
    );

    return res.json({
      status: "Success",
      message: "Book removed from cart",
      cart: updatedUser.cart, // Return updated cart
    });
  } catch (error) {
    console.error("Error removing book from cart:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

module.exports = router;
