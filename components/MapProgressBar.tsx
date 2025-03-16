import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapWeb from './MapWeb';

interface MapProgressBarProps {
  stops: Array<{
    id: string;
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
  currentStopIndex: number;
  destinationStopIndex: number;
  partialProgress?: number; // Progress between current and next stop (0-100)
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function MapProgressBar(props: MapProgressBarProps) {
  return (
    <View style={styles.container}>
      <MapWeb {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  }
});