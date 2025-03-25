const router = require("express").Router();
const nodemailer = require("nodemailer");

router.post("/send-email", async (req, res) => {
  const { name, email, mobile, aboutBook, package } = req.body;

  if (!name || !email || !mobile || !aboutBook || !package) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Validate email format
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Validate mobile number (should be exactly 10 digits)
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Mobile number must be 10 digits" });
  }

  try {
    // Nodemailer transport setup
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    // Email content
    let mailOptions = {
      from: email,
      to: process.env.EMAIL, // Change this to the recipient email
      subject: "New Package Inquiry",
      html: `
          <h2>New Package Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mobile:</strong> ${mobile}</p>
          <p><strong>About the Book:</strong> ${aboutBook}</p>
          <p><strong>Selected Package:</strong> ${package}</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({
      success: "Thank you for your inquiry! Our team will contact you soon.",
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Failed to send your inquiry. Please try again later." });
  }
});

module.exports = router;
