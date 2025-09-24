const pool = require("../config/db");

// ================== USER MANAGEMENT ==================

// ✅ Create new user (Signup)
exports.createUser = async ({ name, email, phone_number, password_hash }) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone_number, password_hash) 
       VALUES (?, ?, ?, ?)`,
      [name, email.toLowerCase(), phone_number, password_hash]
    );
    return result.insertId;
  } catch (err) {
    throw new Error("Error creating user: " + err.message);
  }
};

// ✅ Find user by email
exports.findByEmail = async (email) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase()]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error finding user: " + err.message);
  }
};

// ✅ Find user by email OR phone (for login flexibility)
exports.findByEmailOrPhone = async (email, phone_number) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? OR phone_number = ? LIMIT 1",
    [email, phone_number]
  );
  return rows[0];
};

// Find user by both email & phone
exports.findByEmailAndPhone = async (email, phone_number) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? AND phone_number = ?",
    [email, phone_number]
  );
  return rows[0]; // return first match or undefined
};

// Find user by email
exports.findByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

// Find user by phone
exports.findByPhone = async (phone_number) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE phone_number = ?", [phone_number]);
  return rows[0];
};


// ✅ Get profile by ID
exports.getUserById = async (id) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone_number, is_active, 
              is_verified, created_at, last_login 
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error fetching user: " + err.message);
  }
};

exports.getUserByIdWithPassword = async (id) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone_number, password_hash, is_active, 
              is_verified, created_at, last_login 
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error fetching user: " + err.message);
  }
};


// ✅ Update user profile
exports.updateUser = async (id, userData) => {
  try {
    if (!Object.keys(userData).length) {
      throw new Error("No fields provided for update");
    }

    const fields = Object.keys(userData).map((key) => `${key} = ?`).join(", ");
    const values = [...Object.values(userData), id];

    const sql = `UPDATE users 
                 SET ${fields}, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating user: " + err.message);
  }
};

// ✅ Update last login timestamp
exports.updateLastLogin = async (id) => {
  try {
    const [result] = await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating last login: " + err.message);
  }
};

// ================== OTP PASSWORD RESET ==================

// ✅ Save OTP for password reset
exports.setPasswordResetOTP = async (email, otp, expiresAt) => {
  try {
    const [result] = await pool.query(
      `UPDATE users 
       SET password_reset_otp = ?, password_reset_expires = ? 
       WHERE email = ?`,
      [otp, expiresAt, email.toLowerCase()]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error setting password reset OTP: " + err.message);
  }
};

exports.setPasswordResetOTPById = async (userId, otp, expiresAt) => {
  try {
    if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
      throw new Error('Invalid userId parameter: userId must be a valid number or string');
    }

    const [result] = await pool.query(
      `UPDATE users 
       SET password_reset_otp = ?, password_reset_expires = ? 
       WHERE id = ?`,
      [otp, expiresAt, userId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error setting password reset OTP: " + err.message);
  }
};

// ✅ Verify OTP
exports.verifyPasswordResetOTP = async (email, otp) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM users 
       WHERE email = ? AND password_reset_otp = ? 
         AND password_reset_expires > NOW() 
       LIMIT 1`,
      [email.toLowerCase(), otp]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error verifying OTP: " + err.message);
  }
};

// ✅ Clear OTP fields after reset
exports.clearPasswordResetOTP = async (email) => {
  try {
    const [result] = await pool.query(
      `UPDATE users 
       SET password_reset_otp = NULL, password_reset_expires = NULL 
       WHERE email = ?`,
      [email.toLowerCase()]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error clearing password reset OTP: " + err.message);
  }
};

// ✅ Update password
exports.updatePassword = async (email, newPasswordHash) => {
  try {
    const [result] = await pool.query(
      `UPDATE users 
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE email = ?`,
      [newPasswordHash, email.toLowerCase()]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating password: " + err.message);
  }
};

exports.updatePasswordById = async (userId, newPasswordHash) => {
  try {
    const [result] = await pool.query(
      `UPDATE users 
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newPasswordHash, userId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating password: " + err.message);
  }
};

// ================== EMAIL VERIFICATION ==================

// ✅ Mark user as verified
exports.markUserAsVerified = async (email) => {
  try {
    const [result] = await pool.query(
      `UPDATE users 
       SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP 
       WHERE email = ?`,
      [email.toLowerCase()]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error marking user as verified: " + err.message);
  }
};

// ================== USER ADDRESSES ==================

// ✅ Add address
exports.addAddress = async (addressData) => {
  try {
    const {
      user_id,
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      is_default,
    } = addressData;

    // Ensure only 1 default address
    if (is_default) {
      await pool.query(
        "UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?",
        [user_id]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO user_addresses 
       (user_id, address_line1, address_line2, city, state, country, pincode, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        address_line1,
        address_line2,
        city,
        state,
        country || "India",
        pincode,
        is_default || false,
      ]
    );

    return result.insertId;
  } catch (err) {
    throw new Error("Error adding address: " + err.message);
  }
};

// ✅ Get all addresses
exports.getAddressesByUserId = async (userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_addresses 
       WHERE user_id = ? 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return rows;
  } catch (err) {
    throw new Error("Error fetching addresses: " + err.message);
  }
};

// ✅ Get address by ID
exports.getAddressById = async (id, userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_addresses 
       WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error fetching address: " + err.message);
  }
};

// ✅ Update address
exports.updateAddress = async (id, userId, addressData) => {
  try {
    if (!Object.keys(addressData).length) {
      throw new Error("No fields provided for update");
    }

    if (addressData.is_default) {
      await pool.query(
        "UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?",
        [userId]
      );
    }

    const fields = Object.keys(addressData)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = [...Object.values(addressData), id, userId];

    const sql = `UPDATE user_addresses 
                 SET ${fields}, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? AND user_id = ?`;
    const [result] = await pool.query(sql, values);
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating address: " + err.message);
  }
};

// ✅ Delete address
exports.deleteAddress = async (id, userId) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM user_addresses WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error deleting address: " + err.message);
  }
};

// ✅ Get default address
exports.getDefaultAddress = async (userId) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM user_addresses WHERE user_id = ? AND is_default = TRUE LIMIT 1",
      [userId]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error fetching default address: " + err.message);
  }
};

// ✅ Set default address
exports.setDefaultAddress = async (id, userId) => {
  try {
    await pool.query(
      "UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?",
      [userId]
    );

    const [result] = await pool.query(
      "UPDATE user_addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error setting default address: " + err.message);
  }
};


// ================== REFRESH TOKEN MANAGEMENT ==================

// ✅ Store or update refresh token
exports.storeRefreshToken = async (userId, refreshToken, expiresAt) => {
  try {
    const [existing] = await pool.query(
      "SELECT id FROM refresh_tokens WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE refresh_tokens SET token = ?, expires_at = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [refreshToken, expiresAt, userId]
      );
    } else {
      await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
        [userId, refreshToken, expiresAt]
      );
    }
    return true;
  } catch (err) {
    throw new Error("Error storing refresh token: " + err.message);
  }
};

// ✅ Verify refresh token
exports.verifyRefreshToken = async (refreshToken) => {
  try {
    const [rows] = await pool.query(
      `SELECT rt.*, u.id AS user_id, u.email, u.is_active 
       FROM refresh_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token = ? AND rt.expires_at > NOW() 
       LIMIT 1`,
      [refreshToken]
    );
    return rows[0] || null;
  } catch (err) {
    throw new Error("Error verifying refresh token: " + err.message);
  }
};

// ✅ Delete refresh token (logout)
exports.deleteRefreshToken = async (userId) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM refresh_tokens WHERE user_id = ?",
      [userId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error deleting refresh token: " + err.message);
  }
};
