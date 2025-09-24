const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticate = require("../middlewares/authenticate");

// ==================== USER PROFILE ==================== //

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", authenticate, userController.getProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", authenticate, userController.updateProfile);

// @route   PUT /api/user/change-password
// @desc    Change user password
// @access  Private
router.put("/change-password", authenticate, userController.changePassword);

// ==================== USER ADDRESSES ==================== //

// @route   POST /api/user/addresses
// @desc    Add new address
// @access  Private
router.post("/addresses", authenticate, userController.addAddress);

// @route   GET /api/user/addresses
// @desc    Get all addresses of a user
// @access  Private
router.get("/addresses", authenticate, userController.getAddresses);

// @route   GET /api/user/addresses/:id
// @desc    Get a single address by ID
// @access  Private
router.get("/addresses/:id", authenticate, userController.getAddressById);

// @route   PUT /api/user/addresses/:id
// @desc    Update an address
// @access  Private
router.put("/addresses/:id", authenticate, userController.updateAddress);

// @route   DELETE /api/user/addresses/:id
// @desc    Delete an address
// @access  Private
router.delete("/addresses/:id", authenticate, userController.deleteAddress);

// @route   PUT /api/user/addresses/:id/default
// @desc    Set address as default
// @access  Private
router.put("/addresses/:id/default", authenticate, userController.setDefaultAddress);

module.exports = router;
