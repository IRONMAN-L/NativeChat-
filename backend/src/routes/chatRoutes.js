const express = require('express');
const { getMessagesWithFriend } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect); // Ensure all chat routes are protected

// Get history with a specific friend
router.get('/history/:friendId', getMessagesWithFriend);

module.exports = router;
