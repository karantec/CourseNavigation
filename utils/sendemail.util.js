// utils/sendEmail.js
// ─────────────────────────────────────────────────────────────────────────────
// Thin nodemailer wrapper.  Configure via environment variables:
//
//   EMAIL_HOST     smtp host  (e.g. smtp.gmail.com)
//   EMAIL_PORT     smtp port  (e.g. 587)
//   EMAIL_USER     sender address
//   EMAIL_PASS     sender password / app-password
//   EMAIL_FROM     "Display Name <address>"  (optional, falls back to EMAIL_USER)
//
// ─────────────────────────────────────────────────────────────────────────────

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465, // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a plain OTP verification email.
 *
 * @param {string} to        – recipient address
 * @param {string} otp       – 6-digit code
 * @param {number} expiresIn – minutes until expiry (for display only)
 */
const sendOtpEmail = async (to, otp, expiresIn = 10) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#ef4444;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                Verify your email
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">
                Use the code below to complete your vendor registration.
                It expires in <strong>${expiresIn} minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- OTP Block -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:12px;
                          text-align:center;padding:24px 0;">
                <span style="font-size:42px;font-weight:800;letter-spacing:16px;
                             color:#dc2626;font-family:'Courier New',monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td style="padding:0 40px 36px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
                Never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#d1d5db;font-size:11px;text-align:center;">
                © ${new Date().getFullYear()} Your Marketplace. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from,
    to,
    subject: `${otp} is your verification code`,
    html,
  });
};

module.exports = { sendOtpEmail };
