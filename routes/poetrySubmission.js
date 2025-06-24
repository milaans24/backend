const router = require("express").Router();
const sendEmail = require("../utils/sendEmail");
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const { v4: uuidv4 } = require("uuid");

// Temporary storage for submissions
const submissions = {};
const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_CALLBACK_URL,
} = process.env;

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

router.post(
  "/payment-verification",
  upload.single("screenshot"),
  async (req, res) => {
    try {
      const { transactionId, submissionId } = req.body;

      if (!submissionId) {
        return res.status(400).json({ error: "Submission ID is required." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Screenshot is required." });
      }

      const submission = submissions[submissionId];
      if (!submission) {
        return res.status(404).json({ error: "Submission not found." });
      }

      // Upload screenshot to Cloudinary
      const screenshotResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "poetry-payment-screenshots",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      const { fullName, email, phoneNumber, language, pdfUrl } = submission;

      // Email to user
      const userTemplate = `<p>Dear ${fullName},</p>
      <p>Thank you for submitting your entry for our Poetry Competition. Here are the details:</p>
      <ul>
        <li>Submission Title: Milaan Poetry Competition</li>
        <li>Submission Date: ${new Date().toDateString()}</li>
        <li>Submitted By: ${fullName}</li>
      </ul>
      <p>We have received your payment screenshot. Our team will verify and update you shortly.</p>
      <p>Follow us on Instagram: <a href="https://www.instagram.com/milaanpublications">@milaanpublications</a></p>
      <p>Warm regards, <br/>Team Milaan Publication</p>`;

      await sendEmail({
        to: email,
        subject: "Thank You for Submitting Your Poetry Entry!",
        html: userTemplate,
      });

      // Email to admin
      const adminTemplate = `
      <p><strong>New Poetry Submission</strong></p>
      <p>Full Name: ${fullName}</p>
      <p>Email: ${email}</p>
      <p>Phone Number: ${phoneNumber}</p>
      <p>Language: ${language}</p>
      <p>PDF: <a href="${pdfUrl}">Download</a></p>
      ${
        transactionId
          ? `<p>Transaction ID: ${transactionId}</p>`
          : "<p>Transaction ID: <i>Not provided</i></p>"
      }
      <p>Screenshot: <a href="${
        screenshotResult.secure_url
      }" target="_blank">View Screenshot</a></p>
    `;

      await sendEmail({
        to: process.env.EMAIL,
        subject: "New Poetry Submission",
        html: adminTemplate,
      });

      delete submissions[submissionId];

      res.status(200).json({ message: "Payment verified and emails sent." });
    } catch (error) {
      console.error("Error during payment verification:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

router.post("/initiate-payment", async (req, res) => {
  try {
    const { amount, submissionId, userPhone, userEmail } = req.body;

    const merchantTransactionId = "TXN" + Date.now(); // unique transaction ID
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: submissionId,
      amount: amount * 100, // in paise
      redirectUrl: PHONEPE_CALLBACK_URL,
      redirectMode: "POST",
      mobileNumber: userPhone,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      "base64"
    );
    const dataToHash = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY;
    const checksum =
      crypto.createHash("sha256").update(dataToHash).digest("hex") +
      "###" +
      PHONEPE_SALT_INDEX;

    const response = await axiosInstance.post(
      "https://api.phonepe.com/apis/hermes/pg/v1/pay",
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );

    const paymentUrl = response.data.data.instrumentResponse.redirectInfo.url;
    res.status(200).json({ paymentUrl });
  } catch (error) {
    console.error("PhonePe Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initiate payment." });
  }
});

module.exports = router;
