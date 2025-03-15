import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';

// Components
import TappyButton from '@/components/TappyButton';

// Services
import { notificationService } from '@/utils/notificationService';

export default function TestAlarmScreen() {
  // Test immediate alarm notification
  const testImmediateAlarm = async () => {
    await notificationService.scheduleAlarmNotification('Test Stop');
  };
  
  // Test delayed alarm notification (10 seconds)
  const testDelayedAlarm = async () => {
    await notificationService.scheduleApproachingNotification('Test Stop', 10);
  };
  
  // Go back to home
  const goBack = () => {
    router.back();
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Alarm Notifications</Text>
        <Text style={styles.description}>
          Use these buttons to test the alarm notifications in different states.
          Try putting the app in the background to test background notifications.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TappyButton
            title="Test Immediate Alarm"
            onPress={testImmediateAlarm}
            type="primary"
            size="large"
            style={styles.button}
            icon={<Bell size={22} color="#FFFFFF" />}
          />
          
          <TappyButton
            title="Test Delayed Alarm (10s)"
            onPress={testDelayedAlarm}
            type="secondary"
            size="large"
            style={styles.button}
            icon={<Bell size={22} color="#FF8A65" />}
          />
          
          <TappyButton
            title="Go Back"
            onPress={goBack}
            type="outline"
            size="large"
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '80%',
    marginBottom: 20,
  },
});
