const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const uploadCategoryImage = require("../middlewares/uploadCategoryImage");

// ✅ Routes
router.post("/", uploadCategoryImage, categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", uploadCategoryImage, categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
// Restore soft-deleted category
router.put("/:id/restore", categoryController.restoreCategory);
// List all soft-deleted categories (Trash)
router.get("/deleted", categoryController.getDeletedCategories);

module.exports = router;
