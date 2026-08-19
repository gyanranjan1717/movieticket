import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const createTransporter = () => {
  const isGmail = process.env.SMTP_HOST?.includes("gmail") || (!process.env.SMTP_HOST && process.env.SMTP_USER?.includes("@gmail.com"));

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s+/g, ""), // strip any whitespace in app password
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async (to, subject, body) => {
  if (!to || typeof to !== "string" || to.trim() === "") {
    throw new Error("Recipient email address is missing or invalid.");
  }

  const transporter = createTransporter();
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || "noreply@showtime.com";

  console.log(`Sending email to: ${to} from: ${senderEmail}`);

  const response = await transporter.sendMail({
    from: `"ShowTime Tickets" <${senderEmail}>`,
    to,
    subject,
    html: body,
  });

  return response;
};

export default sendEmail;

