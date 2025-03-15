import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MapPin, TriangleAlert as AlertTriangle } from 'lucide-react-native';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';
import MapProgressBar from '@/components/MapProgressBar';
import LoadingIndicator from '@/components/LoadingIndicator';

// Services & Mock Data
import { locationService } from '@/utils/locationService';
import { useRouteStops } from '@/utils/ltaDataProvider';

export default function JourneyTrackingScreen() {
  const { routeId, routeNumber, stopId, stopName } = useLocalSearchParams();
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [journeyStatus, setJourneyStatus] = useState('Starting your journey...');
  const [tappyState, setTappyState] = useState<'sleeping' | 'happy' | 'alert'>('sleeping');
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  // Test mode completely removed as requested
  const [locationPermission, setLocationPermission] = useState(true);
  const [gpsError, setGpsError] = useState(false);

  // Get stops for this route from the LTA API
  const { stops, loading, error } = useRouteStops(routeNumber as string);
  
  // Find destination stop index
  const destinationIndex = stops.findIndex(stop => stop.id === stopId);
  
  // Initialize location service and test mode
  useEffect(() => {
    const initLocation = async () => {
      try {
        await locationService.init();
        setLocationPermission(true);
        setGpsError(false);
      } catch (error) {
        setLocationPermission(false);
        console.error('Failed to get location permission:', error);
      }
    };
    
    initLocation();
    
    // Cleanup
    return () => {
      locationService.disableTestMode();
    };
  }, []);
  
  // Ensure test mode is always disabled
  useEffect(() => {
    if (stops.length > 0) {
      // Always disable test mode to use real GPS
      locationService.disableTestMode();
    }
  }, [stops]);
  
  // Watch for location updates
  useEffect(() => {
    if (!locationPermission || stops.length === 0) return;
    
    let stopCheckInterval: NodeJS.Timeout;
    const unsubscribe = locationService.watchLocation((location) => {
      // Check which stop we're closest to
      if (stops.length > 0) {
        // Calculate distances to all stops
        const distances = stops.map(stop => {
          const dx = location.latitude - stop.coordinates.latitude;
          const dy = location.longitude - stop.coordinates.longitude;
          return Math.sqrt(dx * dx + dy * dy);
        });
        
        // Find closest stop
        const closestStopIndex = distances.indexOf(Math.min(...distances));
        
        // Calculate distance to next stop (in meters)
        const nextStopIndex = Math.min(closestStopIndex + 1, stops.length - 1);
        const distanceToNextStop = calculateDistance(
          location.latitude,
          location.longitude,
          stops[nextStopIndex].coordinates.latitude,
          stops[nextStopIndex].coordinates.longitude
        );
        
        // Calculate distance to destination stop (in meters)
        const distanceToDestination = calculateDistance(
          location.latitude,
          location.longitude,
          stops[destinationIndex].coordinates.latitude,
          stops[destinationIndex].coordinates.longitude
        );
        
        // Update current stop if it's changed
        if (closestStopIndex !== currentStopIndex) {
          setCurrentStopIndex(closestStopIndex);
        }
        
        // Update journey status based on distance to next stop and destination
        updateJourneyStatus(closestStopIndex, distanceToNextStop, distanceToDestination);
      }
    });
    
    // Function to update journey status based on real distances
    const updateJourneyStatus = (stopIndex: number, distanceToNext: number, distanceToDestination: number) => {
      // Two stops before destination or within 500m of destination - alert that we're approaching
      if (stopIndex === destinationIndex - 2 || (stopIndex === destinationIndex - 1 && distanceToDestination < 500)) {
        setTappyState('alert');
        setJourneyStatus(`${stops[destinationIndex].name} is coming up! Get ready to alight!`);
      } 
      // At destination stop or very close to it (within 100m) - trigger alarm
      else if ((stopIndex === destinationIndex || distanceToDestination < 100) && !isAlarmTriggered) {
        setIsAlarmTriggered(true);
      }
      // Normal journey progress - keep Tappy sleeping
      else if (stopIndex < stops.length - 1) {
        // Always maintain sleeping state during normal journey
        setTappyState('sleeping');
        
        // Format distance for display
        const formattedDistance = distanceToNext < 1000 ? 
          `${Math.round(distanceToNext)}m` : 
          `${(distanceToNext / 1000).toFixed(1)}km`;
          
        setJourneyStatus(`Approaching: ${stops[stopIndex + 1].name} (${formattedDistance} away)`);
      }
    };
    
    // Haversine formula to calculate distance between two points in meters
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
      
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      return R * c; // Distance in meters
    };
    
    // Test mode simulation removed
    
    return () => {
      unsubscribe();
      if (stopCheckInterval) clearInterval(stopCheckInterval);
    };
  }, [locationPermission, currentStopIndex, destinationIndex, isAlarmTriggered, stops]);
  
  // Update journey status based on current position
  useEffect(() => {
    if (stops.length === 0) return;
    
    if (currentStopIndex === destinationIndex - 2) {
      setTappyState('alert');
      setJourneyStatus(`Two stops away from: ${stops[destinationIndex].name}! Get ready to alight!`);
    } else if (currentStopIndex === destinationIndex) {
      if (!isAlarmTriggered) {
        setIsAlarmTriggered(true);
      }
    } else {
      // Ensure Tappy stays sleeping during the journey
      setTappyState('sleeping');
      setJourneyStatus(`Now approaching: ${stops[currentStopIndex+1]?.name || 'next stop'}`);
    }
  }, [currentStopIndex, isAlarmTriggered, stops, destinationIndex]);
  
  // Handle alarm activation (navigate to alarm screen)
  useEffect(() => {
    if (isAlarmTriggered) {
      router.push({
        pathname: '/alarm',
        params: { stopName }
      });
    }
  }, [isAlarmTriggered, stopName]);
  
  // Test functionality removed
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingIndicator fullscreen message="Preparing your journey..." />
      </SafeAreaView>
    );
  }
  
  if (error || stops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorView}>
          <Text style={styles.errorTitle}>Could not load route information</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
          <TouchableOpacity 
            style={styles.backButtonLarge}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.overlay}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{routeNumber}</Text>
          <View style={{ width: 50 }} />
        </View>
        
        {/* Status container */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{journeyStatus}</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentStopIndex + 1} of {stops.length} stops
            </Text>
            <Text style={styles.destinationText}>
              Destination: {stopName} <MapPin size={14} color="#FF8A65" />
            </Text>
          </View>
        </View>

        {/* Test controls removed */}
        
        {/* Map with route visualization */}
        <View style={styles.mapContainer}>
          <MapProgressBar 
            stops={stops}
            currentStopIndex={currentStopIndex}
            destinationStopIndex={destinationIndex}
          />
        </View>
        
        {/* Tappy Character */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression={tappyState} 
            size="medium"
            animationType={tappyState === 'alert' ? 'pulse' : 'none'}
          />
          <SpeechBubble 
            text={tappyState === 'sleeping' ? "I'll wake you when we're getting close!" : 
                  tappyState === 'alert' ? "Almost there! Get ready!" :
                  "Are you enjoying the journey?"}
            position="top" 
            style={styles.speechBubble}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#4BB377',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Test mode styles removed
  statusContainer: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 14,
    color: '#4B5563',
  },
  destinationText: {
    fontSize: 14,
    color: '#FF8A65',
    fontWeight: '500',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    margin: 15,
    marginTop: 0,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8A65',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  // Test control styles removed
  tappyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  speechBubble: {
    maxWidth: '80%',
    marginBottom: 10,
  },
  errorView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  backButtonLarge: {
    backgroundColor: '#4BB377',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});