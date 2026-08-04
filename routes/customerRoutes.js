const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleRegularStatus,
  deleteCustomer,
  getCustomerHistory,
  submitFeedback,
  getFeedbacks
} = require('../controllers/customerController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', getCustomers);
router.post('/', authMiddleware, createCustomer);
router.get('/:id/history', authMiddleware, getCustomerHistory);
router.put('/:id', authMiddleware, updateCustomer);
router.delete('/:id', authMiddleware, deleteCustomer);
router.put('/:id/toggle-regular', authMiddleware, toggleRegularStatus);
router.post('/feedback', submitFeedback);
router.get('/feedback', authMiddleware, getFeedbacks);

module.exports = router;

