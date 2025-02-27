const router = require("express").Router();
const Cat = require("../models/categories");
const { authenticateToken } = require("./userAuth");

// Create category -- admin
router.post("/add-cat", authenticateToken, async (req, res) => {
  try {
    const { addCat } = req.body;
    if (!addCat) {
      return res.status(400).json({ error: "Add category field is required" });
    }

    // Check if the category already exists (case insensitive)
    const existingCat = await Cat.findOne({
      title: { $regex: new RegExp("^" + addCat + "$", "i") },
    });

    if (existingCat) {
      return res
        .status(400)
        .json({ error: "Category with this name already exists" });
    }

    const newCat = new Cat({ title: addCat });
    await newCat.save();
    return res.status(200).json({ success: "Category Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "An error occurred" });
  }
});

// Fetch all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Cat.find({});
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = router;
