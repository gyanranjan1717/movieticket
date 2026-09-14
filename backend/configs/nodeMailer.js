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
  let recipient = to;
  let emailSubject = subject;
  let htmlContent = body;

  // Support object parameter style { to, subject, html/body }
  if (typeof to === "object" && to !== null) {
    recipient = to.to || to.email;
    emailSubject = to.subject || subject;
    htmlContent = to.html || to.body || body;
  }

  if (!recipient || typeof recipient !== "string" || recipient.trim() === "") {
    throw new Error("Recipient email address is missing or invalid.");
  }

  const transporter = getTransporter();
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || "noreply@showtime.com";

  // Clean plain-text version for MIME multipart/alternative (drastically reduces spam score in Gmail)
  const plainText = htmlContent
    ? htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : emailSubject;

  console.log(`[NodeMailer] Sending email to: ${recipient} | Subject: "${emailSubject}"`);

  const response = await transporter.sendMail({
    from: `"ShowTime" <${senderEmail}>`,
    replyTo: senderEmail,
    to: recipient,
    subject: emailSubject || "Notification from ShowTime",
    text: plainText,
    html: htmlContent || "",
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      "Importance": "High",
    },
  });

  return response;
};

export default sendEmail;

