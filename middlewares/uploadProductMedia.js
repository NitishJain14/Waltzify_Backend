const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper: slugify product name
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-");        // spaces → dashes
};

// ================== Storage Config ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const name = req.body.name || "product";
      const slug = slugify(name);

      // ✅ single folder for this product
      const folderName = slug;
      req.uploadFolderName = folderName;

      const uploadPath = path.join(__dirname, "../uploads/products", folderName);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (err) {
      cb(new Error("Failed to set upload destination: " + err.message));
    }
  },
  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    } catch (err) {
      cb(new Error("Failed to generate file name: " + err.message));
    }
  }
});

// ================== File Filter ==================
const fileFilter = (req, file, cb) => {
  try {
    const allowedImageTypes = /jpeg|jpg|png|webp/;
    const allowedVideoTypes = /mp4|mkv/;

    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    const mime = file.mimetype.toLowerCase();

    if (
      (allowedImageTypes.test(ext) && mime.startsWith("image/")) ||
      (allowedVideoTypes.test(ext) && mime.startsWith("video/"))
    ) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Invalid file type. Only images (jpg, jpeg, png, webp) and videos (mp4, mkv) are allowed."
      ),
      false
    );
  } catch (err) {
    return cb(new Error("File filter error: " + err.message), false);
  }
};

// ================== Multer Upload ==================
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 6 // 5 images + 1 video
  },
  fileFilter
});

// ================== Cleanup Uploaded Files ==================
exports.cleanupUploadedFiles = (files) => {
  if (!files) return;
  try {
    const allFiles = [
      ...(files["images"] || []),
      ...(files["video"] || [])
    ];

    allFiles.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  } catch (err) {
    console.error("Error cleaning up uploaded files:", err.message);
  }
};

// ================== Export Middleware ==================
exports.uploadProductMedia = (req, res, next) => {
  const uploader = upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 }
  ]);

  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Max 10MB allowed." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Too many files or unexpected field uploaded." });
      }
      return res.status(400).json({ message: "Upload error", error: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    next();
  });
};
