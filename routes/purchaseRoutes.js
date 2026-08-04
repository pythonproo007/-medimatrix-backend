const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase, getSuppliers, createSupplier } = require('../controllers/purchaseController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getPurchases);
router.post('/', authMiddleware, createPurchase);
router.get('/suppliers', authMiddleware, getSuppliers);
router.post('/suppliers', authMiddleware, createSupplier);

module.exports = router;
