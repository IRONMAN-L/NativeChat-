import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 32 - 16) / 3; // 3 columns with padding
export default function FriendProfileScreen({ route, navigation }) {
    const { friendId, friendName, friendProfilePicture, friendEmail, friendUsername } = route.params;
    const [activeTab, setActiveTab] = useState('Media');

    const { messages } = useChatStore();
    const { user } = useAuthStore();
    const { theme } = usePreferencesStore();
    const colors = getThemeColors(theme);

    // Extract actual images shared between user and friend
    const sharedMedia = messages
        .filter(m => 
            ((m.senderId === user?.id && m.receiverId === friendId) || 
            (m.senderId === friendId && m.receiverId === user?.id)) && 
            m.mediaType === 'image'
        )
        .reverse()
        .map(m => m.encryptedContent); // Holds actual image URL natively

    const ACTIONS = [
        { icon: 'chatbubble', label: 'Message', onPress: () => navigation.goBack() },
        { icon: 'notifications', label: 'Mute', onPress: () => {} },
        { icon: 'call', label: 'Call', onPress: () => {} },
        { icon: 'videocam', label: 'Video', onPress: () => alert('Requires Standalone Build') }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Absolute Top Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={26} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Profile Portrait & Info */}
                <View style={styles.portraitSection}>
                    <Image 
                        source={{ uri: friendProfilePicture || `https://i.pravatar.cc/150?u=${friendId}` }} 
                        style={styles.avatar} 
                    />
                    <Text style={[styles.nameText, { color: colors.text }]}>{friendName}</Text>
                    <Text style={styles.lastSeenText}>last seen recently</Text>
                </View>

                {/* Primary Action Button Array */}
                <View style={styles.actionsContainer}>
                    {ACTIONS.map((action, index) => (
                        <TouchableOpacity key={index} style={[styles.actionCard, { backgroundColor: colors.surface }]} onPress={action.onPress}>
                            <Ionicons name={action.icon} size={24} color={colors.text} style={{ marginBottom: 6 }} />
                            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Contact Identity Block */}
                <View style={[styles.identityBlock, { backgroundColor: colors.surface }]}>
                    <View style={styles.identityRow}>
                        <View style={styles.identityTextContainer}>
                            <Text style={[styles.identityValue, { color: colors.text }]}>{friendEmail}</Text>
                            <Text style={styles.identityLabel}>Email</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.identityRow, { marginTop: 20 }]}>
                        <View style={styles.identityTextContainer}>
                            <Text style={[styles.identityValue, { color: colors.text }]}>@{friendUsername}</Text>
                            <Text style={styles.identityLabel}>Username</Text>
                        </View>
                        <TouchableOpacity style={styles.qrButton}>
                            <Ionicons name="qr-code-outline" size={26} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tab Controller */}
                <View style={styles.tabContainer}>
                    {['Media', 'Files', 'Links'].map((tab) => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.tabButton, activeTab === tab && { backgroundColor: colors.surface }]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Active Grid Renders */}
                {activeTab === 'Media' && (
                    <View style={styles.mediaGrid}>
                        {sharedMedia.length > 0 ? (
                            sharedMedia.map((url, i) => (
                                <Image key={i} source={{ uri: url }} style={styles.gridImage} />
                            ))
                        ) : (
                            <Text style={styles.noMediaText}>No media shared yet</Text>
                        )}
                    </View>
                )}

                {/* Extra padding at very bottom */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        height: 80,
        backgroundColor: 'transparent',
    },
    iconButton: {
        padding: 8,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    portraitSection: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 24,
    },
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: '#1A1B22',
        marginBottom: 16,
    },
    nameText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    lastSeenText: {
        fontSize: 14,
        color: '#8A8D9F',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionCard: {
        backgroundColor: '#1A1B22',
        width: '23%',
        height: 70,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    identityBlock: {
        backgroundColor: '#1A1B22',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    identityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    identityTextContainer: {
        flex: 1,
    },
    identityValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 4,
    },
    identityLabel: {
        color: '#8A8D9F',
        fontSize: 14,
    },
    qrButton: {
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    tabButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginHorizontal: 4,
    },
    tabButtonActive: {
        backgroundColor: '#1A1B22',
    },
    tabText: {
        color: '#8A8D9F',
        fontSize: 16,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#3498db',
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    gridImage: {
        width: GRID_ITEM_SIZE,
        height: GRID_ITEM_SIZE,
        marginRight: 8,
        marginBottom: 8,
        borderRadius: 4,
    },
    noMediaText: {
        color: '#8A8D9F',
        marginTop: 20,
        width: '100%',
        textAlign: 'center',
    }
});
