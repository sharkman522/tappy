import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Heart, Clock, Bus } from 'lucide-react-native';
import { haversineDistance, findKNearestBusStops, findClosestStop } from '@/utils/geospatialUtils';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';
import StopCard from '@/components/StopCard';
import TappyButton from '@/components/TappyButton';
import LoadingIndicator from '@/components/LoadingIndicator';

// Context and Hooks
import { useLTA } from '@/app/LTAApiContext';
import { useRouteStops, useBusArrivals, useTrainArrivals } from '@/utils/ltaDataProvider';
import { locationService } from '@/utils/locationService';

// Helper function to get color based on train line
const getLineColor = (line: string): string => {
  const lineCode = line?.toUpperCase() || '';
  
  if (lineCode.includes('NSL') || lineCode.includes('NORTH')) return '#D50000'; // Red
  if (lineCode.includes('EWL') || lineCode.includes('EAST')) return '#009B3A'; // Green
  if (lineCode.includes('NEL') || lineCode.includes('NORTH-EAST')) return '#9900AA'; // Purple
  if (lineCode.includes('CCL') || lineCode.includes('CIRCLE')) return '#FA9E0D'; // Orange
  if (lineCode.includes('DTL') || lineCode.includes('DOWNTOWN')) return '#0273C3'; // Blue
  if (lineCode.includes('TEL') || lineCode.includes('THOMSON')) return '#9D5B25'; // Brown
  
  return '#1F2937'; // Default dark gray
};

export default function RouteDetailsScreen() {
  console.log('[RouteDetailsScreen] Component rendering');
  const params = useLocalSearchParams();
  const { routeId, routeNumber, type, busStopCode: paramBusStopCode, description, stationCode, stationName, line, serviceNumber } = params;
  
  // For bus routes, extract the bus stop code from the route ID if not provided
  // Route ID format is "ServiceNo-BusStopCode" (e.g., "920-44339")
  let extractedBusStopCode: string | undefined;
  if (type === 'bus' && routeId) {
    console.log('[RouteDetailsScreen] Extracting bus stop code from route ID:', routeId);
    const idParts = (routeId as string).split('-');
    console.log('[RouteDetailsScreen] ID parts after splitting:', idParts);
    if (idParts.length > 1) {
      extractedBusStopCode = idParts[1];
      console.log('[RouteDetailsScreen] Extracted bus stop code:', extractedBusStopCode);
    } else {
      console.log('[RouteDetailsScreen] Could not extract bus stop code from route ID');
    }
  } else {
    console.log('[RouteDetailsScreen] Not a bus route or no routeId provided:', { type, routeId });
  }
  
  // Use the provided bus stop code or the extracted one
  const busStopCode = paramBusStopCode || extractedBusStopCode;
  console.log('[RouteDetailsScreen] Final bus stop code:', busStopCode);
  
  console.log('[RouteDetailsScreen] Params:', {
    routeId, routeNumber, type, busStopCode, description, stationCode, stationName, line, serviceNumber,
    extractedBusStopCode
  });
  
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [tappyMessage, setTappyMessage] = useState("Which stop would you like to travel to?");
  const [tappyAnimating, setTappyAnimating] = useState(false);
  const [closestStopIndex, setClosestStopIndex] = useState<number>(-1);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [stopsWithDistance, setStopsWithDistance] = useState<any[]>([]);
  
  // Get LTA context data
  const { favorites, toggleFavorite } = useLTA();
  
  // Determine the content type based on params
  const contentType = type as string || (routeNumber ? 'bus' : busStopCode ? 'busStop' : 'trainStation');
  console.log('[RouteDetailsScreen] Determined content type:', contentType);
  
  // State to toggle showing past stops
  const [showPastStops, setShowPastStops] = useState(false);
  
  // Get stops for this route (only for bus routes)
  const { stops, loading, error, directions, selectedDirection, changeDirection, allStops, autoSelectedDirection } = useRouteStops(
    contentType === 'bus' ? (serviceNumber as string || '') : '',
    1, // Default direction
    typeof busStopCode === 'string' ? busStopCode : undefined // Ensure busStopCode is a string
  );
  
  // Find the closest stop to the user's current location using the unified geospatial algorithm
  useEffect(() => {
    if (contentType !== 'bus' || stops.length === 0) return;
    
    const findClosestStopAndUpdate = async () => {
      setIsLoadingLocation(true);
      try {
        // Get user's current location
        const userLocation = await locationService.getCurrentLocation();
        console.log('[RouteDetailsScreen] User location:', userLocation);
        
        // Use the unified findClosestStop function from geospatialUtils with 1km max distance threshold
        const { closestStop, closestStopIndex, stopsWithDistance: updatedStopsWithDistance } = findClosestStop(
          userLocation.latitude,
          userLocation.longitude,
          stops,
          1 // 1km max distance threshold
        );
        
        // Store the updated stops with distance information
        setStopsWithDistance(updatedStopsWithDistance);
        
        if (closestStopIndex === -1) {
          console.log('[RouteDetailsScreen] No stops within 1km of user location');
          setClosestStopIndex(-1);
          setTappyMessage(`Where would you like to go? (No stops nearby)`); 
        } else {
          console.log('[RouteDetailsScreen] Closest stop index:', closestStopIndex, 
                      'Name:', stops[closestStopIndex]?.name, 
                      'Distance:', closestStop?.distance.toFixed(2) + 'km');
          setClosestStopIndex(closestStopIndex);
          setTappyMessage(`Where would you like to go?`);
        }
      } catch (error) {
        console.error('[RouteDetailsScreen] Error finding closest stop:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    };
    
    findClosestStopAndUpdate();
  }, [stops, contentType]);
  
  // We're now using the unified findClosestStop function from geospatialUtils
  // which internally uses haversineDistance for consistent calculations
  console.log('[RouteDetailsScreen] useRouteStops result:', { 
    stopsCount: stops?.length, 
    loading, 
    error,
    directions,
    selectedDirection
  });
  
  // Get bus arrivals for bus stop or bus route
  const { arrivals, loading: arrivalsLoading, error: arrivalsError } = useBusArrivals(
    (contentType === 'busStop' || contentType === 'bus') && busStopCode ? busStopCode as string : ''
  );
  console.log('[RouteDetailsScreen] useBusArrivals result:', { 
    arrivalsCount: arrivals?.length, 
    arrivalsLoading, 
    arrivalsError 
  });
  
  // Set appropriate Tappy message based on content type
  useEffect(() => {
    switch(contentType) {
      case 'bus':
        setTappyMessage("Which stop would you like to travel to?");
        break;
      case 'busStop':
        setTappyMessage(`Here are the services at ${description || 'this stop'}!`);
        break;
      case 'trainStation':
        setTappyMessage(`Welcome to ${stationName || 'the station'}!`);
        break;
      default:
        setTappyMessage("What would you like to do next?");
    }
  }, [contentType, description, stationName]);
  
  // Check if this route is a favorite
  const isFavorite = favorites.includes(routeId as string);
  
  // Handle stop selection
  const handleStopSelect = (stopId: string, stopName: string) => {
    setSelectedStop(stopId);
    setTappyMessage(`Great choice! We're going to ${stopName}!`);
    setTappyAnimating(true);
    
    setTimeout(() => {
      setTappyAnimating(false);
    }, 1500);
  };
  
  // We no longer need this function since we're hiding stops that are behind the user
  // Instead of showing an error message
  
  // Start journey with selected stop
  const startJourney = async () => {
    if (!selectedStop) {
      setTappyMessage("Please select a stop first!");
      setTappyAnimating(true);
      setTimeout(() => setTappyAnimating(false), 1500);
      return;
    }
    
    // Get selected stop details
    const selectedStopDetails = stops.find(s => s.id === selectedStop);
    
    if (!selectedStopDetails) {
      setTappyMessage("Oops, can't find that stop!");
      return;
    }
    
    // Set loading state while getting location
    setTappyMessage("Finding the nearest stop to start your journey...");
    
    try {
      // Get user's current location
      const userLocation = await locationService.getCurrentLocation();
      console.log('[RouteDetailsScreen] User location for journey:', userLocation);
      
      // Navigate to journey screen with user's location
      router.push({
        pathname: '/journey-tracking',
        params: { 
          routeId: routeId as string, 
          routeNumber: routeNumber as string, 
          stopId: selectedStop,
          stopName: selectedStopDetails.name,
          userLat: userLocation.latitude.toString(),
          userLng: userLocation.longitude.toString()
        }
      });
    } catch (error) {
      console.error('[RouteDetailsScreen] Error getting location:', error);
      // Fall back to regular navigation without location
      router.push({
        pathname: '/journey-tracking',
        params: { 
          routeId: routeId as string, 
          routeNumber: routeNumber as string, 
          stopId: selectedStop,
          stopName: selectedStopDetails.name
        }
      });
    }
  };
  
  // Toggle favorite status
  const handleToggleFavorite = async () => {
    try {
      console.log('Toggling favorite for route in route-details:', routeId);
      
      // Check current favorite status
      const isFavorite = favorites.includes(routeId as string);
      console.log('Current favorite status:', isFavorite);
      
      // Update UI immediately for better UX
      setTappyMessage(isFavorite ? 
        "Removing from favorites..." : 
        "Adding to favorites...");
      
      // Toggle favorite status
      await toggleFavorite(routeId as string);
      
      // Update UI with confirmation message
      setTappyMessage(isFavorite ? 
        "This route has been removed from your favorites." : 
        "This route has been added to your favorites!");
      
      // Reset message after 3 seconds
      setTimeout(() => {
        setTappyMessage("Which stop would you like to travel to?");
      }, 3000);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setTappyMessage("Sorry, I couldn't update your favorites right now.");
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {contentType === 'bus' ? routeNumber : 
           contentType === 'busStop' ? `Stop #${busStopCode}` : 
           stationName}
        </Text>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
        >
          <Heart 
            size={24} 
            color={isFavorite ? '#FF8A65' : '#9CA3AF'} 
            fill={isFavorite ? '#FF8A65' : 'none'}
          />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Tappy Character & Speech Bubble */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression="happy" 
            size="medium"
            animationType={tappyAnimating ? 'dance' : 'none'}
          />
          <SpeechBubble 
            text={tappyMessage} 
            position="top" 
            style={styles.speechBubble}
          />
        </View>
        
        {contentType === 'bus' ? (
          /* Bus Route Stops List */
          <View style={styles.stopsContainer}>
            <Text style={styles.sectionTitle}>Stops</Text>
            
            {/* Direction Selector */}
            {Object.keys(directions).length > 1 && (
              <View style={styles.directionSelector}>
                <Text style={styles.directionLabel}>Direction:</Text>
                <View style={styles.directionButtonsContainer}>
                  {Object.entries(directions).map(([dirKey, dirLabel]) => {
                    const directionNumber = parseInt(dirKey, 10);
                    const isSelected = directionNumber === selectedDirection;
                    return (
                      <TouchableOpacity
                        key={dirKey}
                        style={[styles.directionButton, isSelected && styles.selectedDirectionButton]}
                        onPress={() => changeDirection(directionNumber)}
                      >
                        <Text style={[styles.directionButtonText, isSelected && styles.selectedDirectionButtonText]}>
                          {dirLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            
            {/* Past Stops Toggle */}
            {contentType === 'bus' && allStops && allStops.some(stop => stop.isPassed) && (
              <View style={styles.sectionHeader}>
                <TouchableOpacity 
                  style={styles.directionButton}
                  onPress={() => setShowPastStops(!showPastStops)}
                >
                  <Text style={styles.directionButtonText}>
                    {showPastStops ? 'Hide Past Stops' : 'Show Past Stops'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.sectionSubtitle}>
                  {showPastStops ? 'Showing all stops' : 'Showing upcoming stops only'}
                </Text>
              </View>
            )}
            
            {isLoadingLocation || loading ? (
              <LoadingIndicator message={isLoadingLocation ? "Finding closest stop..." : "Loading stops..."} />
            ) : error ? (
              <Text style={styles.errorText}>
                {error}
                Could not load stops for this route. Please try again later.
              </Text>
            ) : stops.length > 0 || (allStops && allStops.length > 0) ? (
              // Show either filtered stops (future only) or all stops based on toggle
              // Include the closest stop and all stops after it
              (showPastStops && allStops ? allStops : stops)
                .filter((stop, index) => closestStopIndex === -1 || index >= closestStopIndex)
                .map((stop, index, filteredArray) => {
                  // Recalculate the stops away based only on the visible stops
                  let displayTime = stop.time;
                  
                  // If it's not a passed stop, recalculate the stops away
                  if (!stop.isPassed) {
                    const stopsAway = index + 1; // +1 because index is 0-based
                    displayTime = stopsAway === 1 ? '1 stop away' : `${stopsAway} stops away`;
                  }
                  
                  // Find the matching stop with distance information
                  const stopWithDistance = stopsWithDistance.find(s => s.id === stop.id) || stop;
                  
                  // Add distance information if available
                  const distanceText = stopWithDistance.distance ? 
                    ` (${(stopWithDistance.distance * 1000).toFixed(0)}m)` : 
                    '';
                  
                  // Determine if this is the closest stop to the user's current location
                  // Only mark as current if closestStopIndex is valid (not -1)
                  const isCurrentStop = closestStopIndex !== -1 && stops.indexOf(stop) === closestStopIndex;
                  
                  return (
                    <StopCard
                      key={`${stop.id}-${stop.stopSequence || index}`}
                      stopName={stop.name}
                      estimatedTime={`${displayTime}${distanceText}`}
                      isDestination={stop.id === selectedStop}
                      isCurrent={isCurrentStop}
                      onPress={() => handleStopSelect(stop.id, stop.name)}
                    />
                  );
                })
            ) : (
              <Text style={styles.emptyText}>No stops available for this route.</Text>
            )}
          </View>
        ) : contentType === 'busStop' ? (
          /* Bus Stop Details */
          <View style={styles.stopsContainer}>
            <Text style={styles.sectionTitle}>Bus Stop Details</Text>
            <View style={styles.detailsCard}>
              <Text style={styles.detailTitle}>{description}</Text>
              <Text style={styles.detailSubtitle}>Bus Stop Code: {busStopCode}</Text>
            </View>
            
            <Text style={styles.sectionTitle}>Services</Text>
            {arrivalsLoading ? (
              <LoadingIndicator message="Loading services..." />
            ) : arrivalsError ? (
              <Text style={styles.errorText}>
                Could not load bus services. Please try again later.
              </Text>
            ) : arrivals.length > 0 ? (
              arrivals.map((arrival, index) => (
                <View key={`${arrival.serviceNo}-${index}`} style={styles.arrivalCard}>
                  <View style={styles.arrivalHeader}>
                    <View style={styles.serviceNoContainer}>
                      <Bus size={16} color="#4B5563" />
                      <Text style={styles.serviceNo}>{arrival.serviceNo}</Text>
                    </View>
                    <Text style={styles.operatorText}>{arrival.operator}</Text>
                  </View>
                  
                  <View style={styles.arrivalTimesContainer}>
                    <View style={styles.arrivalTime}>
                      <Clock size={14} color="#4B5563" />
                      <Text style={styles.arrivalTimeText}>
                        {arrival.nextBus}
                      </Text>
                    </View>
                    
                    {arrival.nextBus2 !== 'N/A' && (
                      <View style={styles.arrivalTime}>
                        <Clock size={14} color="#4B5563" />
                        <Text style={styles.arrivalTimeText}>
                          {arrival.nextBus2}
                        </Text>
                      </View>
                    )}
                    
                    {arrival.nextBus3 !== 'N/A' && (
                      <View style={styles.arrivalTime}>
                        <Clock size={14} color="#4B5563" />
                        <Text style={styles.arrivalTimeText}>
                          {arrival.nextBus3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No bus services available at this time.</Text>
            )}
          </View>
        ) : (
          /* Train Station Details */
          <View style={styles.stopsContainer}>
            <Text style={styles.sectionTitle}>Train Station Details</Text>
            <View style={styles.detailsCard}>
              <Text style={styles.detailTitle}>{stationName}</Text>
              <Text style={styles.detailSubtitle}>Line: {line}</Text>
              <Text style={styles.detailSubtitle}>Station Code: {stationCode}</Text>
            </View>
            
            <Text style={styles.sectionTitle}>Services</Text>
            {/* Fetch real train services */}
            {(() => {
              // Use the train arrivals hook
              const { arrivals, loading, error } = useTrainArrivals(stationCode as string);
              
              if (loading) {
                return <LoadingIndicator message="Loading train services..." />;
              }
              
              if (error) {
                return (
                  <Text style={styles.errorText}>
                    Could not load train services. Please try again later.
                  </Text>
                );
              }
              
              if (!arrivals || arrivals.length === 0) {
                return (
                  <Text style={styles.emptyText}>No train services available at this time.</Text>
                );
              }
              
              return arrivals.map((service, index) => (
                <View key={`${service.TrainLine}-${index}`} style={styles.arrivalCard}>
                  <View style={styles.arrivalHeader}>
                    <View style={styles.serviceNoContainer}>
                      <Text style={[styles.serviceNo, { color: getLineColor(service.TrainLine) }]}>
                        {service.TrainLine}
                      </Text>
                    </View>
                    <Text style={styles.operatorText}>
                      {service.Operator || 'SMRT'}
                    </Text>
                  </View>
                  
                  <View style={styles.arrivalTimesContainer}>
                    {service.NextTrain && (
                      <View style={styles.arrivalTime}>
                        <Clock size={14} color="#4B5563" />
                        <Text style={styles.arrivalTimeText}>
                          {service.NextTrain.TimeToArrival <= 1 ? 'Arriving' : `${service.NextTrain.TimeToArrival} mins`}
                        </Text>
                      </View>
                    )}
                    
                    {service.NextTrain2 && (
                      <View style={styles.arrivalTime}>
                        <Clock size={14} color="#4B5563" />
                        <Text style={styles.arrivalTimeText}>
                          {service.NextTrain2.TimeToArrival} mins
                        </Text>
                      </View>
                    )}
                    
                    {service.NextTrain3 && (
                      <View style={styles.arrivalTime}>
                        <Clock size={14} color="#4B5563" />
                        <Text style={styles.arrivalTimeText}>
                          {service.NextTrain3.TimeToArrival} mins
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ));
            })()}
          </View>
        )}
      </ScrollView>
      
      {/* Ride with Tappy Button - only show for bus routes with selected stop */}
      {contentType === 'bus' && selectedStop && (
        <View style={styles.bottomContainer}>
          <TappyButton
            title="Start Journey with Tappy!"
            onPress={startJourney}
            type="primary"
            size="large"
            style={styles.rideButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  favoriteButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  // Details card styles
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 3,
  },
  // Bus arrival card styles
  arrivalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  arrivalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceNoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceNo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 4,
  },
  operatorText: {
    fontSize: 12,
    color: '#6B7280',
  },
  arrivalTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  arrivalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  arrivalTimeText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 4,
  },
  tappyContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  speechBubble: {
    maxWidth: '80%',
    marginBottom: 20,
  },
  stopsContainer: {
    marginTop: 10,
    marginBottom: 80, // Space for bottom button
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  errorText: {
    textAlign: 'center',
    color: '#EF4444',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontStyle: 'italic',
    padding: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rideButton: {
    width: '100%',
  },
  // Direction selector styles
  directionSelector: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 15,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  directionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  directionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
    flex: 1,
    minWidth: '48%',
  },
  selectedDirectionButton: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  directionButtonText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  selectedDirectionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sectionHeader: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 15,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});