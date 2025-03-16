import React from 'react';
import { View, StyleSheet } from 'react-native';

// Import the sleep SVG file - with react-native-svg-transformer, this will be a React component
import SleepSvg from '../assets/images/sleep.svg';

interface SleepingTappyProps {
  width: number;
  height: number;
  style?: object;
}

/**
 * A custom component that renders a sleeping Tappy character using SVG
 */
export default function SleepingTappy({ width, height, style }: SleepingTappyProps) {
  return (
    <View style={[styles.container, style, { width, height }]}>
      <SleepSvg width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
