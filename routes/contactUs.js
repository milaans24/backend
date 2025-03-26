const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

// Contact Us API
router.post("/contact", async (req, res) => {
  try {
    const { name, mobile, email, message } = req.body;

    if (!name || !mobile || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const subject = "New Contact Form Submission";
    const htmlContent = `
      <h2>Contact Details</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Mobile:</strong> ${mobile}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    `;

    const emailResponse = await sendEmail({
      to: process.env.EMAIL, // Your email to receive contact requests
      subject,
      html: htmlContent,
    });

    if (emailResponse.success) {
      return res
        .status(200)
        .json({
          success: true,
          message: "Your message has been sent successfully!",
        });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
