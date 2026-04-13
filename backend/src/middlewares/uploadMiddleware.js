const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary from env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nativechat_uploads',
        resource_type: 'auto', // Important for audio/video support
        allowed_formats: ['jpg', 'png', 'jpeg', 'mp3', 'm4a', 'wav', 'mp4', 'pdf', 'pdf'],
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return file.fieldname + '-' + uniqueSuffix;
        }
    },
});

exports.upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Increased for video/documents (50MB)
});
