// utils/notifier.js
module.exports = {
  sendSms: async (phone, message) => {
    console.log(`[SMS to ${phone}] ${message}`);
    // Integrate Twilio here
    return true;
  },
  sendPush: async (token, title, body, data = {}) => {
    console.log(`[PUSH to ${token}] ${title} - ${body}`);
    // Integrate FCM here
    return true;
  },
  sendEmail: async (email, subject, html) => {
    console.log(`[EMAIL to ${email}] ${subject}`);
    // Integrate nodemailer / sendgrid
    return true;
  },
};
