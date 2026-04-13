import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';

export default function ChatSettingsScreen({ navigation }) {
    const { theme, toggleTheme, chatWallpaper, setChatWallpaper, removeChatWallpaper } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const handlePickWallpaper = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setChatWallpaper(result.assets[0].uri);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chat Settings</Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <Ionicons name="moon" size={24} color={colors.primary} style={styles.icon} />
                        <Text style={[styles.rowText, { color: colors.text }]}>Night Mode</Text>
                    </View>
                    <Switch
                        value={theme === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                    />
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <TouchableOpacity style={styles.row} onPress={handlePickWallpaper}>
                    <View style={styles.rowLeft}>
                        <Ionicons name="image" size={24} color={colors.primary} style={styles.icon} />
                        <Text style={[styles.rowText, { color: colors.text }]}>Change Chat Wallpaper</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                
                {chatWallpaper && (
                    <View style={styles.wallpaperPreviewContainer}>
                        <Image source={{ uri: chatWallpaper }} style={styles.wallpaperPreview} />
                        <TouchableOpacity style={styles.removeWallpaperBtn} onPress={removeChatWallpaper}>
                            <Text style={styles.removeWallpaperText}>Remove Wallpaper</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        height: Platform.OS === 'android' ? 80 : 60,
        paddingTop: Platform.OS === 'android' ? 30 : 0,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 16,
    },
    rowText: {
        fontSize: 16,
        fontWeight: '500',
    },
    wallpaperPreviewContainer: {
        padding: 20,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
    },
    wallpaperPreview: {
        width: 150,
        height: 250,
        borderRadius: 12,
        marginBottom: 16,
    },
    removeWallpaperBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    removeWallpaperText: {
        color: '#e74c3c',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
