import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SpeechBubbleProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  style?: object;
  textStyle?: object;
}

export default function SpeechBubble({ 
  text, 
  position = 'top', 
  style, 
  textStyle 
}: SpeechBubbleProps) {
  
  const getPositionStyle = () => {
    switch(position) {
      case 'bottom':
        return styles.bubbleBottom;
      case 'left':
        return styles.bubbleLeft;
      case 'right':
        return styles.bubbleRight;
      case 'top':
      default:
        return styles.bubbleTop;
    }
  };
  
  const getTailStyle = () => {
    switch(position) {
      case 'bottom':
        return styles.tailBottom;
      case 'left':
        return styles.tailLeft;
      case 'right':
        return styles.tailRight;
      case 'top':
      default:
        return styles.tailTop;
    }
  };
  
  return (
    <View style={[styles.container, getPositionStyle(), style]}>
      <View style={[styles.bubble]}>
        <Text style={[styles.text, textStyle]}>{text}</Text>
      </View>
      <View style={[styles.tail, getTailStyle()]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: '100%',
  },
  text: {
    color: '#333333',
    fontSize: 14,
    textAlign: 'center',
  },
  tail: {
    position: 'absolute',
    width: 15,
    height: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    transform: [{ rotate: '45deg' }],
  },
  bubbleTop: {
    flexDirection: 'column',
    marginBottom: 15,
  },
  bubbleBottom: {
    flexDirection: 'column-reverse',
    marginTop: 15,
  },
  bubbleLeft: {
    flexDirection: 'row',
    marginRight: 15,
  },
  bubbleRight: {
    flexDirection: 'row-reverse',
    marginLeft: 15,
  },
  tailTop: {
    bottom: -7,
  },
  tailBottom: {
    top: -7,
  },
  tailLeft: {
    right: -7,
  },
  tailRight: {
    left: -7,
  },
});