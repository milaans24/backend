const router = require("express").Router();
const Book = require("../models/book");
const { authenticateToken } = require("./userAuth");
const User = require("../models/user");

//create book -- admin
router.post("/add-book", async (req, res) => {
  try {
    const book = new Book({
      url: req.body.url,
      title: req.body.title,
      author: req.body.author,
      price: req.body.price,
      desc: req.body.desc,
      language: req.body.language,
      category: req.body.category,
    });
    await book.save();
    return res.json({
      status: "Success",
      message: "Book added successfully!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//update book --admin
router.put("/update-book", authenticateToken, async (req, res) => {
  try {
    const { bookid } = req.headers;
    await Book.findByIdAndUpdate(bookid, {
      url: req.body.url,
      title: req.body.title,
      author: req.body.author,
      price: req.body.price,
      desc: req.body.desc,
      language: req.body.language,
    });

    return res.json({
      status: "Success",
      message: "Book Updated successfully!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//delete book --admin
router.delete("/delete-book", authenticateToken, async (req, res) => {
  try {
    const { bookid } = req.headers;
    await Book.findByIdAndDelete(bookid);
    return res.json({
      status: "Success",
      message: "Book deleted successfully!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//get all books
router.get("/get-all-books", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    return res.json({
      status: "Success",
      data: books,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//get recently added books
router.get("/get-recent-books", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 }).limit(4);
    return res.json({
      status: "Success",
      data: books,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//get book by id
router.get("/get-book-by-id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    return res.json({
      status: "Success",
      data: book,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

//seach book functionality
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q.toLowerCase(); // Convert query to lowercase
    const books = await Book.find({ title: { $regex: query, $options: "i" } }); // Case-insensitive search
    res.json({ data: books });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/books-by-category/:category", async (req, res) => {
  const category = req.params.category.toLowerCase(); // Convert category to lowercase

  try {
    const books = await Book.find({ category });
    res.json({ data: books });
  } catch (err) {
    console.error("Error fetching books by category:", err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
