import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Platform, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';
import { Share, Modal, TextInput } from 'react-native';

const { width } = Dimensions.get('window');

export default function GroupProfileScreen({ route, navigation }) {
    const { groupId, groupName } = route.params;
    const [showMenu, setShowMenu] = useState(false);
    const [activeTab, setActiveTab] = useState('Media');
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [searchFriend, setSearchFriend] = useState('');
    const [toast, setToast] = useState({ visible: false, message: '', icon: 'notifications' });

    const { messages, groups, friends, updateGroupInfo, addMembersToGroup, leaveGroup, clearGroupMessages, toggleMuteGroup, deleteGroup } = useChatStore();
    const { user, token } = useAuthStore();
    const { theme } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const group = groups.find(g => (g.id || g._id) === groupId);
    const isAdmin = group?.adminIds?.includes(user.id);
    const isMuted = group?.mutedBy?.includes(user.id);

    // Extract group media
    const groupMedia = messages
        .filter(m => m.groupId === groupId && m.mediaType === 'image')
        .reverse()
        .map(m => m.encryptedContent);

    // Friends not in group
    const availableFriends = friends.filter(f => {
        const friendId = f.id || f._id;
        const alreadyIn = group.memberIds.some(m => (m.id || m._id) === friendId);
        if (alreadyIn) return false;
        if (!searchFriend) return true;
        const q = searchFriend.toLowerCase();
        return (f.displayName || f.username || f.email).toLowerCase().includes(q);
    });

    // Sort members: current user first (?), then admins, then others
    const sortedMembers = [...(group?.memberIds || [])].sort((a, b) => {
        const aIsAdmin = group.adminIds.includes(a._id || a.id);
        const bIsAdmin = group.adminIds.includes(b._id || b.id);
        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;
        return 0;
    });

    const triggerToast = (msg, icon = 'notifications', color = '#00e5ff') => {
        setToast({ visible: true, message: msg, icon, color });
        setTimeout(() => setToast({ visible: false, message: '', icon: 'notifications', color: '#00e5ff' }), 3000);
    };

    const handleLeave = () => {
        Alert.alert(
            "Leave Group",
            "Are you sure you want to leave this group?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Leave", 
                    onPress: async () => {
                        const success = await leaveGroup(token, groupId);
                        if (success) {
                            navigation.popToTop();
                        }
                    }, 
                    style: 'destructive' 
                }
            ]
        );
    };

    const handleAddMember = async (friendId) => {
        const result = await addMembersToGroup(token, groupId, [friendId]);
        if (result) {
            triggerToast("Member added successfully", "person-add");
        }
    };

    const handleToggleMute = async () => {
        const result = await toggleMuteGroup(token, groupId, user.id);
        if (result !== null) {
            triggerToast(result ? "Notifications muted" : "Notifications unmuted", result ? "notifications-off" : "notifications");
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join our group "${group.name}" on ChatWithMe! Group ID: ${groupId}`,
                title: 'Group Invitation'
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const handleClearChat = () => {
        setShowMenu(false);
        Alert.alert(
            "Clear Group Chat",
            "This will delete all messages for everyone in this group. Action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear", 
                    onPress: async () => {
                        const success = await clearGroupMessages(token, groupId);
                        if (success) triggerToast("Chat history cleared", "trash-outline");
                    }, 
                    style: 'destructive' 
                }
            ]
        );
    };

    const handleDeleteGroup = () => {
        setShowMenu(false);
        if (!isAdmin) return;
        
        Alert.alert(
            "Delete Group",
            "Are you sure you want to PERMANENTLY delete this group and its history? This action is irreversible.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete Everywhere", 
                    onPress: async () => {
                        const success = await deleteGroup(token, groupId);
                        if (success) {
                            navigation.popToTop();
                        }
                    }, 
                    style: 'destructive' 
                }
            ]
        );
    };

    const handleEditGroup = () => {
        setShowMenu(false);
        if (!isAdmin) return;
        
        Alert.alert(
            "Edit Group",
            "Choose an option to update",
            [
                { text: "Change Name", onPress: () => {
                    Alert.prompt(
                        "Edit Group Name",
                        "Enter new group name",
                        [
                            { text: "Cancel", style: "cancel" },
                            { 
                                text: "Update", 
                                onPress: async (newName) => {
                                    if (newName) {
                                        await updateGroupInfo(token, groupId, { name: newName });
                                        triggerToast("Group name updated", "checkmark-circle");
                                    }
                                } 
                            }
                        ],
                        'plain-text',
                        group.name
                    );
                }},
                { text: "Change Icon", onPress: async () => {
                    const { API_URL } = require('../config');
                    const axios = require('axios');
                    const { launchImageLibraryAsync, MediaTypeOptions } = require('expo-image-picker');
                    
                    const result = await launchImageLibraryAsync({
                        mediaTypes: MediaTypeOptions.Images,
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.5,
                    });

                    if (!result.canceled) {
                        const asset = result.assets[0];
                        const formData = new FormData();
                        formData.append('media', {
                            uri: asset.uri,
                            name: `group_${groupId}.jpg`,
                            type: 'image/jpeg'
                        });

                        try {
                            const res = await axios.post(`${API_URL}/uploads`, formData, {
                                headers: { 
                                    'Content-Type': 'multipart/form-data',
                                    'Authorization': `Bearer ${token}` 
                                }
                            });
                            await updateGroupInfo(token, groupId, { iconUrl: res.data.fileUrl });
                            triggerToast("Group icon updated", "image-outline");
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }},
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const ACTIONS = [
        { icon: 'person-add', label: 'Add', onPress: () => isAdmin ? setShowMemberPicker(true) : triggerToast("Admins only", "lock-closed"), color: '#00e5ff' },
        { icon: 'log-out', label: 'Leave', onPress: handleLeave, color: '#ff4081' },
        { 
            icon: isMuted ? 'notifications-off' : 'notifications', 
            label: isMuted ? 'Unmute' : 'Mute', 
            onPress: handleToggleMute, 
            color: isMuted ? '#ff4081' : '#00e5ff' 
        },
        { icon: 'share-social', label: 'Share', onPress: handleShare, color: '#00e5ff' }
    ];

    const renderMember = ({ item }) => {
        const isMemberAdmin = group.adminIds.includes(item._id || item.id);
        const name = item.displayName || item.username || "Member";
        
        return (
            <View style={styles.memberItem}>
                <Image 
                    source={{ uri: item.profilePicture || `https://i.pravatar.cc/150?u=${item._id || item.id}` }} 
                    style={styles.memberAvatar} 
                />
                <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
                    <Text style={styles.memberStatus}>Hey there! I am using ChatWithMe</Text>
                </View>
                {isMemberAdmin && (
                    <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={26} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.iconButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.portraitSection}>
                    <Image 
                        source={{ uri: group?.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=00e5ff&color=fff` }} 
                        style={styles.avatar} 
                    />
                    <Text style={[styles.nameText, { color: colors.text }]}>{group?.name || groupName}</Text>
                    <Text style={styles.memberCountText}>Group • {group?.memberIds?.length || 0} members</Text>
                </View>

                <View style={styles.actionsContainer}>
                    {ACTIONS.map((action, index) => (
                        <TouchableOpacity key={index} style={[styles.actionCard, { backgroundColor: colors.surface }]} onPress={action.onPress}>
                            <Ionicons name={action.icon} size={24} color={action.color} style={{ marginBottom: 6 }} />
                            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{group?.memberIds?.length || 0} MEMBERS</Text>
                </View>

                <View style={[styles.membersBlock, { backgroundColor: colors.surface }]}>
                    {sortedMembers.map((item) => (
                        <View key={item._id || item.id}>
                            {renderMember({ item })}
                        </View>
                    ))}
                </View>

                {/* Tab Controller */}
                <View style={styles.tabContainer}>
                    {['Media', 'Files', 'Links'].map((tab) => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.tabButton, activeTab === tab && { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, { color: activeTab === tab ? '#00e5ff' : colors.textMuted }]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab Content */}
                {activeTab === 'Media' && (
                    <View style={styles.mediaGrid}>
                        {groupMedia.length > 0 ? (
                            groupMedia.map((url, i) => (
                                <Image key={i} source={{ uri: url }} style={styles.gridImage} />
                            ))
                        ) : (
                            <Text style={styles.noMediaText}>No media shared yet</Text>
                        )}
                    </View>
                )}

                {activeTab !== 'Media' && (
                    <View style={styles.placeholderSection}>
                        <Ionicons name={activeTab === 'Files' ? 'document-outline' : 'link-outline'} size={48} color={colors.surfaceHighlight} />
                        <Text style={[styles.noMediaText, { marginTop: 12 }]}>No {activeTab.toLowerCase()} shared in this group</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Member Picker Modal */}
            <Modal
                visible={showMemberPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowMemberPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
                        <View style={styles.pickerHeader}>
                            <Text style={[styles.pickerTitle, { color: colors.text }]}>Add Members</Text>
                            <TouchableOpacity onPress={() => setShowMemberPicker(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                            <Ionicons name="search" size={20} color={colors.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search friends..."
                                placeholderTextColor={colors.textMuted}
                                value={searchFriend}
                                onChangeText={setSearchFriend}
                            />
                        </View>
                        <FlatList
                            data={availableFriends}
                            keyExtractor={(item) => item.id || item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        handleAddMember(item.id || item._id);
                                        setShowMemberPicker(false);
                                    }}
                                >
                                    <Image source={{ uri: item.profilePicture || `https://i.pravatar.cc/150?u=${item.id || item._id}` }} style={styles.pickerAvatar} />
                                    <View>
                                        <Text style={[styles.pickerName, { color: colors.text }]}>{item.displayName || item.username}</Text>
                                        <Text style={styles.pickerEmail}>{item.email}</Text>
                                    </View>
                                    <Ionicons name="add-circle" size={26} color="#00e5ff" style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.noMediaText}>No friends to add</Text>}
                        />
                    </View>
                </View>
            </Modal>

            {/* Menu Modal */}
            {showMenu && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={styles.modalBackdrop} 
                        onPress={() => setShowMenu(false)} 
                    />
                    <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                        <View style={styles.menuHeader}>
                            <View style={styles.menuHandle} />
                            <Text style={[styles.menuTitle, { color: colors.text }]}>Group Settings</Text>
                        </View>

                        {isAdmin && (
                            <TouchableOpacity style={styles.menuItem} onPress={handleEditGroup}>
                                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}>
                                    <Ionicons name="create-outline" size={22} color="#00e5ff" />
                                </View>
                                <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Group Info</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                            <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                                <Ionicons name="trash-outline" size={22} color="#3498db" />
                            </View>
                            <Text style={[styles.menuItemText, { color: colors.text }]}>Clear Group Chat</Text>
                        </TouchableOpacity>

                        {isAdmin && (
                            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteGroup}>
                                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
                                    <Ionicons name="ban-outline" size={22} color="#e74c3c" />
                                </View>
                                <Text style={[styles.menuItemText, { color: '#e74c3c' }]}>Delete Group</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            style={[styles.cancelButton, { backgroundColor: colors.background, marginTop: 20 }]} 
                            onPress={() => setShowMenu(false)}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Toast */}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F1014' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        height: 80,
    },
    iconButton: { padding: 8 },
    scrollContent: { paddingHorizontal: 16 },
    portraitSection: { alignItems: 'center', marginTop: 10, marginBottom: 24 },
    avatar: { width: 120, height: 120, borderRadius: 45, backgroundColor: '#1A1B22', marginBottom: 16 },
    nameText: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
    memberCountText: { fontSize: 14, color: '#8A8D9F' },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    actionCard: { width: '23%', height: 75, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { fontSize: 12, fontWeight: '500' },
    sectionHeader: { marginBottom: 12, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    membersBlock: { borderRadius: 20, overflow: 'hidden' },
    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
    memberAvatar: { width: 50, height: 50, borderRadius: 20, marginRight: 12 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: 'bold' },
    memberStatus: { fontSize: 12, color: '#8A8D9F', marginTop: 2 },
    adminBadge: { backgroundColor: 'rgba(0, 229, 255, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    adminBadgeText: { color: '#00e5ff', fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
    menuContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    menuHeader: { alignItems: 'center', marginBottom: 20 },
    menuHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 12 },
    menuTitle: { fontSize: 18, fontWeight: 'bold' },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuItemText: { fontSize: 16, fontWeight: '500' },
    cancelButton: { paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: 'bold' },
    tabContainer: { flexDirection: 'row', marginTop: 24, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabButton: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 },
    gridImage: { width: (width - 40) / 3, height: (width - 40) / 3, margin: 2, borderRadius: 8 },
    noMediaText: { color: '#8A8D9F', textAlign: 'center', marginTop: 32, fontSize: 14, width: '100%' },
    placeholderSection: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    pickerContainer: { flex: 0.8, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pickerTitle: { fontSize: 20, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, height: 44, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
    pickerAvatar: { width: 44, height: 44, borderRadius: 15, marginRight: 12 },
    pickerName: { fontSize: 16, fontWeight: 'bold' },
    pickerEmail: { fontSize: 12, color: '#8A8D9F' },
    toastContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        elevation: 10,
        zIndex: 2000,
    },
    toastText: { fontSize: 14, fontWeight: '500' }
});
