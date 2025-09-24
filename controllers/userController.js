const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");

// ✅ Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    console.error("GetProfile error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone_number } = req.body;
    await userModel.updateUser(req.user.id, { name, phone_number }); // fixed
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("UpdateProfile error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Current and new password are required" });
    }

    // ✅ Fetch user
    const user = await userModel.getUserByIdWithPassword(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.password_hash) {
      return res
        .status(500)
        .json({ success: false, message: "Password not set for this user" });
    }

    // ✅ Compare old password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid current password" });
    }

    // ✅ Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // ✅ Update using email or ID
    await userModel.updatePasswordById(user.id, hashed);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("ChangePassword error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Add Address
exports.addAddress = async (req, res) => {
  try {
    const {
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      is_default,
    } = req.body;

    await userModel.addAddress({
      user_id: req.user.id,
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      is_default,
    });

    res.json({ success: true, message: "Address added successfully" });
  } catch (err) {
    console.error("AddAddress error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Get All Addresses
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await userModel.getAddressesByUserId(req.user.id);
    res.json({ success: true, addresses });
  } catch (err) {
    console.error("GetAddresses error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Get Address by ID
exports.getAddressById = async (req, res) => {
  try {
    const address = await userModel.getAddressById(req.params.id, req.user.id);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, address });
  } catch (err) {
    console.error("GetAddressById error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Update Address
exports.updateAddress = async (req, res) => {
  try {
    const updated = await userModel.updateAddress(
      req.params.id,
      req.user.id,
      req.body
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, message: "Address updated successfully" });
  } catch (err) {
    console.error("UpdateAddress error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Delete Address
exports.deleteAddress = async (req, res) => {
  try {
    const deleted = await userModel.deleteAddress(req.params.id, req.user.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, message: "Address deleted successfully" });
  } catch (err) {
    console.error("DeleteAddress error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Set Default Address
exports.setDefaultAddress = async (req, res) => {
  try {
    const updated = await userModel.setDefaultAddress(
      req.params.id,
      req.user.id
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, message: "Default address set successfully" });
  } catch (err) {
    console.error("SetDefaultAddress error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};