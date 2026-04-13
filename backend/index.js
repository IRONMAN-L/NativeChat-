require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const http = require('http');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const friendRoutes = require('./src/routes/friendRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const path = require('path');
const Message = require('./src/models/Message');
const GroupMessage = require('./src/models/GroupMessage');
const User = require('./src/models/User');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*", // Should restrict in production
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        // Mask OTP in logs for safety, but show it for now since we are debugging
        console.log('Body:', JSON.stringify(req.body));
    }
    next();
});
// Relax cors for uploads
app.use(cors({ origin: true, credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Helmet's crossOriginResourcePolicy blocks local files without tweaking
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cookieParser());

// Routes Integration
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('Messaging App Backend is running');
});

// Socket.IO Logic
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // When user logs in, join their own personal document room for receiving messages
    socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their personal room.`);
    });

    // Handle sending a private encrypted message
    socket.on("sendMessage", async ({ senderId, receiverId, encryptedContent, mediaType, fileName, clientMsgId }) => {
        // You would typically save this to the MongoDB Message collection here 
        try {
            const sender = await User.findById(senderId);
            let expiresAt = null;
            if (sender && sender.disappearingTimer > 0) {
                expiresAt = new Date(Date.now() + sender.disappearingTimer * 60 * 60 * 1000);
            }

            const newMessage = new Message({
                senderId,
                receiverId,
                encryptedContent,
                mediaType,
                fileName,
                status: 'sent',
                expiresAt
            });
            await newMessage.save();

            // Emit to receiver's room
            io.to(receiverId).emit("receiveMessage", {
                id: newMessage._id,
                senderId,
                encryptedContent,
                mediaType,
                fileName,
                timestamp: newMessage.createdAt
            });

            // Update sender that it was sent, reflecting their clientMsgId
            socket.emit("messageStatusUpdate", {
                msgId: newMessage._id,
                status: 'sent',
                clientMsgId
            });

        } catch (error) {
            console.error('Socket Send Message Error:', error);
        }
    });

    // Handle sending a fan-out Group Message
    socket.on("sendGroupMessage", async ({ groupId, senderId, encryptedPayloads, mediaType, fileName, clientMsgId }) => {
        try {
            const sender = await User.findById(senderId);
            let expiresAt = null;
            if (sender && sender.disappearingTimer > 0) {
                expiresAt = new Date(Date.now() + sender.disappearingTimer * 60 * 60 * 1000);
            }

            const newGroupMsg = new GroupMessage({
                groupId,
                senderId,
                encryptedPayloads,
                mediaType,
                fileName,
                expiresAt
            });
            await newGroupMsg.save();

            // Iterate over all specific user payload boxes and drop them strictly into the receiver rooms
            encryptedPayloads.forEach(payload => {
                const targetSockRoom = payload.receiverId.toString();
                // We bounce only THEIR specific ciphertext back into their socket! Huge performance & security win.
                io.to(targetSockRoom).emit("receiveGroupMessage", {
                    id: newGroupMsg._id,
                    groupId,
                    senderId,
                    mediaType,
                    fileName,
                    encryptedContent: payload.ciphertext,
                    timestamp: newGroupMsg.createdAt
                });
            });

            // Ack to sender
            socket.emit("messageStatusUpdate", {
                msgId: newGroupMsg._id,
                status: 'sent',
                clientMsgId,
                groupId // Tagged to route successfully locally
            });

        } catch (error) {
             console.error('Socket Group Message Error:', error);
        }
    });

    // Handle delivered/seen status update
    socket.on("messageStatusUpdate", async ({ msgId, status, senderId, receiverId }) => {
        try {
            // Check if receiver (the one sending the status update) has read receipts ON
            if (status === 'seen' && receiverId) {
                const receiver = await User.findById(receiverId);
                if (receiver && receiver.readReceipts === false) {
                    return; // Blocking the 'seen' tick
                }
            }

            await Message.findByIdAndUpdate(msgId, { status });
            // Notify the original sender that their message status changed
            io.to(senderId).emit("statusUpdated", { msgId, status });
        } catch (error) {
            console.error('Socket Status Update Error:', error);
        }
    });

    // --- WebRTC Signaling ---
    
    // Caller initiates a call
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        io.to(userToCall).emit("callIncoming", { signal: signalData, from, name });
    });

    // Receiver accepts the call
    socket.on("answerCall", ({ signal, to }) => {
        io.to(to).emit("callAccepted", signal);
    });

    // Exchange ICE network candidates
    socket.on("iceCandidate", ({ to, candidate }) => {
        io.to(to).emit("iceCandidate", candidate);
    });

    // User hangs up
    socket.on("endCall", ({ to }) => {
        io.to(to).emit("callEnded");
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chat_app';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });
