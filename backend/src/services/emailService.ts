import nodemailer from "nodemailer";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS EXISTS:", !!process.env.EMAIL_PASS);
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email configuration missing. EMAIL_USER and EMAIL_PASS must be set.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;
  console.log("RESET LINK:", resetLink);
  
  const transporter = getTransporter();

  // Verify transport connection
  await transporter.verify();
  console.log("SMTP READY");

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">THE GATE HUB</h1>
            <h2 style="color: #666; font-weight: normal;">Password Reset Request</h2>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Hello,
            </p>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              You requested to reset your password for your THE GATE HUB account. Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>
          </div>
          
          <div style="color: #666; font-size: 12px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="margin-bottom: 10px;">
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="margin-bottom: 10px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            <p>
              © 2024 Learnova. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });
    
    console.log("EMAIL SENT:", info);
  } catch (error) {
    console.error("EMAIL ERROR FULL:", error);
    throw error;
  }
}
