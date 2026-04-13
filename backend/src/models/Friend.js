const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'blocked'],
        default: 'pending'
    },
    isStarred: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Friend', FriendSchema);
