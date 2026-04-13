import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '../store/preferencesStore';

let Notifications = null;
try {
    Notifications = require('expo-notifications');
} catch (e) {
    console.log("Notifications not supported in this environment");
}

export default function NotificationSettingsScreen({ navigation }) {
    const {
        notificationsEnabled,
        showPreviews,
        notificationSounds,
        vibrationEnabled,
        setNotificationsEnabled,
        setShowPreviews,
        setNotificationSounds,
        setVibrationEnabled,
        activeReminders,
        removeReminder
    } = usePreferencesStore();

    const triggerTestNotification = async () => {
        if (!notificationsEnabled || !Notifications) return;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Test Notification 🔔",
                body: showPreviews ? "This is a test notification from NativeChat." : "New Message",
                sound: notificationSounds,
            },
            trigger: null, // Send immediately
        });
    };

    const handleCancelReminder = async (notificationId) => {
        if (Notifications) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
        removeReminder(notificationId);
    };

    const formatTimeRemaining = (targetTimeStr) => {
        const target = new Date(targetTimeStr);
        const diff = target.getTime() - Date.now();
        if (diff <= 0) return 'Just now';
        
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `in ${mins}m`;
        return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const SettingRow = ({ icon, title, description, value, onToggle, disabled = false }) => (
        <View style={[styles.settingRow, disabled && { opacity: 0.5 }]}>
            <View style={styles.iconWrapper}>
                <Ionicons name={icon} size={22} color="#FFF" />
            </View>
            <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{title}</Text>
                {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#333', true: '#3d5afe' }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : value ? '#00e5ff' : '#666'}
                disabled={disabled}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>GENERAL</Text>
                <SettingRow
                    icon="notifications"
                    title="Allow Notifications"
                    description="Enable or disable all alerts from NativeChat"
                    value={notificationsEnabled}
                    onToggle={setNotificationsEnabled}
                />

                <Text style={styles.sectionTitle}>PRIVACY</Text>
                <SettingRow
                    icon="eye"
                    title="Show Previews"
                    description="Show message text in banners"
                    value={showPreviews}
                    onToggle={setShowPreviews}
                    disabled={!notificationsEnabled}
                />

                <Text style={styles.sectionTitle}>ALERTS</Text>
                <SettingRow
                    icon="volume-high"
                    title="Sounds"
                    value={notificationSounds}
                    onToggle={setNotificationSounds}
                    disabled={!notificationsEnabled}
                />
                <SettingRow
                    icon="pulse"
                    title="Vibration"
                    value={vibrationEnabled}
                    onToggle={setVibrationEnabled}
                    disabled={!notificationsEnabled}
                />

                <View style={styles.testSection}>
                    <TouchableOpacity 
                        style={[styles.testBtn, !notificationsEnabled && styles.testBtnDisabled]} 
                        onPress={triggerTestNotification}
                        disabled={!notificationsEnabled}
                    >
                        <Ionicons name="send" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.testBtnText}>Send Test Notification</Text>
                    </TouchableOpacity>
                    <Text style={styles.helpText}>
                        Use this to verify your alert settings are working correctly on your device.
                    </Text>
                </View>

                {activeReminders?.length > 0 && (
                    <View style={{ marginTop: 32, paddingBottom: 40 }}>
                        <Text style={styles.sectionTitle}>ACTIVE REPLY REMINDERS</Text>
                        {activeReminders.map((reminder) => (
                            <View key={reminder.notificationId} style={styles.reminderCard}>
                                <View style={styles.reminderInfo}>
                                    <Text style={styles.reminderFriend}>{reminder.friendName}</Text>
                                    <Text style={styles.reminderPreview} numberOfLines={1}>"{reminder.messagePreview}"</Text>
                                    <Text style={styles.reminderTime}>Alerting {formatTimeRemaining(reminder.targetTime)}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.cancelBtn} 
                                    onPress={() => handleCancelReminder(reminder.notificationId)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        color: '#444',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
        letterSpacing: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1B22',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#2A2B32',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    settingDescription: {
        color: '#8A8D9F',
        fontSize: 12,
        marginTop: 2,
    },
    testSection: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: 40,
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3d5afe',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        shadowColor: '#3d5afe',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    testBtnDisabled: {
        backgroundColor: '#333',
        shadowOpacity: 0,
    },
    testBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    helpText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 40,
    },
    reminderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1B22',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    reminderInfo: {
        flex: 1,
    },
    reminderFriend: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    reminderPreview: {
        color: '#8A8D9F',
        fontSize: 14,
        marginTop: 2,
    },
    reminderTime: {
        color: '#00e5ff',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
    },
    cancelBtn: {
        padding: 8,
    }
});
