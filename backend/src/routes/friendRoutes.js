const express = require('express');
const { searchUsers, sendFriendRequest, acceptFriendRequest, getFriends, getPendingRequests } = require('../controllers/friendController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect); // Ensure all friend routes are protected

router.get('/search', searchUsers);
router.post('/request', sendFriendRequest);
router.get('/requests/pending', getPendingRequests);
router.put('/accept', acceptFriendRequest);
router.get('/', getFriends);

module.exports = router;
