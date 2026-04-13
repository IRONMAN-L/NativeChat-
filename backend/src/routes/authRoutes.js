const express = require('express');
const { requestOTP, verifyOTP, updateProfile, verifyPIN, setupPIN, updatePrivacySettings } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Routes
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/verify-pin', verifyPIN);

// Protected Routes
router.put('/profile', protect, updateProfile);
router.post('/setup-pin', protect, setupPIN);
router.put('/privacy', protect, updatePrivacySettings);

module.exports = router;
