import { Platform } from 'react-native';

let Notifications = null;
try {
  // Expo SDK 53 removed Android Push functionality from Expo Go. We dynamically require to avoid RedBox crash.
  Notifications = require('expo-notifications');
  
  // Configure how notifications behave when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.log("Expo Notifications are not supported natively in this environment.");
}

export const requestNotificationPermissions = async () => {
  if (!Notifications) return false;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

export const scheduleMessageReminder = async (messageText, friendName, minutesFromNow) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission || !Notifications) {
    alert(!Notifications 
        ? "Reminders require a standalone build! Notifications missing in this environment." 
        : "Please enable notification permissions to set reminders.");
    return false;
  }

  const trigger = new Date(Date.now() + minutesFromNow * 60000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: Message from ${friendName}`,
      body: `"${messageText}"`,
      data: { mockParam: 'NavigateToChat' },
    },
    trigger,
  });

  return id;
};
