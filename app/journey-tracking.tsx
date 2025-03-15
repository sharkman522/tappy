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
  const [testMode, setTestMode] = useState(true); // Default to test mode
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
  
  // Toggle test mode when stops are loaded
  useEffect(() => {
    if (stops.length > 0) {
      // Create a path from the first stop to the destination
      const routeCoordinates = [];
      
      // For each pair of consecutive stops, generate points between them
      for (let i = 0; i < stops.length - 1; i++) {
        const start = stops[i].coordinates;
        const end = stops[i + 1].coordinates;
        
        // Create 5 points between each stop
        const segmentPoints = [];
        for (let j = 0; j <= 5; j++) {
          const fraction = j / 5;
          segmentPoints.push({
            latitude: start.latitude + fraction * (end.latitude - start.latitude),
            longitude: start.longitude + fraction * (end.longitude - start.longitude)
          });
        }
        
        // Add all points except the last one (to avoid duplication)
        if (i < stops.length - 2) {
          routeCoordinates.push(...segmentPoints.slice(0, -1));
        } else {
          // For the last segment, include the last point
          routeCoordinates.push(...segmentPoints);
        }
      }
      
      locationService.enableTestMode(routeCoordinates);
    }
  }, [stops]);
  
  // Watch for location updates
  useEffect(() => {
    if (!locationPermission || stops.length === 0) return;
    
    let stopCheckInterval: NodeJS.Timeout;
    const unsubscribe = locationService.watchLocation((location) => {
      // Check which stop we're closest to
      if (stops.length > 0) {
        // Simple distance calculation (not actual road distance)
        const distances = stops.map(stop => {
          const dx = location.latitude - stop.coordinates.latitude;
          const dy = location.longitude - stop.coordinates.longitude;
          return Math.sqrt(dx * dx + dy * dy);
        });
        
        // Find closest stop
        const closestStopIndex = distances.indexOf(Math.min(...distances));
        
        // Update current stop if it's changed
        if (closestStopIndex !== currentStopIndex) {
          setCurrentStopIndex(closestStopIndex);
        }
      }
    });
    
    // Simulate journey progress for testing
    stopCheckInterval = setInterval(() => {
      // Two stops before destination - alert that we're approaching
      if (currentStopIndex === destinationIndex - 2) {
        setTappyState('alert');
        setJourneyStatus(`Two stops away from: ${stops[destinationIndex].name}! Get ready to alight!`);
      } 
      // At destination stop - trigger alarm
      else if (currentStopIndex === destinationIndex && !isAlarmTriggered) {
        setIsAlarmTriggered(true);
      }
      // Normal journey progress - keep Tappy sleeping
      else if (currentStopIndex < stops.length - 1) {
        // Always maintain sleeping state during normal journey
        setTappyState('sleeping');
        setJourneyStatus(`Now approaching: ${stops[currentStopIndex + 1].name}`);
      }
    }, 2000);
    
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
  
  // For testing: advance to next stop
  const advanceToNextStop = () => {
    if (currentStopIndex < stops.length - 1) {
      setCurrentStopIndex(currentStopIndex + 1);
    }
  };
  
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

        {/* Test Controls - always visible since we're always in test mode */}
        <View style={styles.testControlsContainer}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={advanceToNextStop}
          >
            <Text style={styles.testButtonText}>Next Stop</Text>
          </TouchableOpacity>
        </View>
        
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
  testModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testModeLabel: {
    color: '#FFFFFF',
    marginRight: 5,
    fontSize: 12,
  },
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
  testControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  testButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
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