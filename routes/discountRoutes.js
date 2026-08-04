const express = require('express');
const router = express.Router();
const { getOffers, createOffer, validateOffer, broadcastOffer } = require('../controllers/discountController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', getOffers);
router.post('/', authMiddleware, createOffer);
router.post('/validate', validateOffer);
router.post('/:id/broadcast', authMiddleware, broadcastOffer);

module.exports = router;
