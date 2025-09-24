const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const authenticate = require("../middlewares/authenticate");
// const isAdmin = require("../middlewares/isAdmin");

// ---------------------
// Admin Routes
// ---------------------
router.post("/", couponController.createCoupon);
router.get("/", couponController.getCoupons);
router.get("/:id", couponController.getCouponById);
router.put("/:id", couponController.updateCoupon);
router.delete("/:id", couponController.deleteCoupon);
router.patch("/:id/restore", couponController.restoreCoupon);
router.get("/inactive", couponController.getNotActiveCoupons);


// ---------------------
// User Route
// ---------------------
router.post("/apply", authenticate, couponController.applyCoupon);

// Get coupons for a product
router.get("/product/:productId", couponController.getCouponsForProduct);

// Get coupons for a category
router.get("/category/:categoryId", couponController.getCouponsForCategory);


module.exports = router;
