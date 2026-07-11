const twilio = require("twilio");

class SMSService {
  static client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  // Format phone to +91XXXXXXXXXX
  static formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return `+91${cleaned.slice(-10)}`;
  }

  static async sendOTP(phoneNumber, otp) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const message = await this.client.messages.create({
        body: `Dear User, Your OTP is ${otp}. Valid for 3 minutes. Do not share it.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });

      console.log("Twilio Message SID:", message.sid);

      return {
        success: true,
        sid: message.sid,
      };
    } catch (err) {
      console.error("Twilio Error:", err.message);

      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = SMSService;
