const { createEventEmailTemplate } = require("../utils/emailTemplates");
const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use App Password for Gmail
  },
});

// send email
const sendEventCreationEmail = async (subscribers, event) => {
  try {
    const htmlContent = createEventEmailTemplate(event);

    const mailOptions = {
      from: `AthleticHub <${process.env.EMAIL_USER}>`,
      to: subscribers, // Array of subscriber emails
      subject: `🎯 New ${event.category} Event: ${event.name}`,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error("Error sending event emails:", error);
  }
};

module.exports = {
  sendEventCreationEmail,
};
