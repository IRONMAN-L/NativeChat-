import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { generateAndStoreKeyPair, getMyKeys } from '../utils/crypto';

import { API_URL } from '../config';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isBootstrapping: true,
  isLoading: false,
  error: null,

  // Load token from storage on app start
  bootstrapAuth: async () => {
    try {
      set({ isBootstrapping: true });
      const token = await AsyncStorage.getItem('userToken');
      const user = await AsyncStorage.getItem('userData');
      if (token && user) {
        set({ token, user: JSON.parse(user) });
      }
    } catch (e) {
      console.log('Failed to restore auth from async storage', e);
    } finally {
      set({ isBootstrapping: false });
    }
  },

  requestOTP: async (email, mode = 'login') => {
    try {
      set({ isLoading: true, error: null });
      await axios.post(`${API_URL}/auth/request-otp`, { email, mode });
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to request OTP', isLoading: false });
      return false;
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      set({ isLoading: true, error: null });

      let publicKey = null;
      try {
        // First check if user already has a publicKey locally, otherwise generate one to register
        let existingKeys = await getMyKeys();
        if (!existingKeys) {
            publicKey = await generateAndStoreKeyPair();
        } else {
            // Send existing public key just to refresh on server side
            publicKey = await AsyncStorage.getItem('publicKey');
        }
      } catch (cryptoError) {
        console.error('Crypto/Key generation failed:', cryptoError);
        set({ error: `Security key error: ${cryptoError.message}`, isLoading: false });
        return false;
      }

      const response = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp, publicKey });

      if (response.data.requires2FA) {
          set({ isLoading: false });
          return { success: true, requires2FA: true };
      }

      const { token, user } = response.data;
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      set({ token, user, isLoading: false });
      return { success: true, requires2FA: false };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to verify OTP';
      set({ error: errorMsg, isLoading: false });
      return { success: false, requires2FA: false, error: errorMsg };
    }
  },

  verifyPIN: async (email, pin) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`${API_URL}/auth/verify-pin`, { email, pin });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      set({ token, user, isLoading: false });
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Incorrect PIN';
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  setupPIN: async (token, pin) => {
    try {
      set({ isLoading: true, error: null });
      await axios.post(`${API_URL}/auth/setup-pin`, { pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to setup PIN', isLoading: false });
      return false;
    }
  },

  updatePrivacySettings: async (token, settings) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.put(`${API_URL}/auth/privacy`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedUser = { ...get().user, ...response.data.user };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to update privacy settings', isLoading: false });
      return false;
    }
  },

  updateProfile: async (token, profileData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.put(`${API_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedUser = { ...get().user, ...response.data.user };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to update profile', isLoading: false });
      return false;
    }
  },

  requestEmailChange: async (token, newEmail) => {
    try {
      set({ isLoading: true, error: null });
      await axios.post(`${API_URL}/auth/email-change/request`, { newEmail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to request email change', isLoading: false });
      return false;
    }
  },

  verifyEmailChange: async (token, otp) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`${API_URL}/auth/email-change/verify`, { otp }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedUser = { ...get().user, email: response.data.email };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to verify email change', isLoading: false });
      return false;
    }
  },

  deleteAccount: async (token) => {
    try {
      set({ isLoading: true, error: null });
      await axios.delete(`${API_URL}/auth/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await get().signOut();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to delete account', isLoading: false });
      return false;
    }
  },

  signOut: async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null })
}));
