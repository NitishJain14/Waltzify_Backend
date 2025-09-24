const dealModel = require("../models/dealModel");

// ✅ Create Deal
exports.createDeal = async (req, res) => {
  try {
    const { product_id, deal_price, start_date, end_date, is_active } = req.body;

    if (!product_id || !deal_price || !start_date || !end_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    if (deal_price <= 0) {
      return res.status(400).json({ error: "Deal price must be greater than 0" });
    }

    const id = await dealModel.createDeal({
      product_id,
      deal_price,
      start_date,
      end_date,
      is_active,
    });

    res.status(201).json({ message: "Deal created successfully", id });
  } catch (err) {
    console.error("Create Deal Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get All Deals
exports.getDeals = async (req, res) => {
  try {
    const deals = await dealModel.getDeals();
    res.json(deals);
  } catch (err) {
    console.error("Get Deals Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get Active Deals
exports.getActiveDeals = async (req, res) => {
  try {
    const deals = await dealModel.getActiveDeals();
    res.json(deals);
  } catch (err) {
    console.error("Get Active Deals Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get Deal By ID
exports.getDealById = async (req, res) => {
  try {
    const deal = await dealModel.getDealById(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }
    res.json(deal);
  } catch (err) {
    console.error("Get Deal Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Update Deal
exports.updateDeal = async (req, res) => {
  try {
    const { product_id, deal_price, start_date, end_date, is_active } = req.body;

    if (!product_id || !deal_price || !start_date || !end_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updated = await dealModel.updateDeal(req.params.id, {
      product_id,
      deal_price,
      start_date,
      end_date,
      is_active,
    });

    if (!updated) {
      return res.status(404).json({ error: "Deal not found" });
    }

    res.json({ message: "Deal updated successfully" });
  } catch (err) {
    console.error("Update Deal Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Delete Deal
exports.deleteDeal = async (req, res) => {
  try {
    const deleted = await dealModel.deleteDeal(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Deal not found" });
    }
    res.json({ message: "Deal deleted successfully" });
  } catch (err) {
    console.error("Delete Deal Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
