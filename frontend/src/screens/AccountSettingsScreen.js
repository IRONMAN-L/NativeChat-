import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemeColors } from '../theme/colors';

export default function AccountSettingsScreen({ navigation }) {
    const { user, token, updateProfile, requestEmailChange, verifyEmailChange, deleteAccount } = useAuthStore();
    const { theme } = usePreferencesStore();
    const colors = getThemeColors(theme);

    const [modalVisible, setModalVisible] = useState(null); // 'username', 'displayName', 'bio', 'email'
    const [inputValue, setInputValue] = useState('');
    const [otpValue, setOtpValue] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const openModal = (type, currentVal) => {
        setModalVisible(type);
        setInputValue(currentVal || '');
        setIsOtpSent(false);
    };

    const handleUpdateProfile = async () => {
        // Only displayName is strictly required
        if (modalVisible === 'displayName' && !inputValue.trim()) {
            Alert.alert("Error", "Display name cannot be empty");
            return;
        }
        setLoading(true);
        const updates = { [modalVisible]: inputValue.trim() };
        const success = await updateProfile(token, updates);
        setLoading(false);
        if (success) {
            setModalVisible(null);
        } else {
            Alert.alert("Error", "Failed to update profile");
        }
    };

    const handleEmailRequest = async () => {
        if (!inputValue.trim()) return;
        setLoading(true);
        const success = await requestEmailChange(token, inputValue.trim());
        setLoading(false);
        if (success) {
            setIsOtpSent(true);
        }
    };

    const handleEmailVerify = async () => {
        if (!otpValue.trim()) return;
        setLoading(true);
        const success = await verifyEmailChange(token, otpValue.trim());
        setLoading(false);
        if (success) {
            setModalVisible(null);
            Alert.alert("Success", "Email updated successfully");
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            "Delete Account",
            "This action is PERMANENT. All your messages, media, and encryption keys will be wiped from our servers forever. Are you absolutely sure?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete Forever", 
                    style: "destructive", 
                    onPress: async () => {
                        const success = await deleteAccount(token);
                        if (!success) Alert.alert("Error", "Deletion failed. Try again later.");
                    }
                }
            ]
        );
    };

    const renderOption = (id, label, value, icon, color) => (
        <TouchableOpacity style={styles.optionRow} onPress={() => openModal(id, value)}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Ionicons name={icon} size={20} color="#FFF" />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.labelText, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.valueText, { color: colors.text }]}>{value || 'Not set'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Account Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Identity</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    {renderOption('displayName', 'Display Name', user?.displayName, 'person-outline', '#3498db')}
                    {renderOption('username', 'Username', user?.username ? `@${user.username}` : null, 'at-outline', '#9b59b6')}
                    {renderOption('bio', 'Bio', user?.bio, 'information-circle-outline', '#1abc9c')}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Security & Data</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    {renderOption('email', 'Email Address', user?.email, 'mail-outline', '#e67e22')}
                    
                    <TouchableOpacity style={styles.optionRow}>
                        <View style={[styles.iconContainer, { backgroundColor: '#34495e' }]}>
                            <Ionicons name="download-outline" size={20} color="#FFF" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.labelText, { color: colors.textMuted }]}>Request Account Info</Text>
                            <Text style={[styles.valueText, { color: colors.text }]}>Generate data report</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>Danger Zone</Text>
                <TouchableOpacity 
                    style={[styles.deleteButton, { backgroundColor: colors.surface }]}
                    onPress={confirmDelete}
                >
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                </TouchableOpacity>
                <Text style={styles.disclaimerText}>
                    Deleting your account is irreversible. All messages and media shared with others will no longer be associated with you.
                </Text>
            </ScrollView>

            {/* Editing Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible !== null}
                onRequestClose={() => setModalVisible(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {modalVisible === 'email' ? 'Change Email' : `Edit ${modalVisible}`}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(null)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {modalVisible === 'email' && isOtpSent ? (
                            <View style={styles.emailFlow}>
                                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Enter the 6-digit OTP sent to {inputValue}</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: colors.text, borderColor: colors.primary }]}
                                    placeholder="OTP"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    value={otpValue}
                                    onChangeText={setOtpValue}
                                />
                                <TouchableOpacity 
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={handleEmailVerify}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Verify & Update</Text>}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                                    {modalVisible === 'email' ? 'Enter new email address' : `Enter your new ${modalVisible}`}
                                </Text>
                                <TextInput
                                    style={[styles.modalInput, { color: colors.text, borderColor: colors.primary }]}
                                    placeholder={`New ${modalVisible}`}
                                    placeholderTextColor={colors.textMuted}
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    autoFocus
                                    multiline={modalVisible === 'bio'}
                                />
                                <TouchableOpacity 
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={modalVisible === 'email' ? handleEmailRequest : handleUpdateProfile}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{modalVisible === 'email' ? 'Send OTP' : 'Save Changes'}</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        height: Platform.OS === 'android' ? 90 : 70, 
        paddingTop: Platform.OS === 'android' ? 30 : 10,
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 2 
    },
    backButton: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    scrollContent: { paddingVertical: 20 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 10, marginTop: 20 },
    section: { marginBottom: 10, overflow: 'hidden' },
    optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.05)' },
    iconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    textContainer: { flex: 1 },
    labelText: { fontSize: 12, marginBottom: 2 },
    valueText: { fontSize: 16, fontWeight: '500' },
    deleteButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, marginTop: 10 },
    deleteButtonText: { color: '#e74c3c', fontSize: 16, fontWeight: 'bold', marginLeft: 15 },
    disclaimerText: { fontSize: 12, color: '#8A8D9F', paddingHorizontal: 20, marginTop: 10, lineHeight: 18 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalLabel: { fontSize: 14, marginBottom: 15 },
    modalInput: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24, minHeight: 50 },
    saveButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    emailFlow: { width: '100%' }
});
