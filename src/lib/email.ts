import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.SMTP_FROM || "New Chapter CRM <noreply@example.com>";
  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f1520; color: #fff;">
      <div style="padding: 24px; background: #161d2e; border-radius: 12px; border: 1px solid #1e2738;">
        <h2 style="margin: 0 0 16px; color: #fff;">New Chapter CRM — Password Reset</h2>
        <p style="color: #94a3b8; line-height: 1.6;">You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">If you didn't request this, you can safely ignore this email. The link will expire automatically.</p>
        <hr style="border: none; border-top: 1px solid #1e2738; margin: 20px 0;" />
        <p style="color: #475569; font-size: 12px;">New Chapter Real Estate CRM</p>
      </div>
    </div>
  `;
  await sendEmail(to, "Reset your New Chapter CRM password", html);
}
