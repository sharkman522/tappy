import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import LottieView from 'lottie-react-native';

// Import the custom SleepingTappy component
import SleepingTappy from './SleepingTappy';

// Import the Lottie animation file
import tappyData from '../assets/images/tappy.json';

// For now, we're using the same animation file for all outfits
// In a real app, you would have different animation files for each outfit
const outfitAnimations: Record<string, any> = {
  '1': tappyData, // Default outfit
  '2': tappyData, // Raincoat outfit (using default for now)
  '3': tappyData, // Bus Driver outfit (using default for now)
  '4': tappyData, // Train Captain outfit (using default for now)
};

interface TappyCharacterProps {
  style?: object;
  expression?: 'happy' | 'sleeping' | 'alert' | 'celebration' | 'sad';
  size?: 'small' | 'medium' | 'large';
  animationType?: 'wave' | 'dance' | 'pulse' | 'none';
  outfit?: string;
}

export default function TappyCharacter({ 
  style, 
  expression = 'happy', 
  size = 'medium',
  animationType = 'none',
  outfit = '1' 
}: TappyCharacterProps) {
  // Lottie animation reference
  const lottieRef = useRef<LottieView>(null);
  
  // Animation values for transform effects
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Size mapping
  const sizeMap = {
    small: 80,
    medium: 150,
    large: 240
  };

  const tappySize = sizeMap[size];
  
  // Get animation frame ranges based on expression
  const getAnimationFrames = () => {
    // These values should be adjusted based on the actual tappy.json file's frame structure
    // The following are placeholder values assuming the animation has different sections for expressions
    switch (expression) {
      case 'happy':
        return { start: 0, end: 30 };
      case 'sleeping':
        return { start: 31, end: 60 };
      case 'alert':
        return { start: 61, end: 90 };
      case 'celebration':
        return { start: 91, end: 120 };
      case 'sad':
        return { start: 121, end: 150 };
      default:
        return { start: 0, end: 30 }; // Default to happy
    }
  };

  // Play Lottie animation for the specific expression
  useEffect(() => {
    if (lottieRef.current) {
      const frames = getAnimationFrames();
      
      // For alert expression, always play the full animation
      if (expression === 'alert') {
        lottieRef.current.play();
      } else {
        lottieRef.current.play(frames.start, frames.end);
      }
    }
  }, [expression]);

  // Apply transform animations
  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation;

    switch (animationType) {
      case 'wave':
        animationLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 400,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 400,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'dance':
        animationLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 300,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 300,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'pulse':
        animationLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 800,
              easing: Easing.sine,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.sine,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      default:
        // No animation
        return;
    }

    animationLoop.start();

    return () => {
      animationLoop.stop();
    };
  }, [animationType]);

  const getAnimationStyle = () => {
    // Base animation style
    let animStyle = {};
    
    // Add 180-degree rotation for sleeping expression
    if (expression === 'sleeping') {
      animStyle = {
        ...animStyle,
        transform: [{ rotate: '180deg' }]
      };
    }
    
    // Add other animations based on animationType
    switch (animationType) {
      case 'wave':
        return {
          ...animStyle,
          transform: [
            ...(animStyle.transform || []),
            { 
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '20deg']
              }) 
            }
          ]
        };
      case 'dance':
        return {
          ...animStyle,
          transform: [
            ...(animStyle.transform || []),
            { scale: scaleAnim },
            { 
              translateY: scaleAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0, -10]
              }) 
            }
          ]
        };
      case 'pulse':
        return {
          ...animStyle,
          transform: [
            ...(animStyle.transform || []),
            { scale: pulseAnim }
          ],
          opacity: pulseAnim.interpolate({
            inputRange: [1, 1.2],
            outputRange: [1, 0.8]
          })
        };
      default:
        return animStyle;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[
        { width: tappySize, height: tappySize },
        getAnimationStyle()
      ]}>
        {expression === 'sleeping' ? (
          // Use the custom SleepingTappy component when expression is sleeping
          <SleepingTappy 
            width={tappySize} 
            height={tappySize} 
            style={styles.lottieView} 
          />
        ) : (
          // Use Lottie animation for all other expressions
          <LottieView
            ref={lottieRef}
            source={outfitAnimations[outfit] || tappyData}
            style={styles.lottieView}
            autoPlay={expression === 'alert'} // Auto play for alert expression
            loop={expression === 'alert' || animationType !== 'none'}
            resizeMode="contain"
            // On web, we need to specify renderer type
            {...(Platform.OS === 'web' ? { renderer: 'svg' } : {})}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieView: {
    width: '100%',
    height: '100%',
  },
});