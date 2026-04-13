const User = require('../models/User');
const Friend = require('../models/Friend');

// Search users by email or username
exports.searchUsers = async (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const users = await User.find({
            $or: [
                { email: { $regex: q, $options: 'i' } },
                { username: { $regex: q, $options: 'i' } }
            ]
        }).select('id email username displayName profilePicture status publicKey');
        
        // Exclude the current user from search results
        const filteredUsers = users.filter(user => user.id !== req.user.id);

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error('Search Users Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Send a friend request
exports.sendFriendRequest = async (req, res) => {
    const { recipientId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === recipientId) {
        return res.status(400).json({ error: "Cannot send request to yourself" });
    }

    try {
        const existingReq = await Friend.findOne({
            $or: [
                { requesterId, recipientId },
                { requesterId: recipientId, recipientId: requesterId }
            ]
        });

        if (existingReq) {
            return res.status(400).json({ error: `Request already exists with status: ${existingReq.status}` });
        }

        const friendRequest = new Friend({
            requesterId,
            recipientId,
            status: 'pending'
        });

        await friendRequest.save();

        res.status(201).json({ message: 'Friend request sent successfully', request: friendRequest });
    } catch (error) {
        console.error('Send Request Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Accept a friend request
exports.acceptFriendRequest = async (req, res) => {
    const { requestId } = req.body;

    try {
        const friendRequest = await Friend.findById(requestId);

        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        if (friendRequest.recipientId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to accept this request' });
        }

        friendRequest.status = 'accepted';
        await friendRequest.save();

        res.status(200).json({ message: 'Friend request accepted' });
    } catch (error) {
        console.error('Accept Request Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get list of accepted friends
exports.getFriends = async (req, res) => {
    const userId = req.user.id;

    try {
        const friendships = await Friend.find({
            $or: [{ requesterId: userId }, { recipientId: userId }],
            status: 'accepted'
        }).populate('requesterId recipientId', 'id email username displayName profilePicture status publicKey');

        const friendsList = friendships.map(f => {
            const friendObj = f.requesterId._id.toString() === userId ? f.recipientId.toObject() : f.requesterId.toObject();
            return {
                ...friendObj,
                isStarred: f.isStarred,
                isMuted: f.isMuted,
                status: f.status
            };
        });

        res.status(200).json(friendsList);
    } catch (error) {
        console.error('Get Friends Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// Get pending friend requests for the current user
exports.getPendingRequests = async (req, res) => {
    const userId = req.user.id;

    try {
        const requests = await Friend.find({
            recipientId: userId,
            status: 'pending'
        }).populate('requesterId', 'id email username displayName profilePicture status');

        res.status(200).json(requests);
    } catch (error) {
        console.error('Get Pending Requests Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// Toggle a friend's starred status
exports.toggleStar = async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    try {
        const friendship = await Friend.findOne({
            $or: [
                { requesterId: userId, recipientId: friendId },
                { requesterId: friendId, recipientId: userId }
            ],
            status: 'accepted'
        });

        if (!friendship) {
            return res.status(404).json({ error: 'Friendship not found' });
        }

        friendship.isStarred = !friendship.isStarred;
        await friendship.save();

        res.status(200).json({ isStarred: friendship.isStarred, message: 'Status updated' });
    } catch (error) {
        console.error('Toggle Star Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// Toggle a friend's muted status
exports.toggleMute = async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    try {
        const friendship = await Friend.findOne({
            $or: [
                { requesterId: userId, recipientId: friendId },
                { requesterId: friendId, recipientId: userId }
            ],
            status: 'accepted'
        });

        if (!friendship) return res.status(404).json({ error: 'Friendship not found' });

        friendship.isMuted = !friendship.isMuted;
        await friendship.save();

        res.status(200).json({ isMuted: friendship.isMuted, message: friendship.isMuted ? 'Notifications muted' : 'Notifications unmuted' });
    } catch (error) {
        console.error('Toggle Mute Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Block a user
exports.toggleBlock = async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    try {
        const friendship = await Friend.findOne({
            $or: [
                { requesterId: userId, recipientId: friendId },
                { requesterId: friendId, recipientId: userId }
            ]
        });

        if (!friendship) return res.status(404).json({ error: 'Relationship not found' });

        const newStatus = friendship.status === 'blocked' ? 'accepted' : 'blocked';
        friendship.status = newStatus;
        await friendship.save();

        res.status(200).json({ status: newStatus, message: newStatus === 'blocked' ? 'User blocked' : 'User unblocked' });
    } catch (error) {
        console.error('Toggle Block Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Clear chat history
const Message = require('../models/Message');
exports.clearChatHistory = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.id;

    try {
        await Message.deleteMany({
            $or: [
                { senderId: userId, receiverId: friendId },
                { senderId: friendId, receiverId: userId }
            ]
        });

        res.status(200).json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error('Clear Chat Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
