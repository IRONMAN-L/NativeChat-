const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');

exports.createGroup = async (req, res) => {
    try {
        const { name, memberIds } = req.body;
        const currentUserId = req.user._id;

        // Ensure the creator is in the members and admins
        const allMembers = Array.from(new Set([...memberIds, currentUserId.toString()]));

        const newGroup = new Group({
            name,
            adminIds: [currentUserId],
            memberIds: allMembers
        });

        await newGroup.save();

        // Populate members to get public keys back to the client immediately
        const populatedGroup = await Group.findById(newGroup._id)
            .populate('memberIds', 'email username displayName profilePicture publicKey');

        res.status(201).json(populatedGroup);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const groups = await Group.find({ memberIds: req.user._id })
            .populate('memberIds', 'email username displayName profilePicture publicKey');
        res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
};

exports.getGroupHistory = async (req, res) => {
    try {
        const { groupId } = req.params;
        const messages = await GroupMessage.find({ groupId }).sort({ createdAt: 1 });
        
        // Filter down the massive blob to just the payload meant for the requesting user
        // This stops massive payload sizes over network and prevents exposing unused ciphertexts
        const cleanedMessages = messages.map(msg => {
            const myPayload = msg.encryptedPayloads.find(p => p.receiverId.toString() === req.user._id.toString());
            return {
                _id: msg._id,
                groupId: msg.groupId,
                senderId: msg.senderId,
                mediaType: msg.mediaType,
                createdAt: msg.createdAt,
                encryptedContent: myPayload ? myPayload.ciphertext : null
            };
        });

        res.status(200).json(cleanedMessages);
    } catch (error) {
        console.error('Error fetching group history:', error);
        res.status(500).json({ error: 'Failed to fetch group history' });
    }
};
// Update group profile (Admin only)
exports.updateGroup = async (req, res) => {
    try {
        const { groupId, name, iconUrl } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        if (!group.adminIds.includes(req.user._id)) {
            return res.status(403).json({ error: 'Only admins can update group profile' });
        }

        if (name) group.name = name;
        if (iconUrl) group.iconUrl = iconUrl;
        await group.save();

        res.status(200).json(group);
    } catch (error) {
        console.error('Update Group Error:', error);
        res.status(500).json({ error: 'Failed to update group' });
    }
};

// Add members to group
exports.addMembers = async (req, res) => {
    try {
        const { groupId, memberIds } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Check if requester is a member at least? Or admin? 
        // Typically only admins add members.
        if (!group.adminIds.includes(req.user._id)) {
            return res.status(403).json({ error: 'Only admins can add members' });
        }

        const newMembers = memberIds.filter(id => !group.memberIds.includes(id));
        group.memberIds.push(...newMembers);
        await group.save();

        const populatedGroup = await Group.findById(groupId)
            .populate('memberIds', 'email username displayName profilePicture publicKey');

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error('Add Members Error:', error);
        res.status(500).json({ error: 'Failed to add members' });
    }
};

// Leave group
exports.leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        group.memberIds = group.memberIds.filter(id => id.toString() !== req.user._id.toString());
        group.adminIds = group.adminIds.filter(id => id.toString() !== req.user._id.toString());

        // If no members left, delete the group? 
        if (group.memberIds.length === 0) {
            await Group.findByIdAndDelete(groupId);
            return res.status(200).json({ message: 'Left group and group deleted' });
        }

        // If no admins left but members exist, assign a new admin
        if (group.adminIds.length === 0 && group.memberIds.length > 0) {
            group.adminIds.push(group.memberIds[0]);
        }

        await group.save();
        res.status(200).json({ message: 'Left group successfully' });
    } catch (error) {
        console.error('Leave Group Error:', error);
        res.status(500).json({ error: 'Failed to leave group' });
    }
};

// Clear group chat history
exports.clearGroupHistory = async (req, res) => {
    try {
        const { groupId } = req.params;
        await GroupMessage.deleteMany({ groupId });
        res.status(200).json({ message: 'Group history cleared' });
    } catch (error) {
        console.error('Clear Group History Error:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
};

// Toggle star status for group
exports.toggleStarGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const userId = req.user._id;
        const isStarred = group.starredBy.includes(userId);

        if (isStarred) {
            group.starredBy = group.starredBy.filter(id => id.toString() !== userId.toString());
        } else {
            group.starredBy.push(userId);
        }

        await group.save();
        res.status(200).json({ isStarred: !isStarred });
    } catch (error) {
        console.error('Toggle Star Group Error:', error);
        res.status(500).json({ error: 'Failed to toggle star' });
    }
};

// Toggle mute status for group per user
exports.toggleMuteGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const userId = req.user._id;
        const isMuted = group.mutedBy.includes(userId);

        if (isMuted) {
            group.mutedBy = group.mutedBy.filter(id => id.toString() !== userId.toString());
        } else {
            group.mutedBy.push(userId);
        }

        await group.save();
        res.status(200).json({ isMuted: !isMuted });
    } catch (error) {
        console.error('Toggle Mute Group Error:', error);
        res.status(500).json({ error: 'Failed to toggle mute' });
    }
};
