const mongoose = require('mongoose');

const EncryptedPayloadSchema = new mongoose.Schema({
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ciphertext: { type: String, required: true }
}, { _id: false });

const GroupMessageSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedPayloads: [EncryptedPayloadSchema], // Fan-out array of ciphertexts
    mediaType: { type: String, enum: ['text', 'image', 'video', 'audio', 'document'], default: 'text' },
    fileName: { type: String },
    expiresAt: { type: Date, default: null }
}, { timestamps: true });

GroupMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GroupMessage', GroupMessageSchema);
