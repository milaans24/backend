const router = require("express").Router();
const nodemailer = require("nodemailer");
router.post("/send-email", async (req, res) => {
  const { name, mobile, aboutBook, package } = req.body;

  if (!name || !mobile || !aboutBook || !package) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Validate mobile number (should be exactly 10 digits)
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Mobile number must be 10 digits" });
  }

  try {
    // Nodemailer transport setup
    let transporter = nodemailer.createTransport({
      service: "gmail", // or use SMTP host
      auth: {
        user: process.env.EMAIL, // Your email
        pass: process.env.PASSWORD, // Your email app password (not the actual password)
      },
    });

    // Email content
    let mailOptions = {
      from: process.env.EMAIL,
      to: "ghaiprabhghai@gmail.com", // Change this to the recipient email
      subject: "New Package Inquiry",
      html: `
          <h2>New Package Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Mobile:</strong> ${mobile}</p>
          <p><strong>About the Book:</strong> ${aboutBook}</p>
          <p><strong>Selected Package:</strong> ${package}</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: "Email sent successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

module.exports = router;
