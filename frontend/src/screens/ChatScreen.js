import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, ImageBackground } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import EmojiPicker from 'rn-emoji-keyboard';
import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useOfflineP2pStore, isP2PSupported } from '../store/offlineP2pStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { scheduleMessageReminder } from '../utils/reminderUtils';
import { getThemeColors } from '../theme/colors';
import { translateMessage } from '../utils/translate';

import { API_URL } from '../config'; // Use centralized config

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

export default function ChatScreen({ route, navigation }) {
    const { friendId, friendName, friendProfilePicture } = route.params;
    const [messageText, setMessageText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [translatingMsgId, setTranslatingMsgId] = useState(null);
    const [downloadingMsgId, setDownloadingMsgId] = useState(null);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const { messages, sendMessage, setMessages, friends, fetchFriends, toggleStarFriend, fetchHistory, markAsSeen } = useChatStore();
    const { callUser, callStatus } = useCallStore();
    const { isOnline, isScanning, startScan, connectedPeer } = useOfflineP2pStore();
    const { user, token } = useAuthStore();
    const { theme, chatWallpaper, addReminder } = usePreferencesStore();
    const colors = getThemeColors(theme);
    const [showReminderMenu, setShowReminderMenu] = useState(false);
    const flatListRef = useRef(null);
    
    // Voice Message states
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingMsgId, setPlayingMsgId] = useState(null);
    const soundRef = useRef(null);
    const recordingInterval = useRef(null);
    const [videoThumbnails, setVideoThumbnails] = useState({}); // msgId -> uri
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    useEffect(() => {
        // Ensure friends (and their public keys) are loaded
        const loadChatData = async () => {
            if (friends.length === 0 && token) {
                await fetchFriends(token);
            }
            if (token && friendId) {
                fetchHistory(token, friendId);
            }
        };
        
        loadChatData();
    }, [token, friendId]);

    // Force Chat header bar theme adaptation dynamically
    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitle: () => (
                <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                        const activeFriend = friends.find(f => (f.id || f._id) === friendId);
                        navigation.navigate('FriendProfile', {
                            friendId,
                            friendName,
                            friendProfilePicture,
                            friendEmail: activeFriend?.email || `${friendName}@chatwithme.com`,
                            friendUsername: activeFriend?.username || friendName.toLowerCase().replace(/\s/g, '')
                        });
                    }}
                >
                    <Image 
                        source={{ uri: friendProfilePicture || `https://i.pravatar.cc/150?u=${friendId}` }} 
                        style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: colors.surface }} 
                    />
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{friendName}</Text>
                </TouchableOpacity>
            ),
            headerRight: () => {
                const activeFriend = friends.find(f => (f.id || f._id) === friendId);
                const isStarred = activeFriend?.isStarred || false;
                
                return (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={() => toggleStarFriend(token, friendId)} 
                            style={{ padding: 8 }}
                        >
                            <Ionicons 
                                name={isStarred ? "star" : "star-outline"} 
                                size={24} 
                                color={isStarred ? "#FFD700" : "#8A8D9F"} 
                            />
                        </TouchableOpacity>
                        {!isOnline && (
                            <TouchableOpacity style={styles.offlineBtn} onPress={startScan}>
                                <Text style={styles.offlineText}>{isScanning ? 'Scanning...' : connectedPeer ? 'Local Link' : 'P2P Offline'}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            onPress={() => setShowReminderMenu(true)} 
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="timer-outline" size={24} color="#00e5ff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={initiateCall} style={{ padding: 8 }}>
                            <Ionicons name="call" size={24} color="#00e5ff" />
                        </TouchableOpacity>
                    </View>
                );
            }
        });
    }, [navigation, friendName, friendId, friendProfilePicture, isOnline, isScanning, connectedPeer, colors, friends]);

    const handleSetReminder = async (minutes) => {
        setShowReminderMenu(false);
        const lastMsgText = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].encryptedContent : "Reply to chat";
        const notificationId = await scheduleMessageReminder(lastMsgText, friendName, minutes);
        
        if (notificationId) {
            const targetTime = new Date(Date.now() + minutes * 60000);
            addReminder({
                id: Date.now().toString(),
                friendId,
                friendName,
                targetTime: targetTime.toISOString(),
                notificationId,
                messagePreview: lastMsgText
            });
            Alert.alert("Reminder Set", `I'll remind you to reply to ${friendName} in ${minutes} minutes! ⏰`);
        }
    };
    
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

    // Filter messages for this specific conversation
    const chatMessages = messages.filter(
        (m) => (m.senderId === user.id && m.receiverId === friendId) || 
               (m.senderId === friendId && m.receiverId === user.id)
    );

    const reversedMessages = [...chatMessages].reverse();
    
    // Automatically mark messages as seen when entering chat
    useEffect(() => {
        chatMessages.forEach(msg => {
            if (msg.senderId === friendId && msg.status !== 'seen') {
                markAsSeen(msg._id || msg.id, msg.senderId, user.id);
            }
        });
    }, [chatMessages.length]);

    // Track incoming call globally or strictly here
    useEffect(() => {
        if (callStatus === 'RECEIVING' || callStatus === 'CALLING') {
            navigation.navigate('Call');
        }
    }, [callStatus]);

    const initiateCall = async () => {
        const { isWebRTCSupported } = useCallStore.getState();
        if (!isWebRTCSupported) {
            alert("Video Calling requires a Standalone APK. Please wait for your EAS Build to finish or test Chat/Encryption for now!");
            return;
        }
        await callUser(friendId, friendName);
    };

    const handleSend = () => {
        if (!messageText.trim()) return;
        sendMessage(user.id, friendId, messageText.trim(), 'text');
        setMessageText('');
    };

    const startRecording = async () => {
        try {
            // Fix: ensure previous recording is unloaded if it exists
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
            
            // Upload the voice message
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

    const handlePickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All, // Support Videos + Images
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const type = asset.type === 'video' ? 'video' : 'image';
            handleUploadMedia(asset.uri, type, asset.fileName || `media_${Date.now()}`);
        }
        setShowAttachmentMenu(false);
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
        setShowAttachmentMenu(false);
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
        setShowAttachmentMenu(false);
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
        setShowAttachmentMenu(false);
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
            sendMessage(user.id, friendId, res.data.fileUrl, res.data.mediaType, name);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload attachment');
        } finally {
            setIsUploading(false);
        }
    };

    const handleTranslate = async (msgId, text) => {
        setTranslatingMsgId(msgId);
        const translatedText = await translateMessage(text);
        
        // Update local state temporarily for UX
        const updatedMessages = messages.map(m => {
            if (m.id === msgId || m._id === msgId) {
                return { ...m, translatedContent: translatedText };
            }
            return m;
        });
        setMessages(updatedMessages);
        setTranslatingMsgId(null);
    };

    const handleDownloadMedia = async (url, msgId) => {
        try {
            setDownloadingMsgId(msgId);
            
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                alert("Permission to access the gallery was denied. Cannot save image.");
                setDownloadingMsgId(null);
                return;
            }

            const filename = url.split('/').pop() || `chat_image_${Date.now()}.jpg`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            
            const downloadRes = await FileSystem.downloadAsync(url, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            
            alert("Image saved to gallery!");
        } catch (error) {
            console.warn("Failed to download image: ", error);
            alert("An error occurred while downloading the image.");
        } finally {
            setDownloadingMsgId(null);
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

    const handleRemindMe = async (text) => {
        // Hardcode 5 minutes for demo
        const id = await scheduleMessageReminder(text, friendName, 5);
        if (id) {
            alert(`Reminder set for 5 minutes from now!`);
        }
    };

    const handleEmojiSelected = (emojiObject) => {
        setMessageText(prev => prev + emojiObject.emoji);
    };

    const renderMessage = ({ item, index }) => {
        const isMyMessage = item.senderId === user.id;

        const msgDateObj = item.createdAt || item.timestamp;
        const msgDate = new Date(msgDateObj);
        
        // Since list is inverted, chronologically previous item is at index + 1
        const prevMsgObj = reversedMessages[index + 1];
        const showDateHeader = !prevMsgObj || !isSameDay(msgDateObj, prevMsgObj.createdAt || prevMsgObj.timestamp);

        const messageContent = (
            <>
                {item.mediaType === 'image' ? (
                    <View style={styles.imageAttachmentContainer}>
                        <Image source={{ uri: item.encryptedContent }} style={styles.imageAttachment} resizeMode="cover" />
                        <TouchableOpacity style={styles.downloadIconContainer} onPress={() => handleDownloadMedia(item.encryptedContent, item.id || item._id)}>
                            {downloadingMsgId === (item.id || item._id) ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="download-outline" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
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
                ) : item.mediaType === 'audio' ? (
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
                ) : (
                    <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : { color: colors.text }]}>
                        {item.encryptedContent}
                    </Text>
                )}

                {item.translatedContent && (
                    <Text style={styles.translatedText}>
                        {item.translatedContent}
                    </Text>
                )}
                
                <View style={styles.metaContainer}>
                    {!isMyMessage && item.mediaType === 'text' && !item.translatedContent && (
                        <TouchableOpacity onPress={() => handleTranslate(item.id || item._id, item.encryptedContent)}>
                            {translatingMsgId === (item.id || item._id) ? 
                                <ActivityIndicator size="small" color="#999" /> : 
                                <Text style={styles.translateButton}>Translate</Text>
                            }
                        </TouchableOpacity>
                    )}
                    {!isMyMessage && item.mediaType === 'text' && (
                        <TouchableOpacity onPress={() => handleRemindMe(item.encryptedContent)}>
                            <Text style={styles.remindButton}>⏰ 5m</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.timestamp}>
                        {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMyMessage && ` • ${item.status || 'sent'}`}
                    </Text>
                </View>
            </>
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
                    {isMyMessage ? (
                        <LinearGradient
                            colors={['#00e5ff', '#3d5afe']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={[styles.bubble, styles.myBubble]}
                        >
                            {messageContent}
                        </LinearGradient>
                    ) : (
                        <View style={[styles.bubble, styles.theirBubble, { backgroundColor: colors.surface }]}>
                            {messageContent}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // Attachment menu data mimicking the reference image
    const ATTACHMENT_OPTIONS = [
        { id: '1', title: 'Document', icon: 'document-text', colors: ['#512da8', '#7e57c2'], action: handlePickDocument },
        { id: '2', title: 'Camera', icon: 'camera', colors: ['#c2185b', '#e91e63'], action: handleCameraAction },
        { id: '3', title: 'Gallery', icon: 'image', colors: ['#1976d2', '#42a5f5'], action: handlePickMedia },
        { id: '4', title: 'Audio', icon: 'headset', colors: ['#e65100', '#fb8c00'], action: handlePickAudio },
        { id: '5', title: 'Location', icon: 'location', colors: ['#2e7d32', '#66bb6a'] },
        { id: '6', title: 'Contact', icon: 'person', colors: ['#0277bd', '#29b6f6'] },
        { id: '7', title: 'Poll', icon: 'bar-chart', colors: ['#00695c', '#26a69a'] },
        { id: '8', title: 'Event', icon: 'calendar', colors: ['#ad1457', '#ec407a'] },
    ];

    const renderAttachmentMenu = () => {
        if (!showAttachmentMenu) return null;
        return (
            <View style={[styles.attachmentMenuContainer, { backgroundColor: colors.surface }]}>
                {ATTACHMENT_OPTIONS.map((item) => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={styles.attachmentMenuItem} 
                        onPress={() => {
                            if (item.action) item.action();
                            else alert(`${item.title} coming soon!`);
                        }}
                    >
                        <LinearGradient colors={item.colors} style={styles.attachmentIconContainer}>
                            <Ionicons name={item.icon} size={24} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.attachmentItemText}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]} 
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

            {renderAttachmentMenu()}

            <View style={[styles.bottomBarContainer, { backgroundColor: chatWallpaper ? 'rgba(0,0,0,0.4)' : colors.background }]}>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}>
                        <Ionicons name="happy-outline" size={24} color={isEmojiPickerOpen ? "#00e5ff" : colors.textMuted} />
                    </TouchableOpacity>

                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Message"
                        placeholderTextColor={colors.textMuted}
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                    />
                    
                    <TouchableOpacity style={styles.iconButton} onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}>
                        <Ionicons name="attach" size={26} color={colors.textMuted} style={{ transform: [{ rotate: '-45deg' }] }} />
                    </TouchableOpacity>
                    
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
    },
    chatList: {
        flex: 1,
    },
    chatListContent: {
        padding: 16,
        paddingBottom: 32,
    },
    dateHeaderContainer: {
        alignItems: 'center',
        marginVertical: 12,
        marginBottom: 20,
    },
    dateHeaderText: {
        backgroundColor: '#1A1B22',
        color: '#8A8D9F',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    messageBubbleWrapper: {
        marginBottom: 16,
        flexDirection: 'row',
    },
    myMessage: {
        justifyContent: 'flex-end',
    },
    theirMessage: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: '#1A1B22',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#fff',
    },
    myMessageText: {
        color: '#fff',
    },
    theirMessageText: {
        color: '#fff',
    },
    timestamp: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    translateButton: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginRight: 8,
    },
    remindButton: {
        fontSize: 12,
        color: '#ff9800',
        fontWeight: 'bold',
        marginRight: 8,
    },
    offlineBtn: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 12,
    },
    offlineText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    translatedText: {
        fontSize: 14,
        color: '#ffd54f',
        marginTop: 4,
        fontStyle: 'italic',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)'
    },
    imageAttachmentContainer: {
        position: 'relative',
        width: 200,
        height: 200,
    },
    imageAttachment: {
        width: 200,
        height: 200,
        borderRadius: 8,
        backgroundColor: '#1e1e1e',
    },
    downloadIconContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBarContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: '#0F1014',
        alignItems: 'flex-end',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#1A1B22',
        borderRadius: 24,
        alignItems: 'flex-end', // Keep bottom aligned for multiline
        paddingHorizontal: 8,
        paddingVertical: 4,
        minHeight: 48,
    },
    iconButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 10,
        maxHeight: 120,
    },
    fabContainer: {
        marginLeft: 8,
        borderRadius: 24,
        overflow: 'hidden',
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2, // Align visually with the pill
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachmentMenuContainer: {
        backgroundColor: '#1A1B22',
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        // Optional shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    attachmentMenuItem: {
        width: '25%',
        alignItems: 'center',
        marginBottom: 16,
    },
    attachmentIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachmentItemText: {
        color: '#8A8D9F',
        fontSize: 12,
    },
    audioBubbleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        minWidth: 180,
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
        color: '#8A8D9F',
        marginLeft: 8,
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
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    reminderMenu: {
        backgroundColor: '#1A1B22',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    menuItemText: {
        color: '#FFF',
        fontSize: 16,
        marginLeft: 16,
    }
});
