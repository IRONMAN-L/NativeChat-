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
