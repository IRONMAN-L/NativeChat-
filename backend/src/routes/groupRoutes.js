const express = require('express');
const { createGroup, getUserGroups, getGroupHistory } = require('../controllers/groupController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create', protect, createGroup);
router.get('/', protect, getUserGroups);
router.get('/history/:groupId', protect, getGroupHistory);

module.exports = router;
