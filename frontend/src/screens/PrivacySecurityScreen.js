import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, Platform, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';
import { getThemeColors } from '../theme/colors';

export default function PrivacySecurityScreen({ navigation }) {
    const { theme, appLockEnabled, setAppLockEnabled } = usePreferencesStore();
    const { user, token, setupPIN, updatePrivacySettings } = useAuthStore();
    const colors = getThemeColors(theme);
    
    const [pinInput, setPinInput] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    
    // Fallbacks if not immediately populated
    const [readReceipts, setReadReceipts] = useState(user?.readReceipts !== false);
    const [disappearingTimer, setDisappearingTimer] = useState(user?.disappearingTimer || 0);

    const toggleAppLock = (value) => {
        setAppLockEnabled(value);
    };

    const handleReadReceiptsToggle = async (value) => {
        setReadReceipts(value);
        await updatePrivacySettings(token, { readReceipts: value });
    };

    const handleTimerChange = async (hours) => {
        setDisappearingTimer(hours);
        await updatePrivacySettings(token, { disappearingTimer: hours });
    };

    const handleSavePIN = async () => {
        if (pinInput && pinInput.length < 4) {
            Alert.alert("Error", "PIN must be at least 4 digits");
            return;
        }
        const success = await setupPIN(token, pinInput);
        if (success) {
            Alert.alert("Success", pinInput ? "Two-Step Verification Enabled" : "Two-Step Verification Disabled");
            setIsSettingPin(false);
            setPinInput('');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Security</Text>
            </View>

            <ScrollView>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>App Security</Text>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="finger-print" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Fingerprint / FaceID Lock</Text>
                        </View>
                        <Switch
                            value={appLockEnabled}
                            onValueChange={toggleAppLock}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                        />
                    </View>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>Requires local authentication to open the application.</Text>
                </View>

                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Account Security</Text>
                    <TouchableOpacity style={styles.row} onPress={() => setIsSettingPin(!isSettingPin)}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="keypad" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Two-Step Verification PIN</Text>
                        </View>
                        <Ionicons name={isSettingPin ? "chevron-down" : "chevron-forward"} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    
                    {isSettingPin && (
                        <View style={styles.pinConfigContainer}>
                            <Text style={[styles.helperText, { color: colors.textMuted, marginTop: 0 }]}>
                                Add a PIN to prevent hackers from logging in even if they steal your Email OTP. Leave blank to disable.
                            </Text>
                            <View style={styles.pinInputRow}>
                                <TextInput
                                    style={[styles.pinInput, { color: colors.text, borderColor: colors.primary }]}
                                    placeholder="Enter 4-6 digit PIN"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    secureTextEntry
                                    value={pinInput}
                                    onChangeText={setPinInput}
                                />
                                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSavePIN}>
                                    <Text style={styles.saveBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Privacy Control</Text>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="checkmark-done" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Read Receipts</Text>
                        </View>
                        <Switch
                            value={readReceipts}
                            onValueChange={handleReadReceiptsToggle}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                        />
                    </View>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>If turned off, you won't send or receive blue ticks.</Text>
                    
                    <View style={styles.divider} />

                    <View style={styles.timerContainer}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="timer" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Default Disappearing Timer</Text>
                        </View>
                        <View style={styles.timerOptions}>
                            {[
                                { label: 'Off', val: 0 },
                                { label: '24h', val: 24 },
                                { label: '7 Days', val: 168 }
                            ].map((opt) => (
                                <TouchableOpacity 
                                    key={opt.val} 
                                    style={[
                                        styles.timerChip, 
                                        { backgroundColor: disappearingTimer === opt.val ? colors.primary : colors.background }
                                    ]}
                                    onPress={() => handleTimerChange(opt.val)}
                                >
                                    <Text style={{ color: disappearingTimer === opt.val ? '#fff' : colors.text }}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
                
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                     <TouchableOpacity style={styles.row} onPress={() => Alert.alert("Key", user.publicKey)}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="shield-checkmark" size={24} color={colors.text} style={styles.icon} />
                            <Text style={[styles.rowText, { color: colors.text }]}>Verify Cryptographic Keys</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', height: Platform.OS === 'android' ? 80 : 60, paddingTop: Platform.OS === 'android' ? 30 : 0, paddingHorizontal: 16, marginBottom: 20 },
    backButton: { padding: 8, marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    section: { marginBottom: 20, paddingBottom: 8 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 20 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    icon: { marginRight: 16, width: 24 },
    rowText: { fontSize: 16, fontWeight: '500' },
    helperText: { fontSize: 12, paddingHorizontal: 20, paddingBottom: 12 },
    pinConfigContainer: { paddingHorizontal: 20, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 12 },
    pinInputRow: { flexDirection: 'row', alignItems: 'center' },
    pinInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40, marginRight: 12 },
    saveBtn: { paddingHorizontal: 16, height: 40, justifyContent: 'center', borderRadius: 8 },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginHorizontal: 20 },
    timerContainer: { paddingVertical: 12, paddingHorizontal: 20 },
    timerOptions: { flexDirection: 'row', marginTop: 12, marginLeft: 40 },
    timerChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginRight: 12 }
});
