const express = require('express');
const {
  register, verifyEmail, resendVerification, login, changePassword, getMe, logout,
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

module.exports = router;
