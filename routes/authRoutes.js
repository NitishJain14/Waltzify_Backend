const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middlewares/authenticate");

// ==================== AUTH ROUTES ==================== //

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post("/signup", authController.signup);

// @route   POST /api/auth/login
// @desc    Login user and return tokens
// @access  Public
router.post("/login", authController.login);

// @route   POST /api/auth/logout
// @desc    Logout user (delete refresh token)
// @access  Private
router.post("/logout", authenticate, authController.logout);

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token using refresh token
// @access  Public
router.post("/refresh-token", authController.refreshToken);

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post("/forgot-password", authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post("/reset-password", authController.resetPassword);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post("/verify-otp", authController.verifyOtp);

module.exports = router;