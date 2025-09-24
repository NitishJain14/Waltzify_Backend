const express = require("express");
const router = express.Router();
const dealController = require("../controllers/dealController");
// const authenticate = require("../middlewares/authenticate"); // if needed for admin

// Admin
router.post("/", dealController.createDeal);
router.put("/:id", dealController.updateDeal);
router.delete("/:id", dealController.deleteDeal);

// Public
router.get("/", dealController.getDeals);
router.get("/active", dealController.getActiveDeals);
router.get("/:id", dealController.getDealById);

module.exports = router;
