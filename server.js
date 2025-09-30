const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// ✅ Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // 🟢 Add categories
const cartRoutes = require("./routes/cartRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const couponRoutes = require("./routes/couponRoutes");
const dealRoutes = require("./routes/dealRoutes");
const errorHandler = require('./middlewares/errorHandler'); // 🟢 Central error handler


// App Init
const app = express();

// Trust proxy (if using reverse proxy like Nginx)
app.set('trust proxy', 1);

// ✅ Security headers
app.use(helmet());

// ✅ CORS (adjust origin as needed)
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ CORP (for images and static resources)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2500, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ Body parser and compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ✅ Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Mount routes
app.use('/api/auth', authRoutes); // Auth API
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes); // User API
app.use('/api/categories', categoryRoutes); // Categories API
app.use('/api/cart', cartRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/deals', dealRoutes);

// ✅ Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running smoothly 🚀' });
});

// ✅ 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// ✅ Global error handler (last middleware)
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
