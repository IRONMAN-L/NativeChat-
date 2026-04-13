import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


import { useAuthStore } from './src/store/authStore';
import LoginScreen from './src/screens/LoginScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import HomeScreen from './src/screens/HomeScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ChatScreen from './src/screens/ChatScreen';
import CallScreen from './src/screens/CallScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import FriendProfileScreen from './src/screens/FriendProfileScreen';
import ChatSettingsScreen from './src/screens/ChatSettingsScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import LanguageSettingsScreen from './src/screens/LanguageSettingsScreen';
import VerifyPINScreen from './src/screens/VerifyPINScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import { useCallStore } from './src/store/callStore';
import { useOfflineP2pStore } from './src/store/offlineP2pStore';
import { usePreferencesStore } from './src/store/preferencesStore';
import { getThemeColors } from './src/theme/colors';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = usePreferencesStore();
  const colors = getThemeColors(theme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00e5ff',
        tabBarInactiveTintColor: '#666',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Chats') iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          else if (route.name === 'Contacts') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Activity') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chats" component={HomeScreen} />
      <Tab.Screen name="Contacts" component={FriendsScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, token, bootstrapAuth, isBootstrapping } = useAuthStore();
  const { setupWebrtcListeners } = useCallStore();
  const { initNetworkMonitor, initP2P } = useOfflineP2pStore();
  const { theme, appLockEnabled } = usePreferencesStore();
  const colors = getThemeColors(theme);
  
  const [isLocked, setIsLocked] = React.useState(false);

  useEffect(() => {
    bootstrapAuth();
    initNetworkMonitor();
    initP2P();
    
    // Initial hardware lock on boot check
    if (appLockEnabled) {
      setIsLocked(true);
      requestBiometrics();
    }
  }, []);

  const requestBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Application',
        fallbackLabel: 'Use Passcode'
      });
      if (auth.success) setIsLocked(false);
    } else {
      setIsLocked(false);
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (appLockEnabled) setIsLocked(true);
      } else if (nextAppState === 'active') {
        if (appLockEnabled && isLocked) {
          requestBiometrics();
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [appLockEnabled, isLocked]);

  // Set up socket listeners for incoming calls once logged in
  useEffect(() => {
    if (user && token) {
      setupWebrtcListeners();
    }
  }, [user, token]);

  if (isBootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={64} color="#00e5ff" style={{ marginBottom: 20 }} />
        <ActivityIndicator size="large" color="#00e5ff" />
      </View>
    );
  }

  const screenOptions = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: false, 
    headerTintColor: colors.text,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  };

  return (
    <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={screenOptions}>
        {token == null ? (
          // Auth flow
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="VerifyOTP" 
              component={VerifyOTPScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="VerifyPIN" 
              component={VerifyPINScreen} 
              options={{ headerShown: false }} 
            />
          </>
        ) : (
          // App flow
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen} 
              options={{ headerShown: false }} // Custom header defined inside screen
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              // Title is set dynamically inside ChatScreen
            />
            <Stack.Screen 
              name="FriendProfile" 
              component={FriendProfileScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="CreateGroup" 
              component={CreateGroupScreen} 
              options={{ title: 'Create Group' }} 
            />
            <Stack.Screen 
              name="GroupChat" 
              component={GroupChatScreen} 
            />
            <Stack.Screen 
              name="Call" 
              component={CallScreen} 
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen 
              name="ChatSettings" 
              component={ChatSettingsScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="PrivacySecurity" 
              component={PrivacySecurityScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="LanguageSettings" 
              component={LanguageSettingsScreen} 
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#121212'
  }
});
