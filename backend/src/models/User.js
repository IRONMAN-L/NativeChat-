const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    displayName: String,
    profilePicture: String,
    publicKey: String,
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark'
    },
    language: {
        type: String,
        enum: ['en', 'te', 'hi'],
        default: 'en'
    },
    otpSecret: String,
    otpExpires: Date,
    twoStepPin: String,
    readReceipts: {
        type: Boolean,
        default: true
    },
    disappearingTimer: {
        type: Number,
        default: 0 // 0 means disabled, otherwise represents hours
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
