import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Vibration } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CircleCheck as CheckCircle2, Bell } from 'lucide-react-native';
import { Audio } from 'expo-av';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import TappyButton from '@/components/TappyButton';

export default function AlarmScreen() {
  const { stopName } = useLocalSearchParams();
  const [dismissing, setDismissing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Load and play alarm sound
  useEffect(() => {
    let isMounted = true;
    
    const loadSound = async () => {
      try {
        // Load the sound file
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/alarm.aac'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        
        if (isMounted) {
          setSound(sound);
        }
      } catch (error) {
        console.error('Failed to load sound', error);
      }
    };
    
    loadSound();
    
    // Vibrate with pattern: 500ms on, 500ms off, repeat
    const pattern = [0, 500, 500];
    Vibration.vibrate(pattern, true);
    
    // Clean up when component unmounts
    return () => {
      isMounted = false;
      Vibration.cancel();
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
      }
    };
  }, []);
  
  // Handle dismiss alarm
  const handleDismiss = () => {
    Vibration.cancel();
    setDismissing(true);
    
    // Stop the sound
    if (sound) {
      sound.stopAsync();
    }
    
    setTimeout(() => {
      router.push({
        pathname: '/post-alarm',
        params: { stopName }
      });
    }, 500);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.alarmContent}>
        {/* Tappy Character */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression="alert" 
            size="large"
            animationType="pulse"
          />
        </View>
        
        {/* Alarm Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.alarmTitle}>Wake Up, Friend!</Text>
          <Text style={styles.alarmMessage}>
            Next stop: {stopName}!{'\n'}Time to get ready!
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TappyButton
            title="Thank You, Tappy!"
            onPress={handleDismiss}
            type="primary"
            size="large"
            style={styles.dismissButton}
            icon={<CheckCircle2 size={22} color="#FFFFFF" />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFCC80', // Warm yellow/orange background
  },
  alarmContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  tappyContainer: {
    marginBottom: 30,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  alarmTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF8A65',
    marginBottom: 20,
    textAlign: 'center',
  },
  alarmMessage: {
    fontSize: 24,
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 32,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dismissButton: {
    width: '80%',
    marginBottom: 15,
  },
});