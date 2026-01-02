import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendWelcomeEmail = async (email, name, businessName) => {
  try {
    await transporter.sendMail({
      from: `"FinSathi Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to FinSathi 💚",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <h2 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">
            Welcome to <span style="background-color: #FDE047; color: #000; padding: 0 4px;">FinSathi</span>, ${name}!
          </h2>

          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            We're thrilled to have <strong>${businessName}</strong> with us 🚀
          </p>

          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            Start managing your billing and inventory smarter with <span style="background-color: #FDE047; color: #000; padding: 0 4px;">FinSathi</span>.
          </p>

          <a href="https://finsathi.com/login" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; margin-bottom: 40px;">
            Login Now
          </a>

          <div style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
            © 2025 <span style="background-color: #FDE047; color: #000; padding: 0 2px;">FinSathi</span>. Your business. Your growth. Your <span style="background-color: #FDE047; color: #000; padding: 0 2px;">FinSathi</span>.
          </div>

        </div>
      `,
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};
