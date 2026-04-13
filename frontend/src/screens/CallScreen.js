import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCallStore } from '../store/callStore';

let RTCView = View; // Fallback
try {
    const WebRTC = require('react-native-webrtc');
    if (WebRTC && WebRTC.RTCView) {
        RTCView = WebRTC.RTCView;
    }
} catch (e) {
    console.log("RTCView not available. Falling back to mock.");
}

export default function CallScreen({ navigation }) {
    const { localStream, remoteStream, callStatus, answerCall, declineCall, endCall } = useCallStore();

    if (callStatus === 'RECEIVING' && !remoteStream) {
        return (
            <View style={styles.incomingContainer}>
                <Text style={styles.incomingTitle}>Incoming Video Call...</Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.button, styles.declineBtn]} onPress={() => declineCall()}>
                        <Text style={styles.buttonText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.answerBtn]} onPress={() => answerCall()}>
                        <Text style={styles.buttonText}>Answer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (callStatus === 'CALLING') {
        return (
            <View style={styles.incomingContainer}>
                <Text style={styles.incomingTitle}>Calling...</Text>
                {/* We can show local video while calling */}
                {localStream && (
                    <RTCView 
                        streamURL={localStream.toURL()}
                        style={styles.localVideo}
                        objectFit={'cover'}
                    />
                )}
                <TouchableOpacity style={[styles.endCallButton]} onPress={() => endCall()}>
                    <Text style={styles.buttonText}>End Call</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {remoteStream && (
                <RTCView 
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit={'cover'}
                />
            )}
            {localStream && (
                <View style={styles.localVideoContainer}>
                    <RTCView 
                        streamURL={localStream.toURL()}
                        style={styles.localVideoMini}
                        objectFit={'cover'}
                    />
                </View>
            )}
            
            <View style={styles.controlsContainer}>
                <TouchableOpacity style={styles.endCallButton} onPress={() => endCall()}>
                    <Text style={styles.buttonText}>End Call</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    incomingContainer: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    incomingTitle: {
        color: '#fff',
        fontSize: 24,
        marginBottom: 40,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '60%',
        justifyContent: 'space-between',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    declineBtn: {
        backgroundColor: '#e74c3c',
    },
    answerBtn: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    remoteVideo: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    localVideoContainer: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        width: 100,
        height: 150,
        backgroundColor: '#222',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    localVideo: {
        width: '100%',
        height: '100%',
    },
    localVideoMini: {
        width: '100%',
        height: '100%',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    endCallButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
    }
});
