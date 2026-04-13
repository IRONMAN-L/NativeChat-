const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    iconUrl: { type: String, default: null },
    adminIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);
