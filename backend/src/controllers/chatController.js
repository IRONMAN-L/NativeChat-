const Message = require('../models/Message');

// Get message history between current user and a friend
exports.getMessagesWithFriend = async (req, res) => {
    const userId = req.user.id;
    const { friendId } = req.params;

    if (!friendId) {
        return res.status(400).json({ error: 'Friend ID is required' });
    }

    try {
        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: friendId },
                { senderId: friendId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
