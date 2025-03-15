import React, { useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  View
} from 'react-native';

interface TappyButtonProps {
  onPress: () => void;
  title: string;
  type?: 'primary' | 'secondary' | 'alarm';
  size?: 'small' | 'medium' | 'large';
  isPulsing?: boolean;
  icon?: React.ReactNode;
  style?: object;
}

export default function TappyButton({
  onPress,
  title,
  type = 'primary',
  size = 'medium',
  isPulsing = false,
  icon,
  style
}: TappyButtonProps) {
  // Animation value for pulsing effect
  const pulseAnim = new Animated.Value(1);
  
  // Set up pulsing animation if needed
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    
    if (isPulsing) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulseAnimation.start();
    }
    
    return () => {
      if (isPulsing && pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [isPulsing]);
  
  // Button styles based on type and size
  const getButtonStyle = () => {
    // Base style by type
    let buttonStyle = {};
    
    switch (type) {
      case 'primary':
        buttonStyle = styles.primaryButton;
        break;
      case 'secondary':
        buttonStyle = styles.secondaryButton;
        break;
      case 'alarm':
        buttonStyle = styles.alarmButton;
        break;
    }
    
    // Add size styles
    switch (size) {
      case 'small':
        buttonStyle = { ...buttonStyle, ...styles.smallButton };
        break;
      case 'large':
        buttonStyle = { ...buttonStyle, ...styles.largeButton };
        break;
      default:
        buttonStyle = { ...buttonStyle, ...styles.mediumButton };
    }
    
    return buttonStyle;
  };
  
  // Text styles based on type
  const getTextStyle = () => {
    switch (type) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'alarm':
        return styles.alarmText;
    }
  };
  
  // Size-based text styles
  const getTextSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        isPulsing && {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, getButtonStyle(), style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.text, getTextStyle(), getTextSizeStyle()]}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
  },
  iconContainer: {
    marginRight: 8,
  },
  // Button types
  primaryButton: {
    backgroundColor: '#4BB377',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4BB377',
  },
  alarmButton: {
    backgroundColor: '#FF8A65',
  },
  // Text styles
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#4BB377',
  },
  alarmText: {
    color: '#FFFFFF',
  },
  // Size variations
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});