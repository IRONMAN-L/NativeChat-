const express = require('express');
const { createGroup, getUserGroups, getGroupHistory, updateGroup, addMembers, leaveGroup, clearGroupHistory, toggleStarGroup } = require('../controllers/groupController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create', protect, createGroup);
router.get('/', protect, getUserGroups);
router.get('/history/:groupId', protect, getGroupHistory);
router.put('/update', protect, updateGroup);
router.put('/add-members', protect, addMembers);
router.post('/leave', protect, leaveGroup);
router.post('/toggle-star', protect, toggleStarGroup);
router.delete('/clear-history/:groupId', protect, clearGroupHistory);

module.exports = router;
