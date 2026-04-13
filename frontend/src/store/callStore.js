import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from './chatStore';
import { useAuthStore } from './authStore';

// Safe Native Module Loading for Expo Go Compatibility
let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices;
let isWebRTCSupported = false;

try {
    const WebRTC = require('react-native-webrtc');
    RTCPeerConnection = WebRTC.RTCPeerConnection;
    RTCSessionDescription = WebRTC.RTCSessionDescription;
    RTCIceCandidate = WebRTC.RTCIceCandidate;
    mediaDevices = WebRTC.mediaDevices;
    isWebRTCSupported = true;
} catch (e) {
    console.log("WebRTC Native Module not found. Running in Compatibility Mode (Expo Go).");
}

export { isWebRTCSupported };

const pc_config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Added a public TURN server for production reliability on mobile networks
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

export const useCallStore = create(
    persist(
        (set, get) => ({
            localStream: null,
            remoteStream: null,
            callStatus: 'IDLE', // IDLE, CALLING, RECEIVING, CONNECTED
            incomingCallData: null,
            peerConnection: null,
            callHistory: [], // [{ id, name, friendId, type, direction, status, timestamp }]

            addCallHistoryRecord: (record) => {
                const newRecord = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...record
                };
                set((state) => ({
                    callHistory: [newRecord, ...state.callHistory].slice(0, 50) // Keep last 50 calls
                }));
            },

    setupWebrtcListeners: () => {
        const socket = useChatStore.getState().socket;
        if (!socket) return;

        socket.off('callIncoming');
        socket.on('callIncoming', async (data) => {
            set({ callStatus: 'RECEIVING', incomingCallData: data });
            // Log as incoming immediately, will update status later if missed
            get().addCallHistoryRecord({
                name: data.name,
                friendId: data.from,
                type: data.type || 'Video',
                direction: 'Incoming',
                status: 'Missed' // Default to missed until answered
            });
        });

        socket.off('callAccepted');
        socket.on('callAccepted', async (signal) => {
            const pc = get().peerConnection;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                set({ callStatus: 'CONNECTED' });
            }
        });

        socket.off('iceCandidate');
        socket.on('iceCandidate', async (candidate) => {
            const pc = get().peerConnection;
            if (pc && candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });

        socket.off('callEnded');
        socket.on('callEnded', () => {
            get().cleanupCall();
        });
    },

    getMediaStream: async () => {
        let isFront = true;
        const sourceInfos = await mediaDevices.enumerateDevices();
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
            const sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === 'videoinput' && sourceInfo.facing === (isFront ? 'front' : 'environment')) {
                videoSourceId = sourceInfo.deviceId;
            }
        }

        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
                width: 640,
                height: 480,
                frameRate: 30,
                facingMode: (isFront ? 'user' : 'environment'),
                deviceId: videoSourceId
            }
        });

        set({ localStream: stream });
        return stream;
    },

    createPeerConnection: (friendId) => {
        const socket = useChatStore.getState().socket;
        const pc = new RTCPeerConnection(pc_config);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('iceCandidate', { to: friendId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                set({ remoteStream: event.streams[0] });
            }
        };

        const localStream = get().localStream;
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream);
            });
        }

        set({ peerConnection: pc });
        return pc;
    },

    callUser: async (friendId, friendName, type = 'Video') => {
        const user = useAuthStore.getState().user;
        const socket = useChatStore.getState().socket;
        
        set({ callStatus: 'CALLING' });
        
        get().addCallHistoryRecord({
            name: friendName,
            friendId,
            type,
            direction: 'Outgoing',
            status: 'Connected'
        });

        await get().getMediaStream();
        
        const pc = get().createPeerConnection(friendId);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('callUser', {
            userToCall: friendId,
            signalData: offer,
            from: user.id,
            name: user.displayName || user.username || user.email
        });
    },

    answerCall: async () => {
        const data = get().incomingCallData;
        const socket = useChatStore.getState().socket;
        
        set({ callStatus: 'CONNECTED' });

        // Update last record in history to 'Connected' instead of 'Missed'
        set((state) => ({
            callHistory: state.callHistory.map((call, idx) => 
                (idx === 0 && call.friendId === data.from) ? { ...call, status: 'Connected' } : call
            )
        }));

        await get().getMediaStream();
        
        const pc = get().createPeerConnection(data.from);
        
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answerCall', { signal: answer, to: data.from });
    },

    declineCall: () => {
        const data = get().incomingCallData;
        const socket = useChatStore.getState().socket;
        if (data && socket) {
            socket.emit('endCall', { to: data.from });
        }
        get().cleanupCall();
    },

    endCall: (friendId) => {
        const socket = useChatStore.getState().socket;
        if (socket) {
            socket.emit('endCall', { to: friendId });
        }
        get().cleanupCall();
    },

    cleanupCall: () => {
        const { peerConnection, localStream } = get();
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnection) {
            peerConnection.close();
        }
        set({
            localStream: null,
            remoteStream: null,
            callStatus: 'IDLE',
            incomingCallData: null,
            peerConnection: null
        });
    }
}),
{
    name: 'chatwithme-call-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({ callHistory: state.callHistory }), // Only persist history
}
)
);
