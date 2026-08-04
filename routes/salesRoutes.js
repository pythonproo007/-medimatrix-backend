const express = require('express');
const router = express.Router();
const { getDashboardStats, getSales, getSaleById, createSale } = require('../controllers/salesController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/dashboard/stats', getDashboardStats);
router.get('/', authMiddleware, getSales);
router.get('/:id', authMiddleware, getSaleById);
router.post('/', authMiddleware, createSale);

module.exports = router;

