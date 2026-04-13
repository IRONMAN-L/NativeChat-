import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';
import { getTranslation } from '../utils/languages';

const LANGUAGES = [
    { id: 'en', name: 'English', nativeName: 'English' },
    { id: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export default function LanguageSettingsScreen({ navigation }) {
    const { theme, language, setLanguage } = usePreferencesStore();
    const colors = getThemeColors(theme);
    const t = (key) => getTranslation(language, key);

    const handleSelectLanguage = (langId) => {
        setLanguage(langId);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('language')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.description, { color: colors.textMuted }]}>
                    {t('appLanguageDesc')}
                </Text>

                <View style={[styles.listContainer, { backgroundColor: colors.surface }]}>
                    {LANGUAGES.map((lang, index) => {
                        const isSelected = language === lang.id;
                        return (
                            <TouchableOpacity 
                                key={lang.id} 
                                style={[
                                    styles.languageItem, 
                                    index < LANGUAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.background }
                                ]} 
                                onPress={() => handleSelectLanguage(lang.id)}
                            >
                                <View>
                                    <Text style={[styles.languageName, { color: colors.text }]}>{lang.nativeName}</Text>
                                    <Text style={[styles.languageSub, { color: colors.textMuted }]}>{lang.name}</Text>
                                </View>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={24} color="#00e5ff" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
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
        marginBottom: 10,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    description: {
        fontSize: 14,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    listContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    languageName: {
        fontSize: 18,
        fontWeight: '600',
    },
    languageSub: {
        fontSize: 13,
        marginTop: 2,
    }
});
