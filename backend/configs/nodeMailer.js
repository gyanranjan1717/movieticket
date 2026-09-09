import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const isGmail = process.env.SMTP_HOST?.includes("gmail") || (!process.env.SMTP_HOST && process.env.SMTP_USER?.includes("@gmail.com"));

  if (isGmail) {
    cachedTransporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // use SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s+/g, ""), // strip whitespace in app password
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  return cachedTransporter;
};

const sendEmail = async (to, subject, body) => {
  if (!to || typeof to !== "string" || to.trim() === "") {
    throw new Error("Recipient email address is missing or invalid.");
  }

  const transporter = getTransporter();
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

