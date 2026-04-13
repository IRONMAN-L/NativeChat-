import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';

export default function CreateGroupScreen({ navigation }) {
    const [groupName, setGroupName] = useState('');
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const { friends, createGroup } = useChatStore();
    const { token } = useAuthStore();
    const { theme } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const toggleFriendSelection = (id) => {
        if (selectedFriendIds.includes(id)) {
            setSelectedFriendIds(selectedFriendIds.filter(friendId => friendId !== id));
        } else {
            setSelectedFriendIds([...selectedFriendIds, id]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert("Please enter a group name");
            return;
        }
        if (selectedFriendIds.length === 0) {
            alert("Please select at least one friend to add to the group");
            return;
        }

        const newGroup = await createGroup(token, groupName, selectedFriendIds);
        if (newGroup) {
            navigation.replace('GroupChat', {
                groupId: newGroup._id,
                groupName: newGroup.name,
            });
        } else {
            alert("Failed to create group");
        }
    };

    const renderFriendItem = ({ item }) => {
        const isSelected = selectedFriendIds.includes(item._id || item.id);
        return (
            <TouchableOpacity 
                style={[styles.friendItem, { backgroundColor: colors.surfaceHighlight }]} 
                onPress={() => toggleFriendSelection(item._id || item.id)}
            >
                <Image 
                    source={{ uri: item.profilePicture || `https://i.pravatar.cc/150?u=${item._id || item.id}` }} 
                    style={styles.avatar} 
                />
                <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{item.displayName || item.username}</Text>
                    <Text style={[styles.friendEmail, { color: colors.textMuted }]}>{item.email}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Group Name"
                placeholderTextColor={colors.textMuted}
                value={groupName}
                onChangeText={setGroupName}
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Members</Text>
            
            <FlatList
                data={friends}
                keyExtractor={(item) => item._id || item.id}
                renderItem={renderFriendItem}
                style={styles.list}
            />

            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                <LinearGradient colors={['#00e5ff', '#3d5afe']} style={styles.createButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.createButtonText}>Create Group</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    list: {
        flex: 1,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    friendEmail: {
        fontSize: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#4CAF50',
    },
    checkboxTick: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    createButton: {
        marginTop: 16,
        marginBottom: 32,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    },
    createButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
