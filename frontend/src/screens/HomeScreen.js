import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image, SafeAreaView, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getTranslation } from '../utils/languages';

export default function HomeScreen({ navigation }) {
    const { user, token } = useAuthStore();
    const { connectSocket, disconnectSocket, friends, fetchFriends, groups, fetchGroups } = useChatStore();
    const { theme, language } = usePreferencesStore();
    const colors = getThemeColors(theme);
    const t = (key) => getTranslation(language, key);
    const [searchQuery, setSearchQuery] = useState('');

    const combinedList = [
        ...friends.map(f => ({ ...f, type: 'friend' })),
        ...groups.map(g => ({ ...g, type: 'group' }))
    ];

    const filteredChats = combinedList.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const searchAgainst = item.type === 'group' 
            ? item.name 
            : (item.displayName || item.username || item.email);
        return searchAgainst?.toLowerCase().includes(q);
    });

    useEffect(() => {
        if (user && user.id) connectSocket(user.id);
        if (token) {
            if (friends.length === 0) fetchFriends(token);
            if (groups.length === 0) fetchGroups(token);
        }
    }, [user, token]);

    const renderActiveUser = ({ item, index }) => {
        if (index === 0) {
            // "New Chat" button
            return (
                <View style={styles.activeUserContainer}>
                    <TouchableOpacity style={styles.newChatButton}>
                        <Ionicons name="add" size={24} color="#666" />
                    </TouchableOpacity>
                    <Text style={[styles.activeUserName, { color: colors.text }]}>New Chat</Text>
                </View>
            );
        }

        const data = item;
        const name = data.displayName || data.username || data.email || 'User';
        const isOnline = data.status === 'online';
        return (
            <View style={styles.activeUserContainer}>
                <View style={styles.avatarWrapper}>
                    <LinearGradient
                        colors={['#00e5ff', '#b388ff']}
                        style={styles.avatarGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Image source={{ uri: data.profilePicture || `https://i.pravatar.cc/150?u=${data.id || data._id}` }} style={styles.avatarImage} />
                    </LinearGradient>
                    {isOnline && <View style={styles.onlineDot} />}
                </View>
                <Text style={[styles.activeUserName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
            </View>
        );
    };

    const renderRecentMessage = ({ item }) => {
        const isGroup = item.type === 'group';
        const name = isGroup ? item.name : (item.displayName || item.username || item.email || 'User');
        const isOnline = !isGroup && item.status === 'online';
        
        const avatarUri = isGroup 
            ? (item.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00e5ff&color=fff`)
            : (item.profilePicture || `https://i.pravatar.cc/150?u=${item.id || item._id}`);

        return (
            <TouchableOpacity 
                style={styles.recentMessageContainer} 
                onPress={() => {
                    if (isGroup) {
                        navigation.navigate('GroupChat', { 
                            groupId: item.id || item._id, 
                            groupName: name 
                        });
                    } else {
                        navigation.navigate('Chat', { 
                            friendId: item.id || item._id, 
                            friendName: name, 
                            friendProfilePicture: item.profilePicture 
                        });
                    }
                }}
            >
                <View style={styles.recentAvatarWrapper}>
                    <LinearGradient
                        colors={isGroup ? ['#00e5ff', '#00e5ff'] : ['#00e5ff', '#b388ff']}
                        style={[styles.avatarGradient, isGroup && { borderRadius: 15 }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Image source={{ uri: avatarUri }} style={[styles.avatarImage, isGroup && { borderRadius: 13 }]} />
                    </LinearGradient>
                    {isOnline && <View style={styles.onlineDot} />}
                    {isGroup && (
                        <View style={[styles.groupBadge, { backgroundColor: colors.primary }]}>
                            <Ionicons name="people" size={10} color="#FFF" />
                        </View>
                    )}
                </View>
                <View style={styles.recentMessageContent}>
                    <View style={styles.recentMessageHeader}>
                        <Text style={[styles.recentMessageName, { color: colors.text }]}>{name}</Text>
                        {isGroup && <Text style={[styles.groupTag, { color: colors.textMuted }]}>Group</Text>}
                    </View>
                    <View style={styles.recentMessageFooter}>
                        <Text style={styles.recentMessageText} numberOfLines={1}>Tap to view messages...</Text>
                        <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginTop: 2 }} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <LinearGradient colors={['#00e5ff', '#b388ff']} style={styles.logoGradient}>
                            <Ionicons name="chatbubble" size={18} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>ChatWithMe</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="notifications-outline" size={24} color="#A0A0A0" />
                            <View style={styles.notificationDot} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                            <Image 
                                source={{ uri: user?.profilePicture || `https://i.pravatar.cc/150?u=${user?.id || 'me'}` }} 
                                style={styles.profileImage} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder={t('searchPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Active Now Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('recent').toUpperCase()}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                </View>
                <View style={styles.activeNowContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[{ id: 'new' }, ...friends]}
                        keyExtractor={(item) => item.id || item._id || 'new'}
                        renderItem={renderActiveUser}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                </View>

                {/* Recent Messages Section */}
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Text style={styles.sectionTitle}>{t('chats').toUpperCase()}</Text>
                    <TouchableOpacity>
                        <Text style={styles.markReadText}>MARK READ</Text>
                    </TouchableOpacity>
                </View>
                
                <FlatList
                    data={filteredChats}
                    keyExtractor={(item) => item.id || item._id}
                    renderItem={renderRecentMessage}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                />

                {/* Floating Add Button */}
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Contacts')}>
                    <LinearGradient
                        colors={['#00e5ff', '#3d5afe']}
                        style={styles.fabGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="add" size={32} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0F1014',
    },
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoGradient: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginRight: 16,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 0,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4081',
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1B22',
        marginHorizontal: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 24,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#8A8D9F',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    markReadText: {
        color: '#00e5ff',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    activeNowContainer: {
        height: 100,
        marginBottom: 10,
    },
    activeUserContainer: {
        alignItems: 'center',
        marginRight: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 8,
    },
    newChatButton: {
        width: 56,
        height: 56,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarGradient: {
        width: 60,
        height: 60,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2, 
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22, 
    },
    onlineDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#00E676',
        borderWidth: 2,
        borderColor: '#0F1014',
    },
    activeUserName: {
        color: '#FFF',
        fontSize: 12,
    },
    recentMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    recentAvatarWrapper: {
        marginRight: 16,
        position: 'relative',
    },
    recentMessageContent: {
        flex: 1,
    },
    recentMessageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    recentMessageName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    recentMessageTime: {
        color: '#00e5ff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    recentMessageFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recentMessageText: {
        color: '#8A8D9F',
        fontSize: 14,
        flex: 1,
        marginRight: 16,
    },
    unreadBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        shadowColor: '#00e5ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0F1014',
    },
    groupTag: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    }
});
