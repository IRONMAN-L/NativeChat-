import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';

export default function VerifyOTPScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const { verifyOTP, isLoading, error, clearError } = useAuthStore();

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert('Please enter the OTP');
      return;
    }
    const result = await verifyOTP(email, otp);
    
    if (result?.requires2FA) {
        navigation.navigate('VerifyPIN', { email });
        return;
    }

    if (!result?.success && error) {
      console.log('Verification failed', result?.error || error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          placeholderTextColor="#999"
          value={otp}
          onChangeText={(text) => {
            setOtp(text);
            clearError();
          }}
          keyboardType="numeric"
          maxLength={6}
        />

        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={handleVerifyOTP}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#00e5ff', '#3d5afe']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Change Email</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1014', // Deep space dark
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8D9F',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1A1B22',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 16,
  }
});
