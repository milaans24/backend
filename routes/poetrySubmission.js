const router = require("express").Router();
const sendEmail = require("../utils/sendEmail");
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const { v4: uuidv4 } = require("uuid");

// Temporary storage for submissions
const submissions = {};

router.post("/submit-poetry", upload.single("pdf"), async (req, res) => {
  try {
    const { fullName, email, phoneNumber, language } = req.body;

    if (!fullName || !email || !phoneNumber || !language) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Upload the file buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", format: "pdf" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Generate a unique submission ID
    const submissionId = uuidv4();

    // Store submission data temporarily
    submissions[submissionId] = {
      fullName,
      email,
      phoneNumber,
      language,
      pdfUrl: result.secure_url,
    };

    res.status(200).json({ message: "Submission received.", submissionId });
  } catch (error) {
    console.error("Error during file upload:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/payment-verification", async (req, res) => {
  try {
    const { transactionId, submissionId } = req.body;

    if (!transactionId || !submissionId) {
      return res
        .status(400)
        .json({ error: "Transaction ID and Submission ID are required." });
    }

    const submission = submissions[submissionId];

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    const { fullName, email, phoneNumber, language, pdfUrl } = submission;

    // Send confirmation email to the user
    const userTemplate = `<p>Dear ${fullName},  </p>
    <p>Thank you for submitting your entry for our Poetry Competition. We truly appreciate your creativity and the effort you have put into your work. </p> 
      <p>Here are the details of your submission: </p>
      <ul>
       <li>Submission Title: Milaan Poetry Competition </li>
       <li>Submission Date : ${new Date().toDateString()}  </li>
       <li>Submitted By : ${fullName} </li>
      </ul>
      <p>Our team is currently reviewing all submissions. The results will be announced soon on our official Instagram page <a href="https://www.instagram.com/milaanpublications?igsh=MThhcnNoNmp1ZTdidQ==">@milaanpublications</a> </p>
      <p>If you are selected as a winner, we will personally reach out to you via email and the contact number you provided at the time of submission.
 </p>
 <p>Thank you once again for being a part of this creative journey. We wish you the best of luck! </p>
 <p>Warm regards, </p>
 <p>Team Milaan Publication
 </p>
 <p>Email: info.milaanpublication@gmail.com
 </p>`;
    await sendEmail({
      to: email,
      subject: "Thank You for Submitting Your Poetry Entry!",
      html: userTemplate,
    });

    // Send notification email to the admin
    const adminTemplate = `
        <p>Full Name: ${fullName}</p>
        <p>Email: ${email}</p>
        <p>Phone Number: ${phoneNumber}</p>
        <p>Language: ${language}</p>
        <p>PDF: <a href="${pdfUrl}">Download</a></p>
      `;
    await sendEmail({
      to: process.env.EMAIL,
      subject: "New Poetry Submission",
      html: adminTemplate,
    });

    // Optionally, remove the submission from temporary storage
    delete submissions[submissionId];

    res.status(200).json({ message: "Payment verified and emails sent." });
  } catch (error) {
    console.error("Error during payment verification:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
module.exports = router;
