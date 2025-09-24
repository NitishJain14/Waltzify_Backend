const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/bannerController");
const uploadBanner = require("../middlewares/uploadBanner");
const authenticate = require("../middlewares/authenticate");

// ✅ Create banner
router.post("/", uploadBanner.single("banner_image"), bannerController.createBanner);

// ✅ Get all banners
router.get("/", bannerController.getBanners);

// ✅ Get single banner
router.get("/:id", bannerController.getBannerById);

// ✅ Update banner
router.put("/:id", uploadBanner.single("banner_image"), bannerController.updateBanner);

// ✅ Delete banner
router.delete("/:id", bannerController.deleteBanner);

module.exports = router;
