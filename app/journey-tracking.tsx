import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MapPin, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';
import MapProgressBar from '@/components/MapProgressBar';
import LoadingIndicator from '@/components/LoadingIndicator';

// Services & Mock Data
import { locationService } from '@/utils/locationService';
import { useRouteStops } from '@/utils/ltaDataProvider';
import { notificationService } from '@/utils/notificationService';
import { findClosestStop, haversineDistance } from '@/utils/geospatialUtils';

export default function JourneyTrackingScreen() {
  const { routeId, routeNumber, stopId, stopName, userLat, userLng } = useLocalSearchParams();
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [journeyStatus, setJourneyStatus] = useState('Starting your journey...');
  const [tappyState, setTappyState] = useState<'sleeping' | 'happy' | 'alert'>('sleeping');
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [partialProgress, setPartialProgress] = useState<number>(0);
  // Test mode completely removed as requested
  const [locationPermission, setLocationPermission] = useState(true);
  const [gpsError, setGpsError] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Get stops for this route from the LTA API
  const { stops, loading, error } = useRouteStops(
    routeNumber as string,
    1, // Default direction
    stopId as string // Pass the stopId to auto-select the direction
  );
  
  // Find destination stop index (the stop the user wants to go to)
  const destinationIndex = stops.findIndex(stop => stop.id === stopId);
  
  // Find the starting stop index (the stop passed from the previous screen)
  // We'll use the first stop in the route by default if no specific starting stop is provided
  const [startingStopIndex, setStartingStopIndex] = useState(0); // Default to first stop in the route
  
  // Use the unified haversineDistance function from geospatialUtils
  // This ensures consistent distance calculations across the entire application
  // Note: haversineDistance returns distance in kilometers, so we multiply by 1000 for meters when needed

  // Initialize location service and set up journey tracking
  useEffect(() => {
    // Function to get the user's current location for tracking purposes
    const initializeLocationTracking = async () => {
      if (stops.length === 0) return;
      
      try {
        // Use passed user location from params if available, otherwise get current location
        let userLocation;
        if (userLat && userLng) {
          userLocation = {
            latitude: parseFloat(userLat as string),
            longitude: parseFloat(userLng as string)
          };
          console.log('[JourneyTracking] Using passed user location:', userLocation);
        } else {
          userLocation = await locationService.getCurrentLocation();
          console.log('[JourneyTracking] Using current user location:', userLocation);
        }
        
        // Set the current location for tracking purposes
        setCurrentLocation(userLocation);
        
        // Log the starting stop information
        if (stops.length > 0) {
          // If we have a valid destination index, use it
          if (destinationIndex !== -1) {
            console.log('[JourneyTracking] Destination stop:', 
                        'Index:', destinationIndex, 
                        'Name:', stops[destinationIndex]?.name);
          }
          
          // Set the current stop index to the starting stop index
          // This ensures we start from the correct stop in the route
          setCurrentStopIndex(startingStopIndex);
          console.log('[JourneyTracking] Starting journey from stop:', 
                      'Index:', startingStopIndex, 
                      'Name:', stops[startingStopIndex]?.name);
        }
      } catch (error) {
        console.error('[JourneyTracking] Error initializing location tracking:', error);
        setGpsError(true);
      }
    };
    
    // Initialize location service and notifications
  
    const initServices = async () => {
      try {
        // Initialize location service
        await locationService.init();
        setLocationPermission(true);
        setGpsError(false);
        
        // Initialize notifications
        const hasPermission = await notificationService.init();
        setNotificationPermission(hasPermission);
        if (!hasPermission) {
          console.warn('Notification permissions not granted');
        }
      } catch (error) {
        setLocationPermission(false);
        console.error('Failed to initialize services:', error);
      }
    };
    
    initServices();
    
    // Initialize location tracking once services are ready and stops are loaded
    if (stops.length > 0) {
      initializeLocationTracking();
    }
    
    // Set up notification listeners
    notificationListener.current = notificationService.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );
    
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data as { stopName?: string };
        if (data.stopName) {
          // User tapped on notification - navigate to alarm screen
          router.push({
            pathname: '/alarm',
            params: { stopName: data.stopName }
          });
        }
      }
    );
    
    // Monitor app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Cleanup
    return () => {
      // No need to disable test mode as it's been removed
      notificationService.cancelAllNotifications();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, [stops, startingStopIndex]);
  
  // Handle app state changes (foreground/background)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      console.log('App has gone to background');
      // App is going to background - make sure notifications are ready
      if (notificationPermission && !isAlarmTriggered) {
        // Schedule an approaching notification if we're close to destination
        if (currentStopIndex === destinationIndex - 1) {
          notificationService.scheduleApproachingNotification(
            stops[destinationIndex].name,
            60 // 1 minute
          );
        }
      }
    }
    
    appState.current = nextAppState;
  };
  
  // No need to explicitly disable test mode since it's been removed from locationService
  // This effect is kept for reference but doesn't do anything significant now
  
  // Watch for location updates
  useEffect(() => {
    if (!locationPermission || stops.length === 0) return;
    
    let stopCheckInterval: NodeJS.Timeout;
    const unsubscribe = locationService.watchLocation((location) => {
      // Store current location for UI updates
      setCurrentLocation({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      // Check which stop we're closest to
      if (stops.length > 0) {
        // Use the unified findClosestStop function from geospatialUtils
        // This ensures consistent location matching logic across the entire application
        // Use the spatial index for faster lookup
        const { closestStopIndex: foundIndex, closestStop } = findClosestStop(
          location.latitude,
          location.longitude,
          stops,
          5 // Use a larger threshold (5km) for tracking since we're already on the route
        );
        
        // Log the closest stop details for debugging
        if (foundIndex !== -1 && closestStop) {
          console.log('[JourneyTracking] Current closest stop:', stops[foundIndex]?.name, 
                      'Distance:', closestStop.distance.toFixed(2) + 'km');
        }
        
        // Find closest stop
        const closestStopIndex = foundIndex !== -1 ? foundIndex : currentStopIndex;
        
        // Only update current stop index if we've already determined the starting point
        if (startingStopIndex !== -1) {
          // Don't go backward in the route - only move forward
          if (closestStopIndex > currentStopIndex) {
            setCurrentStopIndex(closestStopIndex);
          }
        }
        
        // Calculate distance to next stop (in meters)
        const nextStopIndex = Math.min(closestStopIndex + 1, stops.length - 1);
        // Use haversineDistance for consistent calculations (returns km, so multiply by 1000 for meters)
        const distanceToNextStop = haversineDistance(
          location.latitude,
          location.longitude,
          stops[nextStopIndex].coordinates.latitude,
          stops[nextStopIndex].coordinates.longitude
        ) * 1000;
        
        // Calculate distance to destination stop (in meters)
        const distanceToDestination = haversineDistance(
          location.latitude,
          location.longitude,
          stops[destinationIndex].coordinates.latitude,
          stops[destinationIndex].coordinates.longitude
        ) * 1000;
        
        // Calculate partial progress between current stop and next stop
        if (closestStopIndex < stops.length - 1) {
          // Calculate the total distance between the current stop and the next stop
          const distanceBetweenStops = haversineDistance(
            stops[closestStopIndex].coordinates.latitude,
            stops[closestStopIndex].coordinates.longitude,
            stops[nextStopIndex].coordinates.latitude,
            stops[nextStopIndex].coordinates.longitude
          ) * 1000; // Convert to meters
          
          // Calculate the distance traveled from the current stop towards the next stop
          // This is the key calculation: total segment length minus remaining distance
          const distanceTraveled = Math.max(0, distanceBetweenStops - distanceToNextStop);
          
          // Calculate progress as a percentage of the total potential distance
          // This represents how far along the segment the user has traveled
          // The total potential green is the full length between stops
          const progress = Math.max(0, Math.min(100, (distanceTraveled / distanceBetweenStops) * 100));
          
          console.log(
            `[JourneyTracking] Progress calculation:\n` +
            `  - Current stop: ${stops[closestStopIndex].name}\n` +
            `  - Next stop: ${stops[nextStopIndex].name}\n` +
            `  - Total segment length: ${distanceBetweenStops.toFixed(2)}m\n` +
            `  - Distance remaining to next: ${distanceToNextStop.toFixed(2)}m\n` +
            `  - Distance traveled in segment: ${distanceTraveled.toFixed(2)}m\n` +
            `  - Progress percentage: ${progress.toFixed(2)}%`
          );
          
          // Set the partial progress which will be used by the MapWeb component
          // to render the green progress bar between stops
          setPartialProgress(progress);
        }
        
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
        // Trigger alarm with notification
        if (notificationPermission) {
          notificationService.scheduleAlarmNotification(stops[destinationIndex].name);
        }
        setIsAlarmTriggered(true);
      }
      // Normal journey progress - keep Tappy sleeping
      else if (stopIndex < stops.length - 1) {
        // Always maintain sleeping state during normal journey
        setTappyState('sleeping');
        
        // Calculate stops remaining - only count the stops that are actually visible to the user
        const stopsRemaining = destinationIndex - stopIndex;
        
        // Format distance for display
        const formattedDistance = distanceToNext < 1000 ? 
          `${Math.round(distanceToNext)}m` : 
          `${(distanceToNext / 1000).toFixed(1)}km`;
        
        // Use singular or plural form based on the number of stops
        const stopText = stopsRemaining === 1 ? "1 stop away" : `${stopsRemaining} stops away`;
          
        setJourneyStatus(`Approaching: ${stops[stopIndex + 1].name} (${stopText})`);
      }
    };
    
    // Haversine formula to calculate distance between two points in meters
    // Using the unified haversineDistance function from geospatialUtils.ts
    // Note: haversineDistance returns distance in kilometers, so we multiply by 1000 for meters
    
    // Set up a more efficient interval for checking stops
    // This helps reduce the computational load while still maintaining accuracy
    stopCheckInterval = setInterval(() => {
      // Only perform intensive calculations if we have a valid location
      if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
        console.log('[JourneyTracking] Periodic stop check with current location:', currentLocation);
      }
    }, 10000); // Check every 10 seconds as a backup to the location updates
    
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
      
      // Calculate stops remaining - only count the stops that are actually visible to the user
      const stopsRemaining = destinationIndex - currentStopIndex;
      
      // Use singular or plural form based on the number of stops
      const stopText = stopsRemaining === 1 ? "1 stop away" : `${stopsRemaining} stops away`;
      
      setJourneyStatus(`Now approaching: ${stops[currentStopIndex+1]?.name || 'next stop'} (${stopText})`);
    }
  }, [currentStopIndex, isAlarmTriggered, stops, destinationIndex]);
  
  // Handle alarm activation (navigate to alarm screen)
  useEffect(() => {
    if (isAlarmTriggered) {
      // If app is in foreground, navigate to alarm screen
      if (appState.current === 'active') {
        router.push({
          pathname: '/alarm',
          params: { stopName }
        });
      }
      // If in background, notification will handle it when tapped
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
              {currentStopIndex >= startingStopIndex ? 1 + (currentStopIndex - startingStopIndex) : 1} of {destinationIndex - startingStopIndex + 1} stops
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
            partialProgress={partialProgress}
            currentLocation={currentLocation || undefined}
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