const pool = require("../config/db");

// ================== VALIDATION HELPERS ==================
const validateProductData = ({ name, brand, description, short_description, is_free_shipping }) => {
  if (!name || typeof name !== "string" || name.trim().length < 3) {
    throw new Error("Product name is required and must be at least 3 characters");
  }
  if (!brand || typeof brand !== "string" || brand.trim().length < 2) {
    throw new Error("Brand is required and must be at least 2 characters");
  }
  if (description && description.length > 2000) {
    throw new Error("Description is too long (max 2000 chars)");
  }
  if (short_description && short_description.length > 500) {
    throw new Error("Short description is too long (max 500 chars)");
  }
  if (is_free_shipping != null && ![0,1,true,false].includes(is_free_shipping)) {
    throw new Error("is_free_shipping must be a boolean (true/false or 0/1)");
  }
};


const validateVariantData = ({ sku, mrp, price, stock, length, width, height, weight, is_free_shipping }) => {
  if (!sku || typeof sku !== "string" || sku.trim().length < 3) {
    throw new Error("SKU is required and must be at least 3 characters");
  }
  if (!mrp || isNaN(mrp) || mrp <= 0) {
    throw new Error("MRP must be a positive number");
  }
  if (!price || isNaN(price) || price <= 0) {
    throw new Error("Price must be a positive number");
  }
  if (price > mrp) {
    throw new Error("Price cannot be greater than MRP");
  }
  if (stock != null && (isNaN(stock) || stock < 0)) {
    throw new Error("Stock must be a non-negative number");
  }
  
  [length, width, height, weight].forEach((val) => {
    if (val != null && (isNaN(val) || val < 0)) {
      throw new Error("Length, width, height, and weight must be non-negative numbers");
    }
  });

  if (is_free_shipping != null && ![0,1,true,false].includes(is_free_shipping)) {
    throw new Error("is_free_shipping must be a boolean (true/false or 0/1)");
  }
};


const validateMediaData = ({ media_type, media_url }) => {
  const allowedTypes = ["image", "video"];
  if (!allowedTypes.includes(media_type)) {
    throw new Error("Invalid media type (allowed: image, video)");
  }
  if (!media_url || typeof media_url !== "string") {
    throw new Error("Media URL is required");
  }
};

// ================== ADMIN QUERIES ==================

// ✅ Create Product
exports.createProduct = async ({ name, description, short_description, brand, category_id, is_new_arrival, is_on_sale, is_featured, is_free_shipping }) => {
  try {
    // Validate including short_description and free shipping
    validateProductData({ name, description, short_description, brand, is_free_shipping });

    const [result] = await pool.query(
      `INSERT INTO products 
        (name, description, short_description, brand, category_id, is_new_arrival, is_on_sale, is_featured, is_free_shipping)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        short_description || null,
        brand,
        category_id || null,
        Number(is_new_arrival) ? 1 : 0,
        Number(is_on_sale) ? 1 : 0,
        Number(is_featured) ? 1 : 0,
        Number(is_free_shipping) ? 1 : 0
      ]
    );

    return result.insertId;
  } catch (err) {
    throw new Error("Error creating product: " + err.message);
  }
};


// ✅ Create Variant
exports.createVariant = async ({ product_id, sku, variant_name, mrp, price, stock, is_default, length, width, height, weight, is_free_shipping }) => {
  try {
    // Validate variant including dimensions and free shipping
    validateVariantData({ sku, mrp, price, stock, length, width, height, weight, is_free_shipping });

    // Ensure product exists
    const [[product]] = await pool.query(`SELECT id FROM products WHERE id = ?`, [product_id]);
    if (!product) throw new Error("Product not found");

    // Ensure SKU is unique
    const [[existing]] = await pool.query(`SELECT id FROM product_variants WHERE sku = ?`, [sku]);
    if (existing) throw new Error("SKU already exists");

    const [result] = await pool.query(
      `INSERT INTO product_variants 
        (product_id, sku, variant_name, mrp, price, stock, is_default, length, width, height, weight, is_free_shipping)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        sku,
        variant_name || null,
        mrp,
        price,
        stock || 0,
        is_default ? 1 : 0,
        length || null,
        width || null,
        height || null,
        weight || null,
        Number(is_free_shipping) ? 1 : 0
      ]
    );

    return result.insertId;
  } catch (err) {
    throw new Error("Error creating variant: " + err.message);
  }
};


// ✅ Add Media
exports.addMedia = async ({ product_id, media_type, media_url, sort_order, video_source }) => {
  try {
    // Validate media_type and URL
    validateMediaData({ media_type, media_url });

    const [[product]] = await pool.query(`SELECT id FROM products WHERE id = ?`, [product_id]);
    if (!product) throw new Error("Product not found");

    // Only videos have video_source
    const videoSrc = media_type === "video" && video_source ? video_source : null;

    const [result] = await pool.query(
      `INSERT INTO product_media (product_id, media_type, media_url, video_source, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [product_id, media_type, media_url, videoSrc, sort_order || 1]
    );

    return result.insertId;
  } catch (err) {
    throw new Error("Error adding media: " + err.message);
  }
};


// ✅ Delete Media
exports.deleteMedia = async (id) => {
  try {
    const [[media]] = await pool.query(`SELECT * FROM product_media WHERE id = ?`, [id]);
    if (!media) return null;

    await pool.query(`DELETE FROM product_media WHERE id = ?`, [id]);

    // media object now includes video_source for cleanup or logging
    return media;
  } catch (err) {
    throw new Error("Error deleting media: " + err.message);
  }
};


// ✅ Delete ALL Media (used for replace on update)
exports.deleteAllMediaByProductId = async (product_id) => {
  try {
    // Deletes all media (images and videos, including video_source) for the product
    await pool.query(`DELETE FROM product_media WHERE product_id = ?`, [product_id]);
    return true;
  } catch (err) {
    throw new Error("Error deleting all media: " + err.message);
  }
};

exports.getProductMediaByProductId = async (product_id) => {
  try {
    const [result] = await pool.query(`SELECT * FROM product_media WHERE product_id = ? ORDER BY sort_order ASC`, [product_id]);
    return result;
  } catch (err) {
    throw new Error("Error fetching product media: " + err.message);
  }
}


// ✅ Update Product
exports.updateProduct = async (id, fields) => {
  try {
    if (!id) throw new Error("Product ID required");
    if (!fields || Object.keys(fields).length === 0) throw new Error("No fields to update");

    // Validate fields that require it
    if (fields.name || fields.brand || fields.description || fields.short_description || fields.is_free_shipping != null) {
      validateProductData(fields);
    }

    const updates = Object.keys(fields).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fields), id];

    const [result] = await pool.query(
      `UPDATE products SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating product: " + err.message);
  }
};


// ✅ Delete Product
exports.deleteProduct = async (id) => {
  try {
    if (!id) throw new Error("Product ID required");

    // Delete all child records first: media (images & videos including video_source) and variants (including dimensions & free shipping)
    await pool.query(`DELETE FROM product_media WHERE product_id = ?`, [id]);
    await pool.query(`DELETE FROM product_variants WHERE product_id = ?`, [id]);

    const [result] = await pool.query(`DELETE FROM products WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error deleting product: " + err.message);
  }
};


// ================== USER QUERIES ==================

// ✅ Get Filtered Products
exports.getFilteredProducts = async ({ category, brand, min_price, max_price, sort, search, limit, offset }) => {
  try {
    let query = `
      SELECT 
        p.*, 
        v.id AS variant_id, v.sku, v.variant_name, v.mrp, v.price, v.stock,
        v.length, v.width, v.height, v.weight, v.is_free_shipping AS variant_free_shipping,
        ROUND(((v.mrp - v.price)/v.mrp)*100, 2) AS discount_percentage,
        m.media_url, m.video_source
      FROM products p
      JOIN product_variants v ON p.id = v.product_id
      LEFT JOIN product_media m ON p.id = m.product_id AND m.sort_order = 1
      WHERE p.is_active = 1
    `;
    const values = [];

    if (category) {
      query += " AND p.category_id = ?";
      values.push(category);
    }
    if (brand) {
      query += " AND p.brand = ?";
      values.push(brand);
    }
    if (min_price) {
      if (isNaN(min_price)) throw new Error("Invalid min_price");
      query += " AND v.price >= ?";
      values.push(min_price);
    }
    if (max_price) {
      if (isNaN(max_price)) throw new Error("Invalid max_price");
      query += " AND v.price <= ?";
      values.push(max_price);
    }
    if (search) {
      query += " AND (p.name LIKE ? OR p.description LIKE ? OR p.short_description LIKE ?)";
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    switch (sort) {
      case "price_asc":
        query += " ORDER BY v.price ASC"; break;
      case "price_desc":
        query += " ORDER BY v.price DESC"; break;
      case "discount_desc":
        query += " ORDER BY discount_percentage DESC"; break;
      case "newest":
      default:
        query += " ORDER BY p.created_at DESC";
    }

    if (limit) {
      query += " LIMIT ?";
      values.push(parseInt(limit));
      if (offset) {
        query += " OFFSET ?";
        values.push(parseInt(offset));
      }
    }

    const [rows] = await pool.query(query, values);
    return rows;
  } catch (err) {
    throw new Error("Error fetching products: " + err.message);
  }
};


// ✅ Get Product by ID
exports.getProductById = async (id) => {
  try {
    if (!id || isNaN(id)) throw new Error("Invalid product ID");

    // Fetch product
    const [[product]] = await pool.query(
      `SELECT * FROM products WHERE id = ? AND is_active = 1`,
      [id]
    );
    if (!product) return null;

    // Fetch variants with dimensions and free shipping
    const [variants] = await pool.query(
      `SELECT 
         id, sku, variant_name, mrp, price, stock, length, width, height, weight, is_default, is_free_shipping AS variant_free_shipping,
         ROUND(((mrp - price)/mrp)*100, 2) AS discount_percentage
       FROM product_variants 
       WHERE product_id = ?`,
      [id]
    );

    // Fetch all media including video_source
    const [media] = await pool.query(
      `SELECT id, product_id, media_type, media_url, video_source, sort_order
       FROM product_media 
       WHERE product_id = ? 
       ORDER BY sort_order ASC`,
      [id]
    );

    return { ...product, variants, media };
  } catch (err) {
    throw new Error("Error fetching product by ID: " + err.message);
  }
};


// ✅ Get All Products Full (with variants & media)
exports.getAllProductsFull = async ({ limit = 10, offset = 0 }) => {
  try {
    const [products] = await pool.query(
      `SELECT * FROM products 
       WHERE is_active = 1 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    if (!products.length) return [];

    const productIds = products.map(p => p.id);

    const [variants] = await pool.query(
      `SELECT 
         id, product_id, sku, variant_name, mrp, price, stock, length, width, height, weight, is_default, is_free_shipping AS variant_free_shipping,
         ROUND(((mrp - price)/mrp)*100, 2) AS discount_percentage
       FROM product_variants
       WHERE product_id IN (?)`,
      [productIds]
    );

    const [media] = await pool.query(
      `SELECT id, product_id, media_type, media_url, video_source, sort_order
       FROM product_media
       WHERE product_id IN (?)
       ORDER BY sort_order ASC`,
      [productIds]
    );

    const variantMap = {};
    for (const v of variants) {
      if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
      variantMap[v.product_id].push(v);
    }

    const mediaMap = {};
    for (const m of media) {
      if (!mediaMap[m.product_id]) mediaMap[m.product_id] = [];
      mediaMap[m.product_id].push(m);
    }

    return products.map(p => ({
      ...p,
      variants: variantMap[p.id] || [],
      media: mediaMap[p.id] || []
    }));
  } catch (err) {
    throw new Error("Error fetching all products: " + err.message);
  }
};

exports.updateVariant = async (id, fields) => {
  try {
    if (!id) throw new Error("Variant ID required");
    if (!fields || Object.keys(fields).length === 0) throw new Error("No fields to update");

    // Validate relevant fields
    const {
      sku, mrp, price, stock,
      length, width, height, weight,
      is_free_shipping
    } = fields;

    if (
      sku !== undefined || mrp !== undefined || price !== undefined || stock !== undefined ||
      length !== undefined || width !== undefined || height !== undefined || weight !== undefined ||
      is_free_shipping !== undefined
    ) {
      validateVariantData(fields);
    }

    const updates = Object.keys(fields).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fields), id];

    const [result] = await pool.query(
      `UPDATE product_variants SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (err) {
    throw new Error("Error updating variant: " + err.message);
  }
};


