const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { uploadProductMedia } = require("../middlewares/uploadProductMedia");

// ================== USER ROUTES ==================

// ✅ Get all active products with filters & pagination
router.get("/filter", productController.getFilteredProducts);

// ⭐ FIX: Move specific routes like /search and /all ABOVE /:id 
router.get('/search', productController.searchProducts);

router.get("/all", productController.getAllProductsFull);

// ✅ Get single product by ID
// ⚠️ Keep this **LAST** among GET requests to avoid conflicts
router.get("/:id", productController.getProductById);


// ================== ADMIN ROUTES ==================
// (TODO: Add admin auth middleware like `authMiddleware.isAdmin`)

// ✅ Create product with variants + media
router.post("/", uploadProductMedia, productController.createProduct);

// ✅ Update product
router.put("/:id", uploadProductMedia, productController.updateProduct);

// ✅ Delete product
router.delete("/:id", productController.deleteProduct);


// ✅ Delete specific media file
// 👆 Should come BEFORE `/:id` to avoid being caught as productId
router.delete("/media/:id", productController.deleteMedia);

router.get("/media/:id", productController.getProductMediaByProductId);


// ================== VARIANT ROUTES ==================

// ✅ Create a variant for a product
router.post("/:productId/variant", productController.createVariant);

// ✅ Update a variant
router.put("/variant/:id", productController.updateVariant);

// ✅ Delete a variant
router.delete("/variant/:id", productController.deleteVariant);

module.exports = router;
