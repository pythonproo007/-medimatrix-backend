const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getAlternates,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  manualStockOut,
  manualStockIn,
  getCategories,
  addCategory,
  getTypes,
  addType
} = require('../controllers/medicineController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', getMedicines);
router.post('/', authMiddleware, createMedicine);
router.get('/categories', getCategories);
router.post('/categories', authMiddleware, addCategory);
router.get('/types', getTypes);
router.post('/types', authMiddleware, addType);
router.get('/:id/alternates', getAlternates);
router.put('/:id', authMiddleware, updateMedicine);
router.delete('/:id', authMiddleware, deleteMedicine);
router.post('/:id/stock-out', authMiddleware, manualStockOut);
router.post('/:id/stock-in', authMiddleware, manualStockIn);

module.exports = router;

