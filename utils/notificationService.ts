import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notifications to show alerts, badges, and sounds
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH, // High priority for Android to make sound in background
  }),
});

export const notificationService = {
  // Initialize notifications - request permissions and configure
  async init() {
    // Check if device is a physical device (not an emulator)
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If we don't have permission, ask for it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      
      // For Android, set notification channel for alarms
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alarms', {
          name: 'Tappy Alarms',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF8A65',
          sound: 'default', // Use default sound
          enableVibrate: true,
          showBadge: true,
        });
      }
      
      // Return whether we have permission
      return finalStatus === 'granted';
    }
    
    return false;
  },
  
  // Schedule a notification to be delivered immediately
  async scheduleAlarmNotification(stopName: string) {
    // Cancel any existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Configure the notification content
    const notificationContent: Notifications.NotificationContentInput = {
      title: 'Wake Up, Friend!',
      body: `Next stop: ${stopName}! Time to get ready!`,
      data: { stopName },
      sound: 'default', // Use default sound
      priority: 'high',
    };
    
    // For Android, specify the channel
    if (Platform.OS === 'android') {
      // @ts-ignore - Android specific properties
      notificationContent.channelId = 'alarms';
      // @ts-ignore - Android specific properties
      notificationContent.autoDismiss = false; // Don't auto dismiss the notification
    }
    
    // Schedule the notification to be delivered immediately
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Deliver immediately
    });
    
    return true;
  },
  
  // Schedule a notification to be delivered in the future
  async scheduleApproachingNotification(stopName: string, timeInSeconds: number = 60) {
    // Configure the notification content
    const notificationContent: Notifications.NotificationContentInput = {
      title: 'Almost There!',
      body: `${stopName} is coming up in about ${Math.round(timeInSeconds / 60)} minute(s)!`,
      data: { stopName, type: 'approaching' },
      sound: 'default',
      priority: 'high',
    };
    
    // For Android, specify the channel
    if (Platform.OS === 'android') {
      // @ts-ignore - Android specific properties
      notificationContent.channelId = 'alarms';
    }
    
    // Schedule the notification to be delivered in the future
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        seconds: timeInSeconds,
        repeats: false
      } as any,
    });
    
    return true;
  },
  
  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  },
  
  // Add a listener for notification responses (when user taps on notification)
  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
  
  // Add a listener for notifications received while app is in foreground
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },
};
