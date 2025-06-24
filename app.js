const express = require("express");
const app = express();
const cors = require("cors");
const user = require("./routes/user");
const book = require("./routes/book");
const cart = require("./routes/cart");
const fav = require("./routes/favourite");
const order = require("./routes/order");
const cat = require("./routes/category");
const emailHelper = require("./routes/email");
const contactUs = require("./routes/contactUs");
const poetryRoutes = require("./routes/poetrySubmission");
const eventCatRoutes = require("./routes/eventCategory");
const eventRoutes = require("./routes/event");
require("dotenv").config();

const PORT = process.env.PORT || 1000;
app.use(
  cors({
    origin: ["https://milaanpublication.in", "http://localhost:5173"], // Allow only your frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies if needed
  })
);
app.use(express.json());

//Connection
require("./conn/conn");

//Calling Routes
app.use("/api/v1", user);
app.use("/api/v1", book);
app.use("/api/v1", cart);
app.use("/api/v1", fav);
app.use("/api/v1", order);
app.use("/api/v1", cat);
app.use("/api", emailHelper);
app.use("/api/v1", contactUs);
app.use("/api/v1", poetryRoutes);
app.use("/api/v1", eventCatRoutes);
app.use("/api/v1", eventRoutes);

//SERVER
app.listen(PORT, () => {
  console.log(`Server Started at PORT : ${PORT} `);
});
