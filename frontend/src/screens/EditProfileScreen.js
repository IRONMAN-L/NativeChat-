import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

import { API_URL } from '../config';

export default function EditProfileScreen({ navigation }) {
    const { user, token, updateProfile, isLoading } = useAuthStore();
    
    const [username, setUsername] = useState(user?.username || user?.displayName || '');
    const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
    const [isUploading, setIsUploading] = useState(false);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square aspect ratio for avatars
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri) => {
        setIsUploading(true);
        const fileName = uri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(fileName);
        const type = match ? `image/${match[1]}` : `image`;

        const formData = new FormData();
        formData.append('media', { uri, name: fileName, type });

        try {
            const res = await axios.post(`${API_URL}/uploads`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}` 
                }
            });
            // We got the URL from backend
            setProfilePicture(res.data.fileUrl);
        } catch (error) {
            console.error('Upload failed:', error);
            Alert.alert('Upload Error', 'Failed to upload profile picture');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!username.trim()) {
            Alert.alert('Validation Error', 'Username cannot be empty');
            return;
        }

        const success = await updateProfile(token, {
            username: username.trim(),
            displayName: username.trim(),
            profilePicture: profilePicture
        });

        if (success) {
            Alert.alert('Success', 'Profile updated successfully!');
            navigation.goBack();
        } else {
            Alert.alert('Error', 'Failed to save profile. Try again.');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <LinearGradient
                            colors={['#00e5ff', '#b388ff']}
                            style={styles.avatarGradient}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <Image 
                                source={{ uri: profilePicture || `https://i.pravatar.cc/150?u=${user?.id}` }} 
                                style={styles.avatarImage} 
                            />
                        </LinearGradient>
                        <TouchableOpacity style={styles.editIconWrapper} onPress={handlePickImage} disabled={isUploading}>
                            {isUploading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="camera" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.emailText}>{user?.email}</Text>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.label}>DISPLAY NAME / USERNAME</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Choose a cool username"
                        placeholderTextColor="#8A8D9F"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="words"
                    />

                    <Text style={styles.helpText}>
                        This is the name your friends will see on their Active Now and Recent Messages lists.
                    </Text>

                    <TouchableOpacity 
                        style={styles.saveBtnContainer} 
                        onPress={handleSave}
                        disabled={isLoading || isUploading}
                    >
                        <LinearGradient
                            colors={['#00e5ff', '#3d5afe']}
                            style={styles.saveBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Profile</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
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
        padding: 24,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 120,
        height: 120,
        borderRadius: 48, // Squircle logic
        justifyContent: 'center',
        alignItems: 'center',
        padding: 3,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
    },
    editIconWrapper: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3d5afe',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#0F1014',
    },
    emailText: {
        color: '#8A8D9F',
        fontSize: 14,
    },
    formSection: {
        flex: 1,
    },
    label: {
        color: '#8A8D9F',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#1A1B22',
        color: '#FFF',
        fontSize: 16,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    helpText: {
        color: '#666',
        fontSize: 12,
        marginBottom: 32,
    },
    saveBtnContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        padding: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
