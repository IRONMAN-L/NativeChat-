import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { requestOTP, isLoading, error, clearError } = useAuthStore();

  const handleRequestOTP = async () => {
    if (!email) {
      alert('Please enter your email');
      return;
    }
    const mode = isLoginMode ? 'login' : 'signup';
    console.log(`Requesting OTP for: ${email} in mode: ${mode}`);
    const success = await requestOTP(email, mode);
    if (success) {
      console.log('OTP Request successful! Transitioning...');
      alert('OTP sent! Check your terminal console for the 6-digit code.');
      try {
        navigation.push('VerifyOTP', { email });
      } catch (navError) {
        console.error('Navigation failed:', navError);
        // Fallback if push is not available
        navigation.navigate('VerifyOTP', { email });
      }
    } else {
        console.log('OTP Request failed.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{isLoginMode ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>{isLoginMode ? 'Sign in to continue' : 'Sign up to start chatting securely'}</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            clearError();
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={handleRequestOTP}
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
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toggleContainer} 
          onPress={() => { setIsLoginMode(!isLoginMode); clearError(); }}
        >
          <Text style={styles.toggleText}>
            {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Text>
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
    fontSize: 16,
    marginBottom: 24,
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
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
  errorText: {
    color: '#ff6b6b',
    marginBottom: 16,
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#00e5ff',
    fontSize: 14,
    fontWeight: 'bold',
  }
});
