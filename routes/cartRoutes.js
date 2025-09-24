const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authenticate = require("../middlewares/authenticate");

// ✅ Add to cart
router.post("/", authenticate, cartController.addToCart);

// ✅ Get user cart
router.get("/", authenticate, cartController.getCart);

// ✅ Update item quantity
router.put("/", authenticate, cartController.updateCartItem);

// ✅ Remove single item
router.delete("/:cart_item_id", authenticate, cartController.removeCartItem);

// ✅ Clear cart (checkout)
router.delete("/", authenticate, cartController.clearCart);




module.exports = router;
