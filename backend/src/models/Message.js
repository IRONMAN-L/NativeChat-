const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    encryptedContent: {
        type: String,
        required: true, // The encrypted payload containing the text
    },
    mediaType: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'document'],
        default: 'text'
    },
    fileName: {
        type: String, // For display in document bubbles
    },
    mediaUrl: {
        type: String, // Encrypted URL if applicable
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent'
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', MessageSchema);
