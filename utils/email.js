const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",  // You can use 'gmail' or SMTP details
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS, // App Password (not your Gmail login)
  },
});

const sendOTPEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"E-Shop" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    html: `<h2>Password Reset Request</h2>
           <p>Your OTP code is: <b>${otp}</b></p>
           <p>This code is valid for <b>10 minutes</b>.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
