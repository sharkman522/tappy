import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Path, G, Circle } from 'react-native-svg';

interface SleepingTappyProps {
  width: number;
  height: number;
  style?: object;
}

/**
 * A custom component that renders a sleeping Tappy character using SVG
 */
export default function SleepingTappy({ width, height, style }: SleepingTappyProps) {
  // Scale the SVG to fit the provided dimensions
  const scale = Math.min(width / 100, height / 100);
  
  return (
    <View style={[styles.container, style, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 100 100">
        {/* Main character body */}
        <Circle cx="50" cy="50" r="40" fill="#FFD700" />
        
        {/* Closed eyes (sleeping) */}
        <Path 
          d="M35 45 Q40 40 45 45" 
          stroke="#333" 
          strokeWidth="2" 
          fill="none" 
        />
        <Path 
          d="M55 45 Q60 40 65 45" 
          stroke="#333" 
          strokeWidth="2" 
          fill="none" 
        />
        
        {/* Sleeping expression - ZZZ */}
        <G transform="translate(70, 25)">
          <Path 
            d="M0 0 L10 0 L0 10 L10 10" 
            stroke="#333" 
            strokeWidth="2" 
            fill="none" 
          />
          <Path 
            d="M5 15 L15 15 L5 25 L15 25" 
            stroke="#333" 
            strokeWidth="2" 
            fill="none" 
          />
          <Path 
            d="M10 30 L20 30 L10 40 L20 40" 
            stroke="#333" 
            strokeWidth="2" 
            fill="none" 
          />
        </G>
        
        {/* Mouth - gentle curve for sleeping */}
        <Path 
          d="M40 65 Q50 70 60 65" 
          stroke="#333" 
          strokeWidth="2" 
          fill="none" 
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
