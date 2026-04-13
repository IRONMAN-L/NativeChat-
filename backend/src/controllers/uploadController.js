exports.uploadMedia = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a file' });
    }

    try {
        // Cloudinary provides the full secure URL in req.file.path
        const fileUrl = req.file.path;
        
        // This fileUrl will be pushed over the socket in encryptedContent
        res.status(200).json({
            message: 'File uploaded successfully',
            fileUrl: fileUrl,
            mediaType: req.file.mimetype.split('/')[0] // 'image', 'video', etc
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
};
