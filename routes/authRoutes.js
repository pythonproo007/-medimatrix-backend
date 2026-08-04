const express = require('express');
const router = express.Router();
const { login, register, getMe, updateProfile, forgotPassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.get('/me', authMiddleware, getMe);
router.put('/update-profile', authMiddleware, updateProfile);
router.post('/forgot-password', forgotPassword);

module.exports = router;

