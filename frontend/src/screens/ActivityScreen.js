import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallStore } from '../store/callStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function ActivityScreen({ navigation }) {
    const { callHistory, callUser } = useCallStore();
    const { theme } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const renderCallIcon = (direction, status) => {
        if (status === 'Missed') return <Ionicons name="call-outline" size={20} color="#ff4081" />;
        if (direction === 'Incoming') return <Ionicons name="arrow-down-outline" size={16} color="#00E676" />;
        return <Ionicons name="arrow-up-outline" size={16} color="#00e5ff" />;
    };

    const handleCallback = async (item) => {
        const { isWebRTCSupported } = useCallStore.getState();
        if (!isWebRTCSupported) {
            alert("Video Calling requires a Standalone APK!");
            return;
        }
        await callUser(item.friendId, item.name, item.type);
        navigation.navigate('Call');
    };

    const renderItem = ({ item }) => {
        const date = new Date(item.timestamp);
        const timeStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

        return (
            <View style={[styles.callCard, { backgroundColor: colors.surface }]}>
                <View style={styles.iconContainer}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: item.status === 'Missed' ? 'rgba(255, 64, 129, 0.1)' : 'rgba(0, 229, 255, 0.1)' }]}>
                        <Ionicons 
                            name={item.type === 'Video' ? "videocam" : "call"} 
                            size={22} 
                            color={item.status === 'Missed' ? "#ff4081" : "#00e5ff"} 
                        />
                    </View>
                </View>

                <View style={styles.callDetails}>
                    <Text style={[styles.callerName, { color: colors.text }]}>{item.name}</Text>
                    <View style={styles.statusRow}>
                        {renderCallIcon(item.direction, item.status)}
                        <Text style={[styles.callStatus, { color: item.status === 'Missed' ? '#ff4081' : colors.textMuted }]}>
                            {item.direction} • {timeStr}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.callbackBtn}
                    onPress={() => handleCallback(item)}
                >
                    <Ionicons name="repeat" size={24} color="#00e5ff" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Recent Calls</Text>
            </View>

            <FlatList
                data={callHistory}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="call-outline" size={64} color="#333" />
                        <Text style={styles.emptyText}>No recent calls</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    callCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        marginRight: 16,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    callDetails: {
        flex: 1,
    },
    callerName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    callStatus: {
        fontSize: 12,
        marginLeft: 6,
    },
    callbackBtn: {
        padding: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#666',
        marginTop: 16,
        fontSize: 16,
    }
});
