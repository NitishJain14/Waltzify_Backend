const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/db");
const userModel = require("../models/userModel");
const { sendOTPEmail } = require("../utils/email");
require("dotenv").config();

// Generate JWT Access Token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};


// ✅ Signup
exports.signup = async (req, res) => {
  try {
    let { name, email, phone_number, password } = req.body;

    if (!name || !email || !phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required"
      });
    }

    email = email.toLowerCase();

    // 🔹 Single query check
    const existingUser = await userModel.findByEmailOrPhone(email, phone_number);

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
      if (existingUser.phone_number === phone_number) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await userModel.createUser({
      name,
      email,
      phone_number,
      password_hash: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { id: userId, name, email, phone_number },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// Login user
exports.login = async (req, res) => {
  try {
    const { email, phone_number, password } = req.body;
    if ((!email && !phone_number) || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Phone and password required",
      });
    }

    // ✅ Find user by email or phone
    const user = await userModel.findByEmailOrPhone(
      email?.toLowerCase() || phone_number
    );
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // ✅ Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // ✅ Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // ✅ Calculate refresh token expiry (same as in JWT)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // ✅ Store refresh token in DB
    await userModel.storeRefreshToken(user.id, refreshToken, expiresAt);

    // ✅ Update last login timestamp
    await userModel.updateLastLogin(user.id);

    // ✅ Return response
    res.json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      expiresAt, // send expiry back to client for clarity
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        last_login: new Date(), // you just updated it
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ✅ Logout
exports.logout = async (req, res) => {
  try {
    const { id } = req.user;
    await userModel.deleteRefreshToken(id);
    res.json({ success: true, message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

// ✅ Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: "Missing refresh token" });

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ success: false, message: "Invalid refresh token" });

      const storedToken = await userModel.findRefreshToken(decoded.id);
      if (!storedToken || storedToken !== refreshToken) {
        return res.status(403).json({ success: false, message: "Refresh token expired or invalid" });
      }

      const user = await userModel.getUserById(decoded.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const newAccessToken = generateAccessToken(user);
      res.json({ success: true, accessToken: newAccessToken });
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ success: false, message: "Could not refresh token" });
  }
};

// ✅ Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await userModel.findByEmail(email);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await userModel.setPasswordResetOTP(email, otp, expiresAt);

    // Send email
    await sendOTPEmail(email, otp);

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await userModel.verifyPasswordResetOTP(email, otp);
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    res.json({ success: true, message: "OTP verified, proceed to reset password" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ Reset Password using OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password required" });
    }

    const user = await userModel.verifyPasswordResetOTP(email, otp);
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(email, hashedPassword);

    // Clear OTP
    await userModel.clearPasswordResetOTP(email);

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

