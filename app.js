const express = require('express');
const cors = require('cors');
const path = require('path');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const customerRoutes = require('./routes/customerRoutes');
const stockRoutes = require('./routes/stockRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const salesRoutes = require('./routes/salesRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const discountRoutes = require('./routes/discountRoutes');

const { getDashboardStats } = require('./controllers/salesController');
const { getStockLogs } = require('./controllers/stockController');
const { updateDeliveryStatus, getHomeDeliveries } = require('./controllers/deliveryController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads directory mapping
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/offers', discountRoutes);

// 2. Legacy / Monolithic Compat routes
app.get('/api/dashboard/stats', getDashboardStats);
app.get('/api/stock-logs', getStockLogs);
app.get('/api/home-deliveries', getHomeDeliveries);
app.put('/api/sales/:id/delivery-status', updateDeliveryStatus);

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
