import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ImageBackground, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';
import { Audio, Video } from 'expo-av';
import EmojiPicker from 'rn-emoji-keyboard';
import axios from 'axios';

import { API_URL } from '../config';

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

const formatDateHeader = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function GroupChatScreen({ route, navigation }) {
    const { groupId, groupName } = route.params;
    const [messageText, setMessageText] = useState('');
    const { messages, sendGroupMessage, fetchGroupHistory, groups } = useChatStore();
    const { user, token } = useAuthStore();
    const { theme, chatWallpaper } = usePreferencesStore();
    const colors = getThemeColors(theme);
    const flatListRef = useRef(null);
    const activeGroup = groups.find(g => (g.id || g._id) === groupId);

    // Voice Message states
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingMsgId, setPlayingMsgId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const soundRef = useRef(null);
    const recordingInterval = useRef(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', icon: 'notifications' });
    const [showReminderMenu, setShowReminderMenu] = useState(false);

    useEffect(() => {
        if (token && groupId) {
            fetchGroupHistory(token, groupId);
        }
    }, [token, groupId]);

    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitle: () => (
                <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                        navigation.navigate('GroupProfile', {
                            groupId,
                            groupName
                        });
                    }}
                >
                    <Image 
                        source={{ uri: activeGroup?.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=00e5ff&color=fff` }} 
                        style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: colors.surface }} 
                    />
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{groupName}</Text>
                </TouchableOpacity>
            ),
            headerRight: () => {
                const isStarred = activeGroup?.starredBy?.includes(user.id) || false;
                return (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <TouchableOpacity 
                            onPress={handleToggleStar} 
                            style={{ padding: 8 }}
                        >
                            <Ionicons 
                                name={isStarred ? "star" : "star-outline"} 
                                size={24} 
                                color={isStarred ? "#FFD700" : "#8A8D9F"} 
                            />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setShowReminderMenu(true)} 
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="timer-outline" size={24} color="#00e5ff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8 }}>
                            <Ionicons name="information-circle-outline" size={24} color="#00e5ff" />
                        </TouchableOpacity>
                    </View>
                )
            }
        });
    }, [navigation, groupName, colors, activeGroup, user.id, handleToggleStar]);

    // Cleanup recordings on unmount
    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch(e => console.warn('Cleanup recording error:', e));
            }
            if (recordingInterval.current) {
                clearInterval(recordingInterval.current);
            }
        };
    }, [recording]);

    // Filter messages for this specific group
    const chatMessages = messages.filter((m) => m.groupId === groupId);
    const reversedMessages = [...chatMessages].reverse();

    const triggerToast = (msg, icon = 'notifications', color = '#00e5ff') => {
        setToast({ visible: true, message: msg, icon, color });
        setTimeout(() => setToast({ visible: false, message: '', icon: 'notifications', color: '#00e5ff' }), 3000);
    };

    const handleToggleStar = async () => {
        const result = await toggleStarGroup(token, groupId, user.id);
        if (result !== null) {
            triggerToast(
                result ? "Group added to favorites" : "Removed from favorites", 
                result ? "star" : "star-outline",
                result ? "#FFD700" : "#8A8D9F"
            );
        }
    };

    const handleSetReminder = async (minutes) => {
        setShowReminderMenu(false);
        const lastMsgText = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].encryptedContent : "Reply to group chat";
        const { scheduleMessageReminder } = require('../utils/reminderUtils');
        const { usePreferencesStore } = require('../store/preferencesStore');
        const { addReminder } = usePreferencesStore.getState();
        
        const notificationId = await scheduleMessageReminder(lastMsgText, `${groupName} (Group)`, minutes);
        
        if (notificationId) {
            const targetTime = new Date(Date.now() + minutes * 60000);
            addReminder({
                id: Date.now().toString(),
                groupId,
                groupName,
                targetTime: targetTime.toISOString(),
                notificationId,
                messagePreview: lastMsgText
            });
            triggerToast(`Group reminder set for ${minutes} minutes!`, "timer", "#00e5ff");
        }
    };

    const handleSend = () => {
        if (!messageText.trim()) return;
        sendGroupMessage(user.id, groupId, messageText.trim(), 'text');
        setMessageText('');
    };

    const handlePickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const type = asset.type === 'video' ? 'video' : 'image';
            handleUploadMedia(asset.uri, type, asset.fileName || `media_${Date.now()}`);
        }
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                handleUploadMedia(asset.uri, 'document', asset.name);
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const handlePickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                handleUploadMedia(asset.uri, 'audio', asset.name);
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const handleCameraAction = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const type = asset.type === 'video' ? 'video' : 'image';
            handleUploadMedia(asset.uri, type, asset.fileName || `camera_${Date.now()}`);
        }
    };

    const handleUploadMedia = async (uri, mediaType, fileName = null) => {
        setIsUploading(true);
        const name = fileName || uri.split('/').pop() || 'upload_file';
        const match = /\.(\w+)$/.exec(name);
        const type = match ? `${mediaType}/${match[1]}` : mediaType;

        const formData = new FormData();
        formData.append('media', { uri, name, type });

        try {
            const res = await axios.post(`${API_URL}/uploads`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}` 
                }
            });
            sendGroupMessage(user.id, groupId, res.data.fileUrl, res.data.mediaType, name);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload attachment');
        } finally {
            setIsUploading(false);
        }
    };

    const handleOpenDocument = async (url, fileName) => {
        try {
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            const downloadRes = await FileSystem.downloadAsync(url, fileUri);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadRes.uri);
            } else {
                alert("Sharing is not available on this device.");
            }
        } catch (err) {
            console.error("Open document error:", err);
            alert("Could not open this file.");
        }
    };

    const handleEmojiSelected = (emojiObject) => {
        setMessageText(prev => prev + emojiObject.emoji);
    };

    const startRecording = async () => {
        try {
            // Ensure any previous recording is unloaded if it exists
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    // Ignore if already unloaded
                }
            }

            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
            
            setRecordingDuration(0);
            recordingInterval.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        clearInterval(recordingInterval.current);
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            handleUploadMedia(uri, 'audio');
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const playVoiceMessage = async (url, msgId) => {
        try {
            if (playingMsgId === msgId) {
                await soundRef.current.pauseAsync();
                setPlayingMsgId(null);
                return;
            }

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync({ uri: url });
            soundRef.current = sound;
            setPlayingMsgId(msgId);
            
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setPlayingMsgId(null);
                }
            });
        } catch (e) {
            console.error("Playback error", e);
        }
    };

    const getSenderName = (senderId) => {
        if (!activeGroup) return "Unknown";
        const member = activeGroup.memberIds.find(m => (m._id || m.id) === senderId);
        return member ? (member.displayName || member.username) : "Unknown";
    };

    const renderMessage = ({ item, index }) => {
        const isMyMessage = item.senderId === user.id;
        const msgDateObj = item.createdAt || item.timestamp;
        const msgDate = new Date(msgDateObj);
        
        const prevMsgObj = reversedMessages[index + 1];
        const showDateHeader = !prevMsgObj || !isSameDay(msgDateObj, prevMsgObj.createdAt || prevMsgObj.timestamp);

        const messageContent = item.mediaType === 'audio' ? (
            <View style={[styles.audioBubbleContainer, { backgroundColor: isMyMessage ? 'rgba(255,255,255,0.1)' : colors.background }]}>
                <TouchableOpacity onPress={() => playVoiceMessage(item.encryptedContent, item.id || item._id)}>
                    <Ionicons 
                        name={playingMsgId === (item.id || item._id) ? "pause" : "play"} 
                        size={28} 
                        color={isMyMessage ? "#FFF" : "#00e5ff"} 
                    />
                </TouchableOpacity>
                <View style={styles.audioWaveform}>
                     <View style={[styles.waveLine, { height: 10 }]} />
                     <View style={[styles.waveLine, { height: 18 }]} />
                     <View style={[styles.waveLine, { height: 14 }]} />
                     <View style={[styles.waveLine, { height: 22 }]} />
                     <View style={[styles.waveLine, { height: 16 }]} />
                </View>
                <Text style={[styles.durationText, { color: isMyMessage ? "rgba(255,255,255,0.7)" : colors.textMuted }]}>
                     {playingMsgId === (item.id || item._id) ? "Playing..." : "Voice Msg"}
                </Text>
            </View>
        ) : item.mediaType === 'video' ? (
            <View style={styles.videoBubbleContainer}>
                <Video
                    source={{ uri: item.encryptedContent }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode="cover"
                    shouldPlay={false}
                    useNativeControls
                    style={styles.videoPlayer}
                />
            </View>
        ) : item.mediaType === 'document' ? (
            <TouchableOpacity 
                style={[styles.documentBubble, { backgroundColor: isMyMessage ? 'rgba(255,255,255,0.1)' : colors.surface }]}
                onPress={() => handleOpenDocument(item.encryptedContent, item.fileName || 'document.pdf')}
            >
                <Ionicons name="document-text" size={32} color={isMyMessage ? "#FFF" : "#00e5ff"} />
                <View style={styles.documentMeta}>
                    <Text style={[styles.documentName, { color: isMyMessage ? "#FFF" : colors.text }]} numberOfLines={1}>
                        {item.fileName || 'Document'}
                    </Text>
                    <Text style={styles.documentSize}>Tap to open</Text>
                </View>
            </TouchableOpacity>
        ) : item.mediaType === 'image' ? (
            <View style={styles.imageAttachmentContainer}>
                <Image source={{ uri: item.encryptedContent }} style={styles.imageAttachment} resizeMode="cover" />
            </View>
        ) : (
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : { color: colors.text }]}>
                {item.encryptedContent || '[Encrypted Message]'}
            </Text>
        );

        return (
            <View>
                {showDateHeader && (
                    <View style={styles.dateHeaderContainer}>
                        <Text style={[styles.dateHeaderText, { backgroundColor: colors.surfaceHighlight, color: colors.textMuted }]}>
                            {formatDateHeader(msgDateObj)}
                        </Text>
                    </View>
                )}
                <View style={[styles.messageBubbleWrapper, isMyMessage ? styles.myMessage : styles.theirMessage]}>
                    {!isMyMessage && (
                         <View style={[styles.bubble, styles.theirBubble, { backgroundColor: colors.surface }]}>
                            <Text style={styles.senderName}>{getSenderName(item.senderId)}</Text>
                            {messageContent}
                            <Text style={styles.timestamp}>{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                    )}
                    {isMyMessage && (
                        <LinearGradient colors={['#00e5ff', '#3d5afe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.myBubble]}>
                            {messageContent}
                            <Text style={[styles.timestamp, { color: 'rgba(255,255,255,0.7)' }]}>{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • sent</Text>
                        </LinearGradient>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <KeyboardAvoidingView 
                style={[styles.container, { backgroundColor: colors.background, flex: 1 }]} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
            >
            {chatWallpaper && (
                <ImageBackground 
                    source={{ uri: chatWallpaper }} 
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                />
            )}
            
            <FlatList
                ref={flatListRef}
                data={reversedMessages}
                inverted={true}
                keyExtractor={(item) => item.id || item._id}
                renderItem={renderMessage}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
            />

            <View style={[styles.bottomBarContainer, { backgroundColor: chatWallpaper ? 'rgba(0,0,0,0.4)' : colors.background }]}>
                <TouchableOpacity style={styles.iconButton} onPress={() => {
                   // Quick menu for group attachments
                   const options = ["Document", "Gallery", "Audio", "Cancel"];
                   // Re-using same logic but simplified for brevity
                   handlePickMedia(); // Defaulting to gallery for now
                }}>
                    <Ionicons name="attach" size={26} color={colors.textMuted} style={{ transform: [{ rotate: '-45deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}>
                    <Ionicons name="happy-outline" size={24} color={isEmojiPickerOpen ? "#00e5ff" : colors.textMuted} />
                </TouchableOpacity>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Message"
                        placeholderTextColor={colors.textMuted}
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                    />
                    {messageText.length === 0 && !isRecording && (
                        <TouchableOpacity style={styles.iconButton} onPress={handleCameraAction}>
                            <Ionicons name="camera" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {isRecording ? (
                     <View style={[styles.recordingOverlay, { backgroundColor: colors.surface }]}>
                         <View style={styles.recordingDot} />
                         <Text style={{ color: '#ff4081', fontWeight: 'bold', marginLeft: 8 }}>
                             {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                         </Text>
                         <Text style={{ color: colors.textMuted, marginLeft: 16 }}>Recording Voice...</Text>
                         <TouchableOpacity style={{ marginLeft: 'auto', padding: 10 }} onPress={() => { setIsRecording(false); setRecording(null); clearInterval(recordingInterval.current); }}>
                             <Text style={{ color: '#ff4081' }}>Cancel</Text>
                         </TouchableOpacity>
                     </View>
                ) : isUploading ? (
                    <View style={styles.fabContainer}>
                        <LinearGradient colors={['#00e5ff', '#3d5afe']} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <ActivityIndicator color="#fff" />
                        </LinearGradient>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.fabContainer} 
                        onPress={messageText.trim() ? handleSend : null}
                        onLongPress={messageText.trim() ? null : startRecording}
                        onPressOut={isRecording ? stopRecording : null}
                    >
                        <LinearGradient colors={['#00e5ff', '#3d5afe']} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Ionicons name={messageText.trim() ? "send" : "mic"} size={20} color="#FFF" style={messageText.trim() ? { marginLeft: 4 } : {}} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            <EmojiPicker
                onEmojiSelected={handleEmojiSelected}
                open={isEmojiPickerOpen}
                onClose={() => setIsEmojiPickerOpen(false)}
                theme={{
                    backdrop: 'rgba(0,0,0,0.5)',
                    knob: colors.primary,
                    container: colors.surface,
                    header: colors.text,
                    skinTonesContainer: colors.surfaceHighlight,
                    category: {
                        icon: colors.textMuted,
                        iconActive: "#00e5ff",
                        container: colors.surface,
                        containerActive: colors.surfaceHighlight,
                    },
                }}
            />

            {/* Reminder Menu Modal */}
            {showReminderMenu && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowReminderMenu(false)} />
                    <View style={styles.reminderMenu}>
                        <Text style={styles.menuTitle}>Remind me to reply in...</Text>
                        {[5, 10, 15, 30, 60].map(mins => (
                            <TouchableOpacity key={mins} style={styles.menuItem} onPress={() => handleSetReminder(mins)}>
                                <Ionicons name="time-outline" size={20} color="#00e5ff" />
                                <Text style={styles.menuItemText}>{mins < 60 ? `${mins} Minutes` : '1 Hour'}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 8 }]} onPress={() => setShowReminderMenu(false)}>
                            <Text style={[styles.menuItemText, { color: '#FF3B30', textAlign: 'center', width: '100%', fontWeight: 'bold' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            </KeyboardAvoidingView>
            {/* Custom Toast Message */}
            {toast.visible && (
                <View style={[styles.toastContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons 
                        name={toast.icon || "notifications"} 
                        size={20} 
                        color={toast.color || "#00e5ff"} 
                        style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    chatList: { flex: 1 },
    chatListContent: { padding: 16, paddingBottom: 32 },
    dateHeaderContainer: { alignItems: 'center', marginVertical: 12 },
    dateHeaderText: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    messageBubbleWrapper: { marginBottom: 16, flexDirection: 'row' },
    myMessage: { justifyContent: 'flex-end' },
    theirMessage: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
    myBubble: { borderBottomRightRadius: 4 },
    theirBubble: { borderBottomLeftRadius: 4 },
    senderName: { fontSize: 12, fontWeight: 'bold', color: '#00e5ff', marginBottom: 4 },
    messageText: { fontSize: 16, color: '#fff' },
    myMessageText: { color: '#fff' },
    timestamp: { fontSize: 11, color: '#8A8D9F', marginTop: 4, alignSelf: 'flex-end' },
    bottomBarContainer: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, alignItems: 'flex-end' },
    inputContainer: { flex: 1, flexDirection: 'row', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 4, minHeight: 48 },
    input: { flex: 1, fontSize: 16, paddingTop: 10, paddingBottom: 10, maxHeight: 120 },
    fabContainer: { marginLeft: 8, borderRadius: 24, overflow: 'hidden', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    fabGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    audioBubbleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        minWidth: 180,
        marginTop: 4,
    },
    audioWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        flex: 1,
        justifyContent: 'space-evenly',
    },
    waveLine: {
        width: 3,
        backgroundColor: '#00e5ff',
        borderRadius: 2,
    },
    durationText: {
        fontSize: 11,
    },
    recordingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 24,
        zIndex: 10,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff4081',
    },
    imageAttachmentContainer: {
        width: 200,
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    imageAttachment: {
        width: '100%',
        height: '100%',
    },
    videoBubbleContainer: {
        width: 240,
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    documentBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        width: 220,
    },
    documentMeta: {
        marginLeft: 12,
        flex: 1,
    },
    documentName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    documentSize: {
        fontSize: 11,
        color: '#8A8D9F',
        marginTop: 2,
    },
    iconButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    reminderMenu: {
        backgroundColor: '#1A1B22',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    menuTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    menuItemText: {
        color: '#FFF',
        fontSize: 16,
        marginLeft: 15,
    },
    toastContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 80,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 2000,
    },
    toastText: {
        fontSize: 14,
        fontWeight: '500',
    }
});
