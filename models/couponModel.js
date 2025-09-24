const pool = require("../config/db");

// ---------------------
// Coupon CRUD (Admin)
// ---------------------

// ✅ Create Coupon with safe defaults
exports.createCoupon = async (couponData, products = [], categories = []) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO coupons 
      (code, description, discount_type, discount_value, usage_limit, per_user_limit, 
       min_order_amount, start_date, expiry_date, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        couponData.code,
        couponData.description || null,
        couponData.discount_type,
        couponData.discount_value,
        couponData.usage_limit ?? null,
        couponData.per_user_limit ?? 1,
        couponData.min_order_amount ?? null,
        couponData.start_date || new Date(),
        couponData.expiry_date,
        couponData.is_active ?? true,
      ]
    );

    const couponId = result.insertId;

    // Map products
    if (products.length > 0) {
      const prodValues = products.map((p) => [couponId, p]);
      await conn.query(
        `INSERT INTO coupon_products (coupon_id, product_id) VALUES ?`,
        [prodValues]
      );
    }

    // Map categories
    if (categories.length > 0) {
      const catValues = categories.map((c) => [couponId, c]);
      await conn.query(
        `INSERT INTO coupon_categories (coupon_id, category_id) VALUES ?`,
        [catValues]
      );
    }

    await conn.commit();
    return couponId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ✅ Get all coupons
exports.getCoupons = async () => {
  const [rows] = await pool.query(`SELECT * FROM coupons WHERE is_active = TRUE ORDER BY created_at DESC`);
  return rows;
};

// ✅ Get coupon by ID
exports.getCouponById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM coupons WHERE id = ? AND is_active = TRUE`, [id]);
  return rows[0];
};

// ✅ Get coupon by code (active only)
exports.getCouponByCode = async (code) => {
  const [rows] = await pool.query(
    `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE`,
    [code]
  );
  return rows[0];
};

// ✅ Update coupon (partial update)
exports.updateCoupon = async (id, couponData, products = [], categories = []) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fields = [];
    const values = [];

    // Only update fields provided
    if (couponData.code !== undefined) { fields.push("code = ?"); values.push(couponData.code); }
    if (couponData.description !== undefined) { fields.push("description = ?"); values.push(couponData.description); }
    if (couponData.discount_type !== undefined) { fields.push("discount_type = ?"); values.push(couponData.discount_type); }
    if (couponData.discount_value !== undefined) { fields.push("discount_value = ?"); values.push(couponData.discount_value); }
    if (couponData.usage_limit !== undefined) { fields.push("usage_limit = ?"); values.push(couponData.usage_limit); }
    if (couponData.per_user_limit !== undefined) { fields.push("per_user_limit = ?"); values.push(couponData.per_user_limit); }
    if (couponData.min_order_amount !== undefined) { fields.push("min_order_amount = ?"); values.push(couponData.min_order_amount); }
    if (couponData.start_date !== undefined) { fields.push("start_date = ?"); values.push(couponData.start_date); }
    if (couponData.expiry_date !== undefined) { fields.push("expiry_date = ?"); values.push(couponData.expiry_date); }
    if (couponData.is_active !== undefined) { fields.push("is_active = ?"); values.push(couponData.is_active); }

    if (fields.length > 0) {
      values.push(id);
      await conn.query(
        `UPDATE coupons SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    // Reset product/category mappings only if new arrays provided
    if (products.length > 0) {
      await conn.query(`DELETE FROM coupon_products WHERE coupon_id = ?`, [id]);
      const prodValues = products.map((p) => [id, p]);
      await conn.query(
        `INSERT INTO coupon_products (coupon_id, product_id) VALUES ?`,
        [prodValues]
      );
    }

    if (categories.length > 0) {
      await conn.query(`DELETE FROM coupon_categories WHERE coupon_id = ?`, [id]);
      const catValues = categories.map((c) => [id, c]);
      await conn.query(
        `INSERT INTO coupon_categories (coupon_id, category_id) VALUES ?`,
        [catValues]
      );
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ✅ Soft delete (deactivate)
exports.deleteCoupon = async (id) => {
  const [result] = await pool.query(
    `UPDATE coupons SET is_active = FALSE WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
};

// ✅ Restore coupon
exports.restoreCoupon = async (id) => {
  const [result] = await pool.query(
    `UPDATE coupons SET is_active = TRUE WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
};

// ✅ Get all active coupons
exports.getNotActiveCoupons = async () => {
  const [rows] = await pool.query(`SELECT * FROM coupons WHERE is_active = FALSE ORDER BY created_at DESC`);
  return rows;
};

exports.getCouponsForProduct = async (productId) => {
  const [rows] = await pool.query(
    `SELECT c.* 
     FROM coupons c
     LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
     LEFT JOIN coupon_categories cc ON c.id = cc.coupon_id
     LEFT JOIN products p ON p.id = ? 
     WHERE c.is_active = TRUE 
       AND (cp.product_id = ? OR cc.category_id = p.category_id)
       AND c.start_date <= NOW() AND c.expiry_date >= NOW()
     GROUP BY c.id`,
    [productId, productId]
  );

  return rows.map(c => ({
    code: c.code,
    description: c.description,
    discount_type: c.discount_type,
    discount_value: Number(c.discount_value),
  }));
};

exports.getCouponsForCategory = async (categoryId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT c.*
     FROM coupons c
     LEFT JOIN coupon_categories cc ON c.id = cc.coupon_id
     LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
     LEFT JOIN products p ON p.category_id = ?
     WHERE c.is_active = TRUE
       AND (cc.category_id = ? OR cp.product_id = p.id)
       AND c.start_date <= NOW() AND c.expiry_date >= NOW()`,
    [categoryId, categoryId]
  );

  return rows.map(c => ({
    code: c.code,
    description: c.description,
    discount_type: c.discount_type,
    discount_value: Number(c.discount_value),
  }));
};

// ---------------------
// Coupon Usage Tracking
// ---------------------

exports.recordCouponUsage = async (couponId, userId, orderId) => {
  const [result] = await pool.query(
    `INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES (?, ?, ?)`,
    [couponId, userId, orderId]
  );
  return result.insertId;
};

exports.getTotalUsageCount = async (couponId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM coupon_usages WHERE coupon_id = ?`,
    [couponId]
  );
  return rows[0].cnt;
};

exports.getUserUsageCount = async (couponId, userId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM coupon_usages WHERE coupon_id = ? AND user_id = ?`,
    [couponId, userId]
  );
  return rows[0].cnt;
};

// ✅ Product/category restrictions
exports.getCouponProducts = async (couponId) => {
  const [rows] = await pool.query(
    `SELECT product_id FROM coupon_products WHERE coupon_id = ?`,
    [couponId]
  );
  return rows.map((r) => r.product_id);
};

exports.getCouponCategories = async (couponId) => {
  const [rows] = await pool.query(
    `SELECT category_id FROM coupon_categories WHERE coupon_id = ?`,
    [couponId]
  );
  return rows.map((r) => r.category_id);
};


