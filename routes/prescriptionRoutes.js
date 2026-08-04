const express = require('express');
const router = express.Router();
const { getPrescriptions, createPrescription, dispensePrescription } = require('../controllers/prescriptionController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', getPrescriptions);
router.post('/', authMiddleware, createPrescription);
router.post('/:id/dispense', authMiddleware, dispensePrescription);

module.exports = router;
