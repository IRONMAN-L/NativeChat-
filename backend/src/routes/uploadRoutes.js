const express = require('express');
const { uploadMedia } = require('../controllers/uploadController');
const { upload } = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect); // Only authenticated users can upload

// Endpoint expecting form-data with a field 'media'
router.post('/', upload.single('media'), uploadMedia);

module.exports = router;
