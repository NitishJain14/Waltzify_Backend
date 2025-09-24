const couponModel = require("../models/couponModel");

// ---------------------
// Admin Controllers
// ---------------------

// ✅ Create Coupon
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      usage_limit,
      per_user_limit,
      min_order_amount,
      start_date,
      expiry_date,
      is_active,
      products,
      categories,
    } = req.body;

    if (!code || !discount_type || !discount_value || !expiry_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (discount_type === "percentage" && discount_value > 100) {
      return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
    }

    const couponId = await couponModel.createCoupon(
      {
        code,
        description,
        discount_type,
        discount_value,
        usage_limit,
        per_user_limit,
        min_order_amount,
        start_date,
        expiry_date,
        is_active,
      },
      products || [],
      categories || []
    );

    res.status(201).json({ message: "Coupon created", id: couponId });
  } catch (err) {
    console.error("Create Coupon Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get All Coupons
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await couponModel.getCoupons();
    res.json(coupons);
  } catch (err) {
    console.error("Get Coupons Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get Coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await couponModel.getCouponById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    console.error("Get Coupon Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Update Coupon
exports.updateCoupon = async (req, res) => {
  try {
    if (req.body.discount_type === "percentage" && req.body.discount_value > 100) {
      return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
    }

    const updated = await couponModel.updateCoupon(
      req.params.id,
      req.body,
      req.body.products || [],
      req.body.categories || []
    );

    if (!updated) return res.status(404).json({ error: "Coupon not found" });
    res.json({ message: "Coupon updated" });
  } catch (err) {
    console.error("Update Coupon Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Soft Delete (Deactivate)
exports.deleteCoupon = async (req, res) => {
  try {
    const deleted = await couponModel.deleteCoupon(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Coupon not found" });
    res.json({ message: "Coupon deactivated" });
  } catch (err) {
    console.error("Delete Coupon Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Restore Coupon
exports.restoreCoupon = async (req, res) => {
  try {
    const restored = await couponModel.restoreCoupon(req.params.id);
    if (!restored) return res.status(404).json({ error: "Coupon not found" });
    res.json({ message: "Coupon restored" });
  } catch (err) {
    console.error("Restore Coupon Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getNotActiveCoupons = async (req, res) => {
  try {
    const coupons = await couponModel.getNotActiveCoupons();
    res.json(coupons);
  } catch (err) {
    console.error("Error fetching inactive coupons:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getCouponsForProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: "Invalid product ID" });

    const productCoupons = await couponModel.getCouponsForProduct(productId);

    res.json(productCoupons);
  } catch (err) {
    console.error("Get Product Coupons Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ---------------------
// Category Coupons with Discount
// ---------------------
exports.getCouponsForCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (!categoryId) return res.status(400).json({ error: "Invalid category ID" });

    const categoryCoupons = await couponModel.getCouponsForCategory(categoryId);

    res.json(categoryCoupons);
  } catch (err) {
    console.error("Get Category Coupons Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// ---------------------
// User Controller (Apply Coupon)
// ---------------------

exports.applyCoupon = async (req, res) => {
  try {
    const { code, userId, orderTotal, cartProducts = [], cartCategories = [] } = req.body;

    if (!code || !userId || !orderTotal) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const coupon = await couponModel.getCouponByCode(code);
    if (!coupon || !coupon.is_active) {
      return res.status(404).json({ error: "Coupon not found or inactive" });
    }

    // ✅ Date check
    const now = new Date();
    if (new Date(coupon.start_date) > now || new Date(coupon.expiry_date) < now) {
      return res.status(400).json({ error: "Coupon expired or not started yet" });
    }

    // ✅ Minimum order check
    if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
      return res.status(400).json({ error: `Minimum order ₹${coupon.min_order_amount} required` });
    }

    // ✅ Usage limits
    const totalUsage = await couponModel.getTotalUsageCount(coupon.id);
    if (coupon.usage_limit && totalUsage >= coupon.usage_limit) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }

    const userUsage = await couponModel.getUserUsageCount(coupon.id, userId);
    if (coupon.per_user_limit && userUsage >= coupon.per_user_limit) {
      return res.status(400).json({ error: "You have already used this coupon" });
    }

    // ✅ Product & Category restrictions (OR condition)
    const allowedProducts = await couponModel.getCouponProducts(coupon.id);
    const allowedCategories = await couponModel.getCouponCategories(coupon.id);

    if (allowedProducts.length > 0 || allowedCategories.length > 0) {
      const productMatch = cartProducts.some((p) => allowedProducts.includes(p));
      const categoryMatch = cartCategories.some((c) => allowedCategories.includes(c));

      if (!productMatch && !categoryMatch) {
        return res.status(400).json({ error: "Coupon not valid for these products/categories" });
      }
    }

    // ✅ Calculate discount safely
    let discount = 0;
    if (coupon.discount_type === "flat") {
      discount = coupon.discount_value;
    } else if (coupon.discount_type === "percentage") {
      discount = (orderTotal * coupon.discount_value) / 100;
    }

    discount = Number(discount.toFixed(2));
    let finalAmount = orderTotal - discount;
    if (finalAmount < 0) finalAmount = 0;

    // (Optional) Record usage only after successful order placement
    await couponModel.recordCouponUsage(coupon.id, userId, orderId);

    res.json({
      message: "Coupon applied successfully",
      coupon: coupon.code,
      discount,
      finalAmount,
    });
  } catch (err) {
    console.error("Apply Coupon Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Safer Approach
// exports.applyCoupon = async (req, res) => {
//   try {
//     const { code, orderTotal, cartProducts = [], cartCategories = [] } = req.body;

//     // ✅ Get user ID from token
//     const userId = req.user?.id;
//     if (!userId) return res.status(401).json({ error: "Unauthorized" });

//     if (!code || !orderTotal) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const coupon = await couponModel.getCouponByCode(code);
//     if (!coupon || !coupon.is_active) {
//       return res.status(404).json({ error: "Coupon not found or inactive" });
//     }

//     // ✅ Date check
//     const now = new Date();
//     if (new Date(coupon.start_date) > now || new Date(coupon.expiry_date) < now) {
//       return res.status(400).json({ error: "Coupon expired or not started yet" });
//     }

//     // ✅ Minimum order check
//     if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
//       return res.status(400).json({ error: `Minimum order ₹${coupon.min_order_amount} required` });
//     }

//     // ✅ Usage limits
//     const totalUsage = await couponModel.getTotalUsageCount(coupon.id);
//     if (coupon.usage_limit && totalUsage >= coupon.usage_limit) {
//       return res.status(400).json({ error: "Coupon usage limit reached" });
//     }

//     const userUsage = await couponModel.getUserUsageCount(coupon.id, userId);
//     if (coupon.per_user_limit && userUsage >= coupon.per_user_limit) {
//       return res.status(400).json({ error: "You have already used this coupon" });
//     }

//     // ✅ Product & Category restrictions (OR condition)
//     const allowedProducts = await couponModel.getCouponProducts(coupon.id);
//     const allowedCategories = await couponModel.getCouponCategories(coupon.id);

//     if (allowedProducts.length > 0 || allowedCategories.length > 0) {
//       const productMatch = cartProducts.some((p) => allowedProducts.includes(p));
//       const categoryMatch = cartCategories.some((c) => allowedCategories.includes(c));

//       if (!productMatch && !categoryMatch) {
//         return res.status(400).json({ error: "Coupon not valid for these products/categories" });
//       }
//     }

//     // ✅ Calculate discount safely
//     let discount = 0;
//     if (coupon.discount_type === "flat") {
//       discount = coupon.discount_value;
//     } else if (coupon.discount_type === "percentage") {
//       discount = (orderTotal * coupon.discount_value) / 100;
//     }

//     discount = Number(discount.toFixed(2));
//     let finalAmount = orderTotal - discount;
//     if (finalAmount < 0) finalAmount = 0;

//     // (Optional) Record usage after order placement
//     await couponModel.recordCouponUsage(coupon.id, userId, orderId);

//     res.json({
//       message: "Coupon applied successfully",
//       coupon: coupon.code,
//       discount,
//       finalAmount,
//     });
//   } catch (err) {
//     console.error("Apply Coupon Error:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

