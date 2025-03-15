import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { BellRing } from 'lucide-react-native';

interface PulsingStopButtonProps {
  onPress: () => void;
  isPulsing?: boolean;
}

export default function PulsingStopButton({
  onPress,
  isPulsing = true
}: PulsingStopButtonProps) {
  // Animation values
  // Use refs to ensure stable references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Create a separate value for opacity that doesn't use native driver
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Setup animations
  useEffect(() => {
    if (isPulsing) {
      // Pulse animation with native driver
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.sin,
            useNativeDriver: true, // Use native driver consistently
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.sin,
            useNativeDriver: true, // Use native driver consistently
          }),
        ])
      );
      
      // Glow animation without native driver since opacity interpolation needs JS driver
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.sin,
            useNativeDriver: false, // Keep JS driver for opacity
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.sin,
            useNativeDriver: false, // Keep JS driver for opacity
          }),
        ])
      );
      
      // Start both animations
      pulseAnimation.start();
      glowAnimation.start();
      
      return () => {
        pulseAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [isPulsing, pulseAnim, glowAnim]);
  
  // Interpolate glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
  
  return (
    <Animated.View style={styles.container}>
      {/* Glow effect */}
      <Animated.View style={[
        styles.glowEffect,
        {
          opacity: glowOpacity, // JS-driven animation
        }
      ]} />
      
      {/* The pulsing container - separate from the opacity animation */}
      <Animated.View style={[
        styles.buttonContainer,
        {
          transform: [{ scale: pulseAnim }], // Native-driven animation
        }
      ]}>
        <TouchableOpacity
          style={styles.button}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <BellRing size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    margin: 10,
  },
  glowEffect: {
    position: 'absolute',
    backgroundColor: '#FF8A65',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  buttonContainer: {
    borderRadius: 60,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#FF8A65',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    padding: 10,
  },
});