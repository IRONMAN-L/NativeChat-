import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, Platform, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';
import { getThemeColors } from '../theme/colors';

export default function PrivacySecurityScreen({ navigation }) {
    const { theme, appLockEnabled, setAppLockEnabled } = usePreferencesStore();
    const { user, token, setupPIN, updatePrivacySettings } = useAuthStore();
    const colors = getThemeColors(theme);
    
    // Sync local state with store/server data
    const [readReceipts, setReadReceipts] = useState(user?.readReceipts !== false);
    const [disappearingTimer, setDisappearingTimer] = useState(user?.disappearingTimer || 0);
    const [pinInput, setPinInput] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [saving, setSaving] = useState(null); // 'receipts', 'timer', 'pin', 'lock'

    // Update local state if user object changes (sync fix)
    useEffect(() => {
        if (user) {
            setReadReceipts(user.readReceipts !== false);
            setDisappearingTimer(user.disappearingTimer || 0);
        }
    }, [user]);

    const toggleAppLock = async (value) => {
        setSaving('lock');
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isSupported = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isSupported) {
                Alert.alert("Not Supported", "Your device does not support biometric authentication or no fingerprints are enrolled.");
                setSaving(null);
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: value ? 'Enable App Lock' : 'Disable App Lock',
                fallbackLabel: 'Use Passcode'
            });

            if (result.success) {
                setAppLockEnabled(value);
                Alert.alert("Success", value ? "App Lock enabled" : "App Lock disabled");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(null);
        }
    };

    const handleReadReceiptsToggle = async (value) => {
        setSaving('receipts');
        setReadReceipts(value); // Optimistic update
        const success = await updatePrivacySettings(token, { readReceipts: value });
        if (!success) {
            setReadReceipts(!value); // Rollback
            Alert.alert("Error", "Failed to update read receipts");
        }
        setSaving(null);
    };

    const handleTimerChange = async (hours) => {
        setSaving('timer');
        setDisappearingTimer(hours);
        const success = await updatePrivacySettings(token, { disappearingTimer: hours });
        if (!success) {
            Alert.alert("Error", "Failed to update disappearing timer");
        }
        setSaving(null);
    };

    const handleSavePIN = async () => {
        if (pinInput && pinInput.length < 4) {
            Alert.alert("Error", "PIN must be at least 4 digits");
            return;
        }
        setSaving('pin');
        const success = await setupPIN(token, pinInput);
        if (success) {
            Alert.alert("Success", pinInput ? "Two-Step Verification Enabled" : "Two-Step Verification Disabled");
            setIsSettingPin(false);
            setPinInput('');
        }
        setSaving(null);
    };

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Security</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {renderHeader()}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>App Security</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="finger-print" size={24} color={colors.text} style={styles.icon} />
                            <View>
                                <Text style={[styles.rowText, { color: colors.text }]}>Fingerprint / FaceID Lock</Text>
                                <Text style={[styles.statusSubtext, { color: appLockEnabled ? '#00E676' : colors.textMuted }]}>
                                    {appLockEnabled ? 'Currently Protected' : 'Disabled'}
                                </Text>
                            </View>
                        </View>
                        {saving === 'lock' ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Switch
                                value={appLockEnabled}
                                onValueChange={toggleAppLock}
                                trackColor={{ false: '#333', true: colors.primary }}
                                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                            />
                        )}
                    </View>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>Requires local authentication to open the application.</Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Account Security</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity style={styles.row} onPress={() => setIsSettingPin(!isSettingPin)}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="keypad" size={24} color={colors.text} style={styles.icon} />
                            <View>
                                <Text style={[styles.rowText, { color: colors.text }]}>Two-Step Verification PIN</Text>
                                <Text style={[styles.statusSubtext, { color: user?.isTwoStepSet ? '#00E676' : colors.textMuted }]}>
                                    {user?.isTwoStepSet ? 'Status: Active' : 'Status: Off'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name={isSettingPin ? "chevron-down" : "chevron-forward"} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    
                    {isSettingPin && (
                        <View style={styles.pinConfigContainer}>
                            <Text style={[styles.helperText, { color: colors.textMuted, marginTop: 0 }]}>
                                Add a PIN to prevent unauthorized logins. Leave blank to disable.
                            </Text>
                            <View style={styles.pinInputRow}>
                                <TextInput
                                    style={[styles.pinInput, { color: colors.text, borderColor: colors.primary }]}
                                    placeholder="4-6 digit PIN"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    secureTextEntry
                                    value={pinInput}
                                    onChangeText={setPinInput}
                                />
                                <TouchableOpacity 
                                    style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
                                    onPress={handleSavePIN}
                                    disabled={saving === 'pin'}
                                >
                                    {saving === 'pin' ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Privacy Control</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="checkmark-done" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Read Receipts</Text>
                        </View>
                        {saving === 'receipts' ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Switch
                                value={readReceipts}
                                onValueChange={handleReadReceiptsToggle}
                                trackColor={{ false: '#333', true: colors.primary }}
                                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                            />
                        )}
                    </View>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>If turned off, others won't see blue ticks when you read messages.</Text>
                    
                    <View style={styles.divider} />

                    <View style={styles.timerContainer}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="timer" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Disappearing Messages</Text>
                        </View>
                        <View style={styles.timerOptions}>
                            {[
                                { label: 'Off', val: 0 },
                                { label: '24h', val: 24 },
                                { label: '7d', val: 168 }
                            ].map((opt) => (
                                <TouchableOpacity 
                                    key={opt.val} 
                                    style={[
                                        styles.timerChip, 
                                        { backgroundColor: disappearingTimer === opt.val ? colors.primary : colors.background }
                                    ]}
                                    onPress={() => handleTimerChange(opt.val)}
                                    disabled={saving === 'timer'}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {saving === 'timer' && disappearingTimer === opt.val && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />}
                                        <Text style={{ color: disappearingTimer === opt.val ? '#fff' : colors.text, fontWeight: 'bold' }}>{opt.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
                
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Cryptography</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                     <TouchableOpacity style={styles.row} onPress={() => Alert.alert("My Public Key (Curve25519)", user?.publicKey || 'No key generated')}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="shield-checkmark" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Verify Signal Keys</Text>
                        </View>
                        <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>Your unique key used for end-to-end encryption.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', height: Platform.OS === 'android' ? 90 : 70, paddingTop: Platform.OS === 'android' ? 30 : 10, paddingHorizontal: 16, marginBottom: 10 },
    backButton: { padding: 8, marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    scrollContent: { paddingBottom: 40 },
    section: { marginBottom: 10, paddingBottom: 8 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    icon: { marginRight: 16, width: 24 },
    rowText: { fontSize: 16, fontWeight: 'bold' },
    statusSubtext: { fontSize: 12, marginTop: 2 },
    helperText: { fontSize: 12, paddingHorizontal: 20, paddingBottom: 12, lineHeight: 18 },
    pinConfigContainer: { paddingHorizontal: 20, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.05)', paddingTop: 12 },
    pinInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    pinInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 48, marginRight: 12 },
    saveBtn: { paddingHorizontal: 20, height: 48, justifyContent: 'center', borderRadius: 12 },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.05)', marginHorizontal: 20 },
    timerContainer: { paddingVertical: 15, paddingHorizontal: 20 },
    timerOptions: { flexDirection: 'row', marginTop: 15, marginLeft: 40 },
    timerChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 12, minWidth: 60, alignItems: 'center' }
});
