import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MapPin, TriangleAlert as AlertTriangle, Clock } from 'lucide-react-native';
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
import * as ltaService from '@/services/lta-service';
import { BusArrival } from '@/types/lta-api';

export default function JourneyTrackingScreen() {
  const { 
    routeId, 
    routeNumber, 
    stopId, 
    stopName, 
    userLat, 
    userLng, 
    closestStopId, 
    closestStopIndex, 
    closestStopDistance 
  } = useLocalSearchParams();
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [journeyStatus, setJourneyStatus] = useState('Starting your journey...');
  const [tappyState, setTappyState] = useState<'sleeping' | 'happy' | 'alert'>('sleeping');
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [partialProgress, setPartialProgress] = useState<number>(0);
  const [busArrivals, setBusArrivals] = useState<BusArrival[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  const [showArrivals, setShowArrivals] = useState(false);
  // Test mode completely removed as requested
  const [locationPermission, setLocationPermission] = useState(true);
  const [gpsError, setGpsError] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Get stops for this route from the LTA API
  const { stops: originalStops, loading, error } = useRouteStops(
    routeNumber as string,
    1, // Default direction
    stopId as string // Pass the stopId to auto-select the direction
  );
  
  // State to hold the sliced stops (from closest stop to the end)
  const [stops, setStops] = useState<any[]>([]);
  
  // Find destination stop index (the stop the user wants to go to) in the sliced array
  // This will always be the last stop in our sliced array if we have a valid destination
  const destinationIndex = stops && stops.length > 0 ? stops.length - 1 : -1;
  
  // The closest stop will become index 0 in our journey
  // We'll store the original index for reference
  const [originalClosestStopIndex, setOriginalClosestStopIndex] = useState(
    closestStopIndex ? parseInt(closestStopIndex as string, 10) : -1
  );
  
  // We'll always start at index 0 since we're slicing the stops array
  const [startingStopIndex, setStartingStopIndex] = useState(0);
  
  // Use the unified haversineDistance function from geospatialUtils
  // This ensures consistent distance calculations across the entire application
  // Note: haversineDistance returns distance in kilometers, so we multiply by 1000 for meters when needed

  // Function to fetch bus arrivals for the current stop
  const fetchBusArrivals = async (busStopCode: string) => {
    try {
      setLoadingArrivals(true);
      console.log(`[JourneyTracking] Fetching bus arrivals for stop ${busStopCode}`);
      
      // Make sure busStopCode is valid before making the API call
      if (!busStopCode) {
        console.warn('[JourneyTracking] Invalid bus stop code, skipping arrivals fetch');
        setLoadingArrivals(false);
        return;
      }
      
      const arrivals = await ltaService.getBusArrivals(busStopCode);
      
      // Filter arrivals to only show the current route
      if (arrivals && Array.isArray(arrivals)) {
        const filteredArrivals = arrivals.filter(arrival => arrival.ServiceNo === routeNumber);
        console.log(`[JourneyTracking] Filtered ${filteredArrivals.length} arrivals for route ${routeNumber}`);
        setBusArrivals(filteredArrivals);
      } else {
        console.warn('[JourneyTracking] No arrivals data returned');
        setBusArrivals([]);
      }
      
      setLoadingArrivals(false);
    } catch (error) {
      console.error('[JourneyTracking] Error fetching bus arrivals:', error);
      setLoadingArrivals(false);
      setBusArrivals([]);
    }
  };

  // Process the stops array when originalStops changes
  useEffect(() => {
    if (!originalStops || originalStops.length === 0) return;
    
    // Find the closest stop index from the passed parameter or use 0 as default
    const closestIdx = closestStopIndex ? parseInt(closestStopIndex as string, 10) : 0;
    
    // Validate the index
    if (closestIdx >= 0 && closestIdx < originalStops.length) {
      // Store the original index for reference
      setOriginalClosestStopIndex(closestIdx);
      
      // Find the destination index in the original stops array
      const originalDestinationIndex = originalStops.findIndex(stop => stop.id === stopId);
      
      // Slice the stops array to start from the closest stop and end at the destination
      let slicedStops;
      if (originalDestinationIndex !== -1 && originalDestinationIndex >= closestIdx) {
        // If destination is valid and after the closest stop, slice from closest to destination (inclusive)
        slicedStops = originalStops.slice(closestIdx, originalDestinationIndex + 1);
        console.log(`[JourneyTracking] Sliced stops array from index ${closestIdx} to destination index ${originalDestinationIndex}, new length: ${slicedStops.length}`);
      } else if (originalDestinationIndex !== -1 && originalDestinationIndex < closestIdx) {
        // If destination is before the closest stop, we've already passed it - use only the closest stop
        slicedStops = [originalStops[closestIdx]];
        console.log(`[JourneyTracking] Destination already passed, using only closest stop at index ${closestIdx}`);
      } else {
        // If no valid destination, slice from closest stop to the end
        slicedStops = originalStops.slice(closestIdx);
        console.log(`[JourneyTracking] No valid destination, sliced stops array from index ${closestIdx}, new length: ${slicedStops.length}`);
      }
      
      setStops(slicedStops);
      
      // Reset current stop index to 0 since we've sliced the array
      setCurrentStopIndex(0);
    } else {
      // If invalid index, use the full array
      setStops(originalStops);
      console.log('[JourneyTracking] Using full stops array, length:', originalStops.length);
    }
  }, [originalStops, closestStopIndex]);
  
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
        
        // Since we've already sliced the stops array, we're always starting at index 0
        setCurrentStopIndex(0);
        console.log('[JourneyTracking] Starting journey from index 0 (closest stop):', stops[0]?.name);
        
        // If we have a valid destination, log it
        if (destinationIndex !== -1 && stops.length > 0) {
          console.log('[JourneyTracking] Destination stop:', 
                    'Index:', destinationIndex, 
                    'Name:', stops[destinationIndex]?.name, 
                    'ID:', stops[destinationIndex]?.id);
        }
        
        // Since we're at the first stop in the route (after slicing), fetch bus arrivals
        if (stops.length > 0 && stops[0] && stops[0].id) {
          fetchBusArrivals(stops[0].id);
          setShowArrivals(true);
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
    if (stops && stops.length > 0) {
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
        
        // We're always starting at index 0 since we sliced the array
        // Don't go backward in the route - only move forward
        if (closestStopIndex > currentStopIndex) {
          setCurrentStopIndex(closestStopIndex);
        }
        
        // Calculate distance to next stop (in meters)
        const nextStopIndex = Math.min(closestStopIndex + 1, stops.length - 1);
        
        // Make sure the next stop exists and has coordinates before calculating distance
        let distanceToNextStop = 0;
        if (nextStopIndex < stops.length && stops[nextStopIndex] && 
            stops[nextStopIndex].coordinates && 
            stops[nextStopIndex].coordinates.latitude !== undefined && 
            stops[nextStopIndex].coordinates.longitude !== undefined) {
          // Use haversineDistance for consistent calculations (returns km, so multiply by 1000 for meters)
          distanceToNextStop = haversineDistance(
            location.latitude,
            location.longitude,
            stops[nextStopIndex].coordinates.latitude,
            stops[nextStopIndex].coordinates.longitude
          ) * 1000;
        }
        
        // Calculate distance to destination stop (in meters)
        let distanceToDestination = 0;
        if (destinationIndex >= 0 && destinationIndex < stops.length && 
            stops[destinationIndex] && stops[destinationIndex].coordinates && 
            stops[destinationIndex].coordinates.latitude !== undefined && 
            stops[destinationIndex].coordinates.longitude !== undefined) {
          distanceToDestination = haversineDistance(
            location.latitude,
            location.longitude,
            stops[destinationIndex].coordinates.latitude,
            stops[destinationIndex].coordinates.longitude
          ) * 1000;
        }
        
        // Calculate partial progress between current stop and next stop
        if (closestStopIndex < stops.length - 1 && 
            closestStopIndex >= 0 && nextStopIndex >= 0 && 
            closestStopIndex < stops.length && nextStopIndex < stops.length && 
            stops[closestStopIndex] && stops[nextStopIndex] && 
            stops[closestStopIndex].coordinates && stops[nextStopIndex].coordinates &&
            stops[closestStopIndex].coordinates.latitude && stops[closestStopIndex].coordinates.longitude &&
            stops[nextStopIndex].coordinates.latitude && stops[nextStopIndex].coordinates.longitude) {
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
          
          // If we're at the first stop, show arrivals
          if (closestStopIndex === 0) {
            if (!showArrivals) {
              setShowArrivals(true);
              // Fetch bus arrivals for the first stop
              if (stops[closestStopIndex] && stops[closestStopIndex].id) {
                const busStopCode = stops[closestStopIndex].id;
                fetchBusArrivals(busStopCode);
              }
            }
          } else {
            setShowArrivals(false);
          }
          
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
    if (stops.length === 0 || destinationIndex === -1) return;
    
    // Make sure the destination index is valid
    if (destinationIndex >= 0 && destinationIndex < stops.length) {
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
        
        // Make sure the next stop index is valid
        const nextStopIndex = currentStopIndex + 1;
        const nextStopName = nextStopIndex < stops.length ? stops[nextStopIndex]?.name : 'next stop';
        
        setJourneyStatus(`Now approaching: ${nextStopName} (${stopText})`);
      }
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
            partialProgress={partialProgress}
            currentLocation={currentLocation || undefined}
          />
          
          {/* Bus Arrivals Panel - Only shown when at the first stop */}
          {showArrivals && currentStopIndex === 0 && (
            <View style={styles.arrivalsPanel}>
              <View style={styles.arrivalsPanelHeader}>
                <Clock size={18} color="#4B5563" />
                <Text style={styles.arrivalsPanelTitle}>Bus Arrivals</Text>
              </View>
              
              {loadingArrivals ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : busArrivals.length > 0 ? (
                <View style={styles.arrivalsList}>
                  {busArrivals.map((arrival, index) => (
                    <View key={index} style={styles.arrivalItem}>
                      <Text style={styles.busNumber}>{arrival.ServiceNo}</Text>
                      <View style={styles.arrivalTimes}>
                        {arrival.NextBus && (
                          <View style={styles.nextBusContainer}>
                            <Text style={styles.nextBusLabel}>Next:</Text>
                            <Text style={styles.nextBusTime}>
                              {ltaService.formatArrivalTime(arrival.NextBus.EstimatedArrival)}
                            </Text>
                          </View>
                        )}
                        {arrival.NextBus2 && (
                          <View style={styles.nextBusContainer}>
                            <Text style={styles.nextBusLabel}>Then:</Text>
                            <Text style={styles.nextBusTime}>
                              {ltaService.formatArrivalTime(arrival.NextBus2.EstimatedArrival)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noArrivalsText}>No arrivals information available</Text>
              )}
            </View>
          )}
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
  arrivalsPanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  arrivalsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrivalsPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  arrivalsList: {
    gap: 12,
  },
  arrivalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 60,
    textAlign: 'center',
  },
  arrivalTimes: {
    flexDirection: 'row',
    gap: 16,
  },
  nextBusContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  nextBusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  nextBusTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  noArrivalsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});