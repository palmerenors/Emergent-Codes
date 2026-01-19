import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationAPI } from '../services/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Register token with backend
    await notificationAPI.registerToken({
      token,
      platform: Platform.OS,
    });

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('new_posts', {
      name: 'New Posts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
    });

    await Notifications.setNotificationChannelAsync('milestones', {
      name: 'Milestone Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
    });

    await Notifications.setNotificationChannelAsync('group_updates', {
      name: 'Support Group Updates',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#0000FF',
    });

    await Notifications.setNotificationChannelAsync('premium_notifications', {
      name: 'Premium Member Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#FFD700',
    });
  }
}
