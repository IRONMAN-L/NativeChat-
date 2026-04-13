import { create } from 'zustand';
import io from 'socket.io-client';
import axios from 'axios';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import { useOfflineP2pStore } from './offlineP2pStore';
import { API_URL, SOCKET_URL } from '../config';

export const useChatStore = create((set, get) => ({
  socket: null,
  messages: [], // Array of message objects
  friends: [],
  groups: [],
  isLoadingFriends: false,
  isLoadingGroups: false,
  isConnected: false,

  fetchFriends: async (token) => {
    set({ isLoadingFriends: true });
    try {
      const response = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ friends: response.data, isLoadingFriends: false });
    } catch (error) {
      console.warn('Error fetching friends in ChatStore:', error.message || error);
      set({ isLoadingFriends: false });
    }
  },

  toggleStarFriend: async (token, friendId) => {
    try {
      const response = await axios.put(`${API_URL}/friends/toggle-star`, { friendId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { isStarred } = response.data;
      
      set((state) => ({
        friends: state.friends.map(f => 
          (f.id || f._id) === friendId ? { ...f, isStarred } : f
        )
      }));

      return isStarred;
    } catch (error) {
      console.warn('Error toggling star status:', error.message || error);
      return null;
    }
  },

  fetchGroups: async (token) => {
    set({ isLoadingGroups: true });
    try {
      const response = await axios.get(`${API_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ groups: response.data, isLoadingGroups: false });
    } catch (error) {
      console.warn('Error fetching groups in ChatStore:', error.message || error);
      set({ isLoadingGroups: false });
    }
  },

  createGroup: async (token, name, memberIds) => {
    try {
      const response = await axios.post(`${API_URL}/groups/create`, { name, memberIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set((state) => ({ groups: [...state.groups, response.data] }));
      return response.data;
    } catch (error) {
      console.warn('Error creating group:', error);
      return null;
    }
  },

  fetchHistory: async (token, friendId) => {
    try {
      const response = await axios.get(`${API_URL}/chat/history/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { friends } = get();
      const friend = friends.find(f => (f.id || f._id) === friendId);
      
      const messages = await Promise.all(response.data.map(async (msg) => {
        let decryptedContent = '[Encrypted Message]';
        if (friend && friend.publicKey) {
          try {
            decryptedContent = await decryptMessage(msg.encryptedContent, friend.publicKey);
          } catch (err) {
            console.warn('Decryption failed for history message:', err.message || err);
          }
        }
        return { ...msg, encryptedContent: decryptedContent };
      }));

      set({ messages });
    } catch (error) {
      console.warn('Error fetching history:', error.message || error);
    }
  },

  fetchGroupHistory: async (token, groupId) => {
    try {
      const response = await axios.get(`${API_URL}/groups/history/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const group = get().groups.find(g => (g.id || g._id) === groupId);
      if (!group) return;

      const messages = await Promise.all(response.data.map(async (msg) => {
        let decryptedContent = '[Encrypted Message]';
        const sender = group.memberIds.find(m => (m._id || m.id) === msg.senderId);
        if (sender && sender.publicKey && msg.encryptedContent) {
          try {
            decryptedContent = await decryptMessage(msg.encryptedContent, sender.publicKey);
          } catch (err) {
             console.warn('Decryption failed for group history message', err);
          }
        }
        return { ...msg, encryptedContent: decryptedContent };
      }));

      set({ messages });
    } catch (error) {
      console.warn('Error fetching group history:', error.message || error);
    }
  },

  // Initialize socket connection
  connectSocket: (userId) => {
    if (get().socket) return; 

    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      set({ isConnected: true });
      newSocket.emit('join', userId); // Join private room
    });

    newSocket.on('receiveMessage', async (message) => {
      // Find friend to get their public key for decryption
      const friends = get().friends;
      const friend = friends.find(f => (f.id || f._id) === message.senderId);
      
      let decryptedContent = '[Encrypted Message]';
      if (friend && friend.publicKey) {
          decryptedContent = await decryptMessage(message.encryptedContent, friend.publicKey);
      }

      const decryptedMessage = { 
          ...message, 
          encryptedContent: decryptedContent,
          fileName: message.fileName
      };

      set((state) => ({
        messages: [...state.messages, decryptedMessage],
      }));
    });

    newSocket.on('receiveGroupMessage', async (message) => {
      const groups = get().groups;
      const group = groups.find(g => (g.id || g._id) === message.groupId);
      let decryptedContent = '[Encrypted Message]';
      
      if (group) {
          const sender = group.memberIds.find(m => (m._id || m.id) === message.senderId);
          if (sender && sender.publicKey && message.encryptedContent) {
              try {
                  decryptedContent = await decryptMessage(message.encryptedContent, sender.publicKey);
              } catch(e) { }
          }
      }

      set((state) => ({
        messages: [...state.messages, { ...message, encryptedContent: decryptedContent, fileName: message.fileName }],
      }));
    });

    newSocket.on('messageStatusUpdate', ({ msgId, status, clientMsgId }) => {
      set((state) => ({
        messages: state.messages.map(msg => 
          (clientMsgId && msg.id === clientMsgId) || msg.id === msgId || msg._id === msgId ? { ...msg, status, _id: msgId } : msg
        ),
      }));
    });

    newSocket.on('statusUpdated', ({ msgId, status }) => {
      set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === msgId || msg._id === msgId ? { ...msg, status } : msg
        ),
      }));
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket: newSocket });
  },

  // Disconnect socket when user logs out
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, messages: [], friends: [] });
    }
  },

  // Send message securely
  sendMessage: async (senderId, receiverId, rawText, mediaType = 'text', fileName = null) => {
    const { socket, friends } = get();
    if (socket) {
      
      // Get the friend's public key
      const friend = friends.find(f => (f.id || f._id) === receiverId);
      if (!friend || !friend.publicKey) {
          console.warn("Cannot send message: Friend's public key missing.");
          return;
      }

      // Encrypt the message text
      const encryptedData = await encryptMessage(rawText, friend.publicKey);

      const clientMsgId = Date.now().toString();
      const tempMessage = {
        id: clientMsgId, // Use this for local tracking
        senderId,
        receiverId,
        encryptedContent: rawText, // Show raw locally immediately
        mediaType,
        fileName,
        status: 'sending',
        timestamp: new Date()
      };

      // Add to local state immediately
      set((state) => ({
        messages: [...state.messages, tempMessage]
      }));

      const { isOnline, sendOfflineMessage } = useOfflineP2pStore.getState();

      if (!isOnline) {
          // Send over Wifi Direct layer
          const success = await sendOfflineMessage(encryptedData);
          if (!success) {
            console.log("Failed offline send");
          }
      } else {
        // Send the encrypted payload to server via Socket.io
        socket.emit('sendMessage', {
            senderId,
            receiverId,
            encryptedContent: encryptedData, // Only this goes over the wire!
            mediaType,
            fileName,
            clientMsgId
        });
      }
    }
  },

  sendGroupMessage: async (senderId, groupId, rawText, mediaType = 'text', fileName = null) => {
    const { socket, groups } = get();
    if (socket) {
      const group = groups.find(g => (g.id || g._id) === groupId);
      if (!group) return;

      const encryptedPayloads = [];
      for (const member of group.memberIds) {
        if (!member.publicKey) continue;
        if (member._id === senderId || member.id === senderId) continue;
        
        try {
           const encryptedData = await encryptMessage(rawText, member.publicKey);
           encryptedPayloads.push({
               receiverId: member._id || member.id,
               ciphertext: encryptedData
           });
        } catch (e) {
           console.warn(`Fan-out encryption failed for member`, e);
        }
      }

      const clientMsgId = Date.now().toString();
      const tempMessage = {
        id: clientMsgId,
        senderId,
        groupId,
        encryptedContent: rawText,
        mediaType,
        fileName,
        status: 'sending',
        timestamp: new Date()
      };

      set((state) => ({
        messages: [...state.messages, tempMessage]
      }));

      socket.emit('sendGroupMessage', {
          groupId,
          senderId,
          encryptedPayloads,
          mediaType,
          fileName,
          clientMsgId
      });
    }
  },

  // Action to load friends (mocked for now, will connect to API later)
  setFriends: (friends) => set({ friends }),
  
  // Action to load message history
  setMessages: (messages) => set({ messages }),

  markAsSeen: (msgId, senderId, receiverId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('messageStatusUpdate', { msgId, status: 'seen', senderId, receiverId });
    }
  },

  muteUser: async (token, friendId) => {
    try {
      const response = await axios.put(`${API_URL}/friends/toggle-mute`, { friendId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { isMuted } = response.data;
      set((state) => ({
        friends: state.friends.map(f => (f.id || f._id) === friendId ? { ...f, isMuted } : f)
      }));
      return isMuted;
    } catch (error) {
      console.warn('Mute Toggle Error:', error);
      return null;
    }
  },

  blockUser: async (token, friendId) => {
    try {
      const response = await axios.put(`${API_URL}/friends/toggle-block`, { friendId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { status } = response.data;
      set((state) => ({
        friends: status === 'blocked' 
          ? state.friends.filter(f => (f.id || f._id) !== friendId) 
          : state.friends.map(f => (f.id || f._id) === friendId ? { ...f, status } : f)
      }));
      return status;
    } catch (error) {
      console.warn('Block Toggle Error:', error);
      return null;
    }
  },

  clearChat: async (token, friendId) => {
    try {
      await axios.delete(`${API_URL}/friends/clear-chat/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ messages: [] });
      return true;
    } catch (error) {
      console.warn('Clear Chat Error:', error);
      return false;
    }
  },

  updateGroupInfo: async (token, groupId, data) => {
    try {
      const response = await axios.put(`${API_URL}/groups/update`, { groupId, ...data }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set((state) => ({
        groups: state.groups.map(g => (g.id || g._id) === groupId ? { ...g, ...response.data } : g)
      }));
      return response.data;
    } catch (error) {
      console.warn('Update Group Error:', error);
      return null;
    }
  },

  addMembersToGroup: async (token, groupId, memberIds) => {
    try {
      const response = await axios.put(`${API_URL}/groups/add-members`, { groupId, memberIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set((state) => ({
        groups: state.groups.map(g => (g.id || g._id) === groupId ? response.data : g)
      }));
      return response.data;
    } catch (error) {
      console.warn('Add Members Error:', error);
      return null;
    }
  },

  leaveGroup: async (token, groupId) => {
    try {
      await axios.post(`${API_URL}/groups/leave`, { groupId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set((state) => ({
        groups: state.groups.filter(g => (g.id || g._id) !== groupId)
      }));
      return true;
    } catch (error) {
      console.warn('Leave Group Error:', error);
      return false;
    }
  },

  clearGroupMessages: async (token, groupId) => {
    try {
      await axios.delete(`${API_URL}/groups/clear-history/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ messages: [] });
      return true;
    } catch (error) {
      console.warn('Clear Group Messages Error:', error);
      return false;
    }
  },

  toggleStarGroup: async (token, groupId, userId) => {
    try {
      const response = await axios.post(`${API_URL}/groups/toggle-star`, { groupId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { isStarred } = response.data;
      set((state) => ({
        groups: state.groups.map(g => {
            if ((g.id || g._id) === groupId) {
                const starredBy = isStarred 
                    ? [...(g.starredBy || []), userId]
                    : (g.starredBy || []).filter(id => id.toString() !== userId.toString());
                return { ...g, starredBy };
            }
            return g;
        })
      }));
      return isStarred;
    } catch (error) {
      console.warn('Toggle Star Group Error:', error);
      return null;
    }
  },

  toggleMuteGroup: async (token, groupId, userId) => {
    try {
      const response = await axios.post(`${API_URL}/groups/toggle-mute`, { groupId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { isMuted } = response.data;
      set((state) => ({
        groups: state.groups.map(g => {
            if ((g.id || g._id) === groupId) {
                const mutedBy = isMuted 
                    ? [...(g.mutedBy || []), userId]
                    : (g.mutedBy || []).filter(id => id.toString() !== userId.toString());
                return { ...g, mutedBy };
            }
            return g;
        })
      }));
      return isMuted;
    } catch (error) {
      console.warn('Toggle Mute Group Error:', error);
      return null;
    }
  }
}));
