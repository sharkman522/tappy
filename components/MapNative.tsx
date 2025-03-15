import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

// We only import the map libraries in this file, which won't be included in web builds
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapNativeProps {
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
}

export default function MapNative({
  stops,
  currentStopIndex,
  destinationStopIndex,
}: MapNativeProps) {
  // Calculate center point of the route
  const calculateCenter = () => {
    if (stops.length === 0) return { latitude: 1.3521, longitude: 103.8198 }; // Default to Singapore
    
    const sum = stops.reduce(
      (acc, stop) => ({
        latitude: acc.latitude + stop.coordinates.latitude,
        longitude: acc.longitude + stop.coordinates.longitude,
      }),
      { latitude: 0, longitude: 0 }
    );
    
    return {
      latitude: sum.latitude / stops.length,
      longitude: sum.longitude / stops.length,
    };
  };

  const center = calculateCenter();
  
  // Map regions for native
  const mapRegion = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // For the route line
  const coordinates = stops.map(stop => ({
    latitude: stop.coordinates.latitude,
    longitude: stop.coordinates.longitude,
  }));

  // Render a coordinate path for the visited and upcoming segments
  const getVisitedCoordinates = () => {
    return coordinates.slice(0, currentStopIndex + 1);
  };

  const getRemainingCoordinates = () => {
    return coordinates.slice(currentStopIndex);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        provider={PROVIDER_GOOGLE}
      >
        {/* Completed route segment */}
        <Polyline
          coordinates={getVisitedCoordinates()}
          strokeColor="#4BB377"
          strokeWidth={4}
        />

        {/* Remaining route segment */}
        <Polyline
          coordinates={getRemainingCoordinates()}
          strokeColor="#D1D5DB"
          strokeWidth={3}
          strokeDashPattern={[5, 5]}
        />

        {/* Plot stops */}
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            coordinate={stop.coordinates}
            title={stop.name}
            description={index === currentStopIndex ? 'Current Stop' : index === destinationStopIndex ? 'Destination' : ''}
            pinColor={index === destinationStopIndex ? '#FF8A65' : index === currentStopIndex ? '#4BB377' : '#6B7280'}
          />
        ))}
      </MapView>

      {/* Progress bar at bottom of map */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${(currentStopIndex / (stops.length - 1)) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentStopIndex + 1} of {stops.length} stops
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4BB377',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 5,
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
});