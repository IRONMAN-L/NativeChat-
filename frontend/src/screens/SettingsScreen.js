import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';
import { getTranslation } from '../utils/languages';

const SETTINGS_OPTIONS = [
    { id: '1', title: 'Account', subtitle: 'Number, Username, Bio', icon: 'person', color: '#3498db' },
    { id: '2', title: 'Chat Settings', subtitle: 'Wallpaper, Night Mode, Animations', icon: 'chatbubble-ellipses', color: '#f39c12' },
    { id: '3', title: 'Privacy & Security', subtitle: 'Last Seen, Devices, Passkeys', icon: 'lock-closed', color: '#2ecc71' },
    { id: '4', title: 'Notifications', subtitle: 'Sounds, Calls, Badges', icon: 'volume-high', color: '#e74c3c' },
    { id: '5', title: 'Data and Storage', subtitle: 'Media download settings', icon: 'pie-chart', color: '#3498db' },
    { id: '6', title: 'Chat Folders', subtitle: 'Sort chats into folders', icon: 'folder', color: '#1abc9c' },
    { id: '7', title: 'Devices', subtitle: 'Manage connected devices', icon: 'laptop', color: '#00e5ff' },
    { id: '8', title: 'Power Saving', subtitle: 'Reduce power usage on low charge', icon: 'battery-half', color: '#e67e22' },
    { id: '9', title: 'Language', subtitle: 'Customize app language', icon: 'globe', color: '#b388ff' },
];

export default function SettingsScreen({ navigation }) {
    const { user, signOut } = useAuthStore();
    const { disconnectSocket } = useChatStore();
    const { theme, language } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const t = (key) => getTranslation(language, key);

    const SETTINGS_OPTIONS = [
        { id: '1', title: t('account'), subtitle: 'Number, Username, Bio', icon: 'person', color: '#3498db' },
        { id: '2', title: t('chatSettings'), subtitle: 'Wallpaper, Night Mode, Animations', icon: 'chatbubble-ellipses', color: '#f39c12' },
        { id: '3', title: t('privacySecurity'), subtitle: 'Last Seen, Devices, Passkeys', icon: 'lock-closed', color: '#2ecc71' },
        { id: '4', title: t('notifications'), subtitle: 'Sounds, Calls, Badges', icon: 'volume-high', color: '#e74c3c' },
        { id: '9', title: t('language'), subtitle: 'Customize app language', icon: 'globe', color: '#b388ff' },
    ];

    const handleLogout = () => {
        disconnectSocket();
        signOut();
    };

    const confirmLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to exit your active session?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: handleLogout, style: "destructive" }
            ]
        );
    };

    const handleOptionPress = (item) => {
        if (item.title === t('chatSettings')) {
            navigation.navigate('ChatSettings');
        } else if (item.title === t('privacySecurity')) {
            navigation.navigate('PrivacySecurity');
        } else if (item.title === t('language')) {
            navigation.navigate('LanguageSettings');
        } else if (item.title === t('account')) {
            navigation.navigate('AccountSettings');
        } else {
            Alert.alert(item.title, 'Configuration coming soon!');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="search" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon} onPress={confirmLogout}>
                        <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: user?.profilePicture || `https://i.pravatar.cc/150?u=${user?.id || 'me'}` }} 
                            style={styles.avatar} 
                        />
                        <TouchableOpacity style={styles.cameraBadge} onPress={() => navigation.navigate('EditProfile')}>
                            <Ionicons name="camera" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.nameText, { color: colors.text }]}>{user?.displayName || user?.username || 'User'}</Text>
                    <Text style={styles.phoneText}>{user?.email}</Text>
                </View>

                <View style={[styles.optionsContainer, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('AccountSettings')}>
                        <View style={[styles.optionIconContainer, { backgroundColor: '#3498db' }]}>
                            <Ionicons name="person" size={20} color="#FFF" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('account')}</Text>
                            <Text style={styles.optionSubtitle}>Email, Username, Bio</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ marginRight: 16 }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('ChatSettings')}>
                        <View style={[styles.optionIconContainer, { backgroundColor: '#f39c12' }]}>
                            <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('chatSettings')}</Text>
                            <Text style={styles.optionSubtitle}>Wallpaper, Night Mode</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('PrivacySecurity')}>
                        <View style={[styles.optionIconContainer, { backgroundColor: '#2ecc71' }]}>
                            <Ionicons name="lock-closed" size={20} color="#FFF" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('privacySecurity')}</Text>
                            <Text style={styles.optionSubtitle}>2FA, App Lock, Disappearing</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('NotificationSettings')}>
                        <View style={[styles.optionIconContainer, { backgroundColor: '#e74c3c' }]}>
                            <Ionicons name="notifications" size={20} color="#FFF" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('notifications')}</Text>
                            <Text style={styles.optionSubtitle}>Sounds, Previews, Alerts</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('LanguageSettings')}>
                        <View style={[styles.optionIconContainer, { backgroundColor: '#b388ff' }]}>
                            <Ionicons name="globe" size={20} color="#FFF" />
                        </View>
                        <View style={[styles.optionTextContainer, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('language')}</Text>
                            <Text style={styles.optionSubtitle}>English, Telugu, Hindi</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.optionsContainer, { backgroundColor: colors.surface, paddingVertical: 12, alignItems: 'center' }]} onPress={confirmLogout}>
                    <Text style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }}>{t('logout')}</Text>
                </TouchableOpacity>
                
                {/* Extra padding for tab bar safely rendering below */}
                <View style={{ height: 20 }} />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014', // Base chat theme background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        height: 80,
    },
    headerSpacer: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginLeft: 20,
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1A1B22',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3498db',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#0F1014', // Cuts a rim around the badge against background
    },
    nameText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 6,
    },
    phoneText: {
        fontSize: 14,
        color: '#8A8D9F',
    },
    optionsContainer: {
        backgroundColor: '#1A1B22',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
    },
    optionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionTextContainer: {
        flex: 1,
        paddingVertical: 14,
        paddingRight: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
    },
    optionTitle: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: 13,
        color: '#8A8D9F',
    }
});
