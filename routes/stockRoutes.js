const express = require('express');
const router = express.Router();
const { getStockLogs, getStockLevels } = require('../controllers/stockController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/logs', authMiddleware, getStockLogs);
router.get('/levels', authMiddleware, getStockLevels);

module.exports = router;
