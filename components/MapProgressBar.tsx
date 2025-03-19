import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapWeb from './MapWeb';
import { useJourney } from '@/context/JourneyContext';

interface MapProgressBarProps {
  // Optional props to override context values if needed
  stops?: Array<{
    id: string;
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
  currentStopIndex?: number;
  destinationStopIndex?: number;
  partialProgress?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function MapProgressBar(props: MapProgressBarProps) {
  // Use the journey context
  const {
    stops: contextStops,
    currentStopIndex: contextCurrentStopIndex,
    destinationIndex: contextDestinationIndex,
    progressToNextStop: contextProgress,
    currentLocation: contextCurrentLocation
  } = useJourney();
  
  // Merge props with context values, prioritizing props if provided
  const mergedProps = {
    stops: props.stops || contextStops,
    currentStopIndex: props.currentStopIndex !== undefined ? props.currentStopIndex : contextCurrentStopIndex,
    destinationStopIndex: props.destinationStopIndex !== undefined ? props.destinationStopIndex : contextDestinationIndex,
    partialProgress: props.partialProgress !== undefined ? props.partialProgress : contextProgress,
    currentLocation: props.currentLocation || contextCurrentLocation
  };
  
  return (
    <View style={styles.container}>
      <MapWeb {...mergedProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  }
});