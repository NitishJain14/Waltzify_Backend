const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const Product = require("../models/productModel");
const { cleanupUploadedFiles } = require("../middlewares/uploadProductMedia");
const slugify = require("../utils/slugify");

// Helper: safely delete folder recursively
const deleteFolder = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
};

// ================== ADMIN ==================

// ✅ Create product with variants & media
// CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      short_description,
      brand,
      category_id,
      is_new_arrival,
      is_on_sale,
      is_featured,
      is_free_shipping,
      variants,
      youtube_videos
    } = req.body;

    // Convert is_free_shipping to number
    const productFreeShipping = is_free_shipping != null
      ? (is_free_shipping === "1" || is_free_shipping === "true" ? 1 : 0)
      : 0;

    if (!name || name.trim().length < 3) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ message: "Product name is required (min 3 chars)" });
    }
    if (!brand || brand.trim().length < 2) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ message: "Brand is required (min 2 chars)" });
    }

    // Parse variants if sent as JSON
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;
        if (!Array.isArray(parsedVariants)) parsedVariants = [];
      } catch (err) {
        parsedVariants = [];
      }
    }

    // Ensure variant free shipping is 0 or 1
    parsedVariants = parsedVariants.map(v => ({
      ...v,
      is_free_shipping: v.is_free_shipping != null
        ? (v.is_free_shipping === "1" || v.is_free_shipping === "true" ? 1 : 0)
        : 0
    }));

    // Create the product
    const productId = await Product.createProduct({
      name,
      description,
      short_description,
      brand,
      category_id,
      is_new_arrival,
      is_on_sale,
      is_featured,
      is_free_shipping: productFreeShipping
    });

    // Save variants
    for (const v of parsedVariants) {
      try {
        await Product.createVariant({ product_id: productId, ...v });
      } catch (variantErr) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ message: `Variant error: ${variantErr.message}` });
      }
    }

    const folder = slugify(name, { lower: true, strict: true });

    // Save uploaded images
    if (req.files?.images) {
      for (let i = 0; i < req.files.images.length; i++) {
        await Product.addMedia({
          product_id: productId,
          media_type: "image",
          media_url: `/uploads/products/${folder}/${req.files.images[i].filename}`,
          sort_order: i + 1
        });
      }
    }

    // Save uploaded video file
    if (req.files?.video) {
      await Product.addMedia({
        product_id: productId,
        media_type: "video",
        media_url: `/uploads/products/${folder}/${req.files.video[0].filename}`,
        video_source: "upload",
        sort_order: 99
      });
    }

    // Save YouTube videos (URLs)
    if (youtube_videos) {
      let youtubeList = [];
      try {
        youtubeList = typeof youtube_videos === "string" ? JSON.parse(youtube_videos) : youtube_videos;
        if (!Array.isArray(youtubeList)) youtubeList = [];
      } catch (err) {
        youtubeList = [];
      }

      for (let i = 0; i < youtubeList.length; i++) {
        await Product.addMedia({
          product_id: productId,
          media_type: "video",
          media_url: youtubeList[i],
          video_source: "youtube",
          sort_order: 100 + i
        });
      }
    }

    res.status(201).json({ message: "Product created successfully", productId });
  } catch (err) {
    cleanupUploadedFiles(req.files);
    res.status(500).json({ message: "Error creating product", error: err.message });
  }
};

// ✅ Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    let {
      name,
      description,
      short_description,
      brand,
      category_id,
      is_new_arrival,
      is_on_sale,
      is_featured,
      is_free_shipping,
      variants,
      youtube_videos
    } = req.body;

    const product = await Product.getProductById(id);
    if (!product) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Convert boolean fields like in createProduct
    if (is_free_shipping != null) {
      is_free_shipping =
        is_free_shipping === "1" || is_free_shipping === "true" ? 1 : 0;
    }

    // ✅ Build updateFields only with defined values
    const updateFields = {};
    if (name != null) updateFields.name = name;
    if (description != null) updateFields.description = description;
    if (short_description != null) updateFields.short_description = short_description;
    if (brand != null) updateFields.brand = brand;
    if (category_id != null) updateFields.category_id = category_id;
    if (is_new_arrival != null) updateFields.is_new_arrival = is_new_arrival;
    if (is_on_sale != null) updateFields.is_on_sale = is_on_sale;
    if (is_featured != null) updateFields.is_featured = is_featured;
    if (is_free_shipping != null) updateFields.is_free_shipping = is_free_shipping;

    // ✅ Only update if we have something to update
    if (Object.keys(updateFields).length > 0) {
      await Product.updateProduct(id, updateFields);
    }

    // ✅ Variants (same parsing as create)
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants =
          typeof variants === "string" ? JSON.parse(variants) : variants;
        if (!Array.isArray(parsedVariants)) parsedVariants = [];
      } catch (err) {
        parsedVariants = [];
      }
    }

    parsedVariants = parsedVariants.map(v => ({
      ...v,
      is_free_shipping:
        v.is_free_shipping === "1" || v.is_free_shipping === "true"
          ? 1
          : 0
    }));

    for (const v of parsedVariants) {
      if (v.id) {
        await Product.updateVariant(v.id, { ...v });
      } else {
        await Product.createVariant({ product_id: id, ...v });
      }
    }

    // ✅ Media handling (same as before)
    const folder = slugify(name || product.name, { lower: true, strict: true });
    const folderPath = path.join(__dirname, "../uploads/products", folder);

    if ((req.files && (req.files.images || req.files.video)) || youtube_videos) {
      await Product.deleteAllMediaByProductId(id);
      if (fs.existsSync(folderPath)) deleteFolder(folderPath);

      if (req.files?.images) {
        for (let i = 0; i < req.files.images.length; i++) {
          await Product.addMedia({
            product_id: id,
            media_type: "image",
            media_url: `/uploads/products/${folder}/${req.files.images[i].filename}`,
            sort_order: i + 1
          });
        }
      }

      if (req.files?.video) {
        await Product.addMedia({
          product_id: id,
          media_type: "video",
          media_url: `/uploads/products/${folder}/${req.files.video[0].filename}`,
          video_source: "upload",
          sort_order: 99
        });
      }

      if (youtube_videos) {
        let youtubeList = [];
        try {
          youtubeList =
            typeof youtube_videos === "string"
              ? JSON.parse(youtube_videos)
              : youtube_videos;
          if (!Array.isArray(youtubeList)) youtubeList = [];
        } catch (err) {
          youtubeList = [];
        }

        for (let i = 0; i < youtubeList.length; i++) {
          await Product.addMedia({
            product_id: id,
            media_type: "video",
            media_url: youtubeList[i],
            video_source: "youtube",
            sort_order: 100 + i
          });
        }
      }
    }

    res.status(200).json({ message: "Product updated successfully" });
  } catch (err) {
    cleanupUploadedFiles(req.files);
    res
      .status(500)
      .json({ message: "Error updating product", error: err.message });
  }
};



// ✅ Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });

    const product = await Product.getProductById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete physical media folder
    const folder = product.name.toLowerCase().trim().replace(/\s+/g, "-");
    const folderPath = path.join(__dirname, "..", "uploads", "products", folder);
    deleteFolder(folderPath);

    const deleted = await Product.deleteProduct(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product", error: err.message });
  }
};

// ✅ Delete specific media
exports.deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ message: "Invalid media ID" });

    const media = await Product.deleteMedia(id);
    if (!media) return res.status(404).json({ message: "Media not found" });

    const filePath = path.join(__dirname, "..", media.media_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: "Media deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting media", error: err.message });
  }
};

exports.getProductMediaByProductId = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Product.getProductMediaByProductId(id);
    res.json(media);
  } catch (err) {
    res.status(500).json({ message: "Error fetching product media", error: err.message });
  }
}

// ================== USER ==================

// ✅ Get filtered products (search + filter + sort + pagination)
exports.getFilteredProducts = async (req, res) => {
  try {
    const { category, brand, min_price, max_price, sort, search, page = 1, limit = 10 } = req.query;
    if (isNaN(page) || isNaN(limit)) return res.status(400).json({ message: "Page and limit must be numbers" });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.getFilteredProducts({ category, brand, min_price, max_price, sort, search, limit, offset });

    res.json({ page: parseInt(page), limit: parseInt(limit), count: products.length, products });
  } catch (err) {
    res.status(500).json({ message: "Error fetching products", error: err.message });
  }
};

// ✅ Get single product with variants & media
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });

    const product = await Product.getProductById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error fetching product", error: err.message });
  }
};

// ✅ Get all products full details (no filter)
exports.getAllProductsFull = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    if (isNaN(page) || isNaN(limit)) return res.status(400).json({ message: "Page and limit must be numbers" });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.getAllProductsFull({ limit, offset });

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products WHERE is_active = 1`);

    res.json({ page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit), count: products.length, products });
  } catch (err) {
    res.status(500).json({ message: "Error fetching all products", error: err.message });
  }
};

// ✅ Create Variant
exports.createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const variantData = req.body;

    const variantId = await Product.createVariant({ product_id: productId, ...variantData });
    res.status(201).json({ message: "Variant created successfully", variantId });
  } catch (err) {
    res.status(400).json({ message: "Error creating variant", error: err.message });
  }
};

// ✅ Update Variant
exports.updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const updated = await Product.updateVariant(id, fields);
    if (!updated) return res.status(404).json({ message: "Variant not found" });

    res.json({ message: "Variant updated successfully" });
  } catch (err) {
    res.status(400).json({ message: "Error updating variant", error: err.message });
  }
};

// ✅ Delete Variant
exports.deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.deleteVariant(id);
    if (!deleted) return res.status(404).json({ message: "Variant not found" });

    res.json({ message: "Variant deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: "Error deleting variant", error: err.message });
  }
};

// ✅ Get all variants
exports.getAllVariants = async (req, res) => {
  try {
    const variants = await Product.getAllVariants();
    res.json(variants);
  } catch (err) {
    res.status(500).json({ message: "Error fetching variants", error: err.message });
  }
};