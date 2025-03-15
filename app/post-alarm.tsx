import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThumbsUp, Circle as XCircle } from 'lucide-react-native';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';
import TappyButton from '@/components/TappyButton';

export default function PostAlarmScreen() {
  const { stopName } = useLocalSearchParams();
  const [confirmed, setConfirmed] = useState(false);
  const [missed, setMissed] = useState(false);
  const [tappyExpression, setTappyExpression] = useState<'happy' | 'sad' | 'celebration'>('happy');
  
  // Handle successful arrival
  const handleSuccessfulArrival = () => {
    setConfirmed(true);
    setTappyExpression('celebration');
    
    // Navigate back to home after celebration
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };
  
  // Handle missed stop
  const handleMissedStop = () => {
    setMissed(true);
    setTappyExpression('sad');
    
    // Navigate back to home after showing message
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Tappy Character & Speech Bubble */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression={tappyExpression} 
            size="large"
            animationType={tappyExpression === 'celebration' ? 'dance' : 'none'}
          />
          <SpeechBubble 
            text={
              confirmed ? "Wonderful! I'm so glad we made it!" : // Removed Singlish "lah"
              missed ? "No worries! We can try again!" :
              `Did we reach ${stopName} successfully?`
            } 
            position="top" 
            style={styles.speechBubble}
          />
        </View>
        
        {/* Confirmation Buttons */}
        {!confirmed && !missed && (
          <View style={styles.buttonContainer}>
            <TappyButton
              title="Yay!"
              onPress={handleSuccessfulArrival}
              type="primary"
              size="large"
              style={styles.yesButton}
              icon={<ThumbsUp size={22} color="#FFFFFF" />}
            />
            <TappyButton
              title="Oops, missed it!"
              onPress={handleMissedStop}
              type="secondary"
              size="large"
              style={styles.noButton}
              icon={<XCircle size={22} color="#4BB377" />}
            />
          </View>
        )}
        
        {/* Success Message */}
        {confirmed && (
          <View style={styles.confettiContainer}>
            <Text style={styles.successText}>🎉 Journey Completed! 🎉</Text>
            <Text style={styles.pointsText}>+5 Tappy Points</Text>
          </View>
        )}
        
        {/* Missed Stop Message */}
        {missed && (
          <View style={styles.missedContainer}>
            <Text style={styles.missedText}>Don't worry! We can try again.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  tappyContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  speechBubble: {
    maxWidth: '80%',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  yesButton: {
    width: '80%',
    marginBottom: 15,
  },
  noButton: {
    width: '80%',
  },
  confettiContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4BB377',
    marginBottom: 10,
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 18,
    color: '#FF8A65',
    fontWeight: '600',
  },
  missedContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  missedText: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
  },
});