import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Platform, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function GroupProfileScreen({ route, navigation }) {
    const { groupId, groupName } = route.params;
    const [showMenu, setShowMenu] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', icon: 'notifications' });

    const { messages, groups, updateGroupInfo, addMembersToGroup, leaveGroup, clearGroupMessages } = useChatStore();
    const { user, token } = useAuthStore();
    const { theme } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const group = groups.find(g => (g.id || g._id) === groupId);
    const isAdmin = group?.adminIds?.includes(user.id);

    // Sort members: current user first (?), then admins, then others
    const sortedMembers = [...(group?.memberIds || [])].sort((a, b) => {
        const aIsAdmin = group.adminIds.includes(a._id || a.id);
        const bIsAdmin = group.adminIds.includes(b._id || b.id);
        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;
        return 0;
    });

    const triggerToast = (msg, icon = 'notifications') => {
        setToast({ visible: true, message: msg, icon });
        setTimeout(() => setToast({ visible: false, message: '', icon: 'notifications' }), 3000);
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

    const handleAddMember = () => {
        if (!isAdmin) {
            alert("Only admins can add members.");
            return;
        }
        // In a real app, this would navigate to a contact picker
        // For now, let's show a placeholder alert
        alert("Member picker coming soon!");
    };

    const handleClearChat = () => {
        setShowMenu(false);
        Alert.alert(
            "Clear Chat",
            "This will delete all messages in this group. Action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", onPress: () => clearGroupMessages(token, groupId), style: 'destructive' }
            ]
        );
    };

    const handleEditGroup = () => {
        setShowMenu(false);
        if (!isAdmin) return;
        
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
    };

    const ACTIONS = [
        { icon: 'person-add', label: 'Add', onPress: handleAddMember, color: '#00e5ff' },
        { icon: 'log-out', label: 'Leave', onPress: handleLeave, color: '#ff4081' },
        { icon: 'notifications', label: 'Mute', onPress: () => triggerToast("Mute coming soon"), color: '#8A8D9F' },
        { icon: 'share-social', label: 'Share', onPress: () => triggerToast("Sharing coming soon"), color: '#8A8D9F' }
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

                <View style={{ height: 40 }} />
            </ScrollView>

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
                    <Ionicons name={toast.icon} size={20} color="#00e5ff" style={{ marginRight: 10 }} />
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
