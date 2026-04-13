import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePreferencesStore = create(
    persist(
        (set) => ({
            theme: 'dark', // 'light' or 'dark'
            chatWallpaper: null, // Custom physical image URI
            appLockEnabled: false, // Biometric lock indicator
            language: 'en', // 'en', 'te', 'hi'
            
            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
            setTheme: (theme) => set({ theme }),
            setChatWallpaper: (uri) => set({ chatWallpaper: uri }),
            removeChatWallpaper: () => set({ chatWallpaper: null }),
            setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),
            setLanguage: (language) => set({ language })
        }),
        {
            name: 'chatwithme-preferences-storage', 
            storage: createJSONStorage(() => AsyncStorage), 
        }
    )
);
