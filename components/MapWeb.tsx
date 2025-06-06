import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { MapPin, Bus, Train, ArrowRight } from 'lucide-react-native';

interface MapWebProps {
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

export default function MapWeb(props: MapWebProps) {
  const {
    stops,
    currentStopIndex,
    destinationStopIndex,
    partialProgress,
    currentLocation
  } = props;
  // Track the highest progress values to prevent reversal
  const [highestProgress, setHighestProgress] = React.useState(0);
  const [highestVerticalProgress, setHighestVerticalProgress] = React.useState<{[key: string]: number}>({});
  // Show all stops in the route
  const visibleStops = stops;
  
  // Reference to the current stop for scrolling
  const currentStopRef = React.useRef<View | null>(null);
  // Create a ref for the ScrollView
  const scrollViewRef = React.useRef<ScrollView>(null);
  // Create refs for each stop item to measure their positions
  const stopRefs = React.useRef<Array<View | null>>([]);
  
  // Initialize the refs array based on the number of visible stops
  React.useEffect(() => {
    stopRefs.current = Array(visibleStops.length).fill(null);
  }, [visibleStops.length]);
  // Determine which stops are passed, current, next, or upcoming
  const getStopStatus = (index: number) => {
    // Calculate the actual stop index in the full stops array
    const actualStopIndex = currentStopIndex + index;
    
    // Check if this stop is before the current stop (passed)
    if (actualStopIndex < currentStopIndex) return 'passed';
    // Check if this is the current stop
    if (actualStopIndex === currentStopIndex) return 'current';
    // Check if this is the destination stop (last stop in the route)
    if (actualStopIndex === stops.length - 1) return 'destination';
    // Otherwise it's an upcoming stop
    return 'upcoming';
  };

  // Get color based on stop status
  const getStopColor = (status: string) => {
    switch (status) {
      case 'passed': return '#9CA3AF';
      case 'current': return '#4BB377';
      case 'destination': return '#FF8A65';
      default: return '#6B7280';
    }
  };

  // Calculate progress percentage based on the journey from current to destination
  const totalStopsInJourney = destinationStopIndex - currentStopIndex;
  
  // Calculate progress as a percentage of completed stops
  let currentProgress = 0;
  if (totalStopsInJourney > 0) {
    // Calculate base progress based on completed stops
    const completedStops = currentStopIndex; // Use the actual current stop index
    
    // Add partial progress to next stop based on real location data
    // This creates the dynamic movement between stops
    const progressValue = partialProgress !== undefined ? partialProgress : 0;
    
    // Calculate total progress percentage
    currentProgress = ((completedStops / totalStopsInJourney) * 100) + 
                     ((progressValue / 100) * (100 / totalStopsInJourney));
  } else if (currentStopIndex >= destinationStopIndex) {
    // Already at or past destination
    currentProgress = 100;
  }
  
  // Ensure progress never decreases
  const progress = Math.max(currentProgress, highestProgress);
  
  // Update highest progress if current progress is higher
  React.useEffect(() => {
    if (progress > highestProgress) {
      setHighestProgress(progress);
    }
  }, [progress, highestProgress]);
  
  // Function to calculate connector progress for each segment
  const getConnectorProgress = (stopIndex: number) => {
    // Calculate progress for this specific connector
    const connectorId = `connector-${stopIndex}`;
    
    // Base progress is proportional to overall journey progress
    let connectorProgress = 0;
    
    // If this is a past stop (before the current stop), it's 100% filled
    if (stopIndex < currentStopIndex) {
      // All previous stops should be 100% filled
      connectorProgress = 100;
      console.log(`[MapWeb] Connector ${stopIndex} is a past stop, setting to 100%`);
    }
    // If this is the current stop's connector, it's also 100% filled
    else if (stopIndex === currentStopIndex) {
      connectorProgress = 100;
      console.log(`[MapWeb] Connector ${stopIndex} is the current stop, setting to 100%`);
    }
    // If we're at the stop just after the current stop, show partial progress
    else if (stopIndex === currentStopIndex + 1) {
      // Use the partial progress from props if available, otherwise calculate it
      if (partialProgress !== undefined) {
        // Use the partialProgress directly - this value now represents the percentage
        // of the total potential distance between stops that has been traveled
        connectorProgress = partialProgress;
        console.log(`[MapWeb] Using partialProgress for connector ${stopIndex}: ${partialProgress}%`);
      } else {
        // Fallback calculation if partialProgress is not provided
        const segmentProgress = (progress % (100 / totalStopsInJourney)) * totalStopsInJourney;
        connectorProgress = Math.min(100, segmentProgress * 2); // Amplify for better visual effect
        console.log(`[MapWeb] Using fallback progress for connector ${stopIndex}: ${connectorProgress}%`);
      }
    }
    
    // Get the highest progress for this connector
    const highest = highestVerticalProgress[connectorId] || 0;
    
    // Update highest progress for this connector if needed
    if (connectorProgress > highest) {
      setHighestVerticalProgress(prev => ({
        ...prev,
        [connectorId]: connectorProgress
      }));
      return connectorProgress;
    }
    
    return highest;
  };

  // Scroll to the current stop when visibleStops changes or currentStopIndex changes
  React.useEffect(() => {
    // Ensure we have a valid ScrollView
    if (scrollViewRef.current && visibleStops.length > 0) {
      // Use a timeout to ensure the view has been laid out
      setTimeout(() => {
        // Get the current stop ref based on the currentStopIndex
        const currentStopRef = stopRefs.current[currentStopIndex];
        
        // If we have a reference to the current stop view, scroll to it
        if (currentStopRef) {
          // Find the y-position of the current stop in the scrollview
          currentStopRef.measureLayout(
            // @ts-ignore - This is a valid call but TypeScript doesn't recognize it
            scrollViewRef.current,
            (_, y) => {
              // Scroll to position with offset to center it
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 150), // Center in view with some offset
                animated: true,
              });
              console.log(`[MapWeb] Scrolling to current stop: ${stops[currentStopIndex]?.name}`);
            },
            () => console.log('Failed to measure layout')
          );
        }
      }, 100);
    }
  }, [visibleStops, currentStopIndex, stops]);

  return (
    <View style={styles.container}>
      {/* Visual Route Map */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.routeMapContainer}>
          {/* Route Type Indicator */}
          <View style={styles.routeTypeContainer}>
            {stops[0]?.name.toLowerCase().includes('bus') ? (
              <Bus size={24} color="#4BB377" />
            ) : (
              <Bus size={24} color="#4BB377" />
            )}
          </View>

          {/* Stops Visualization */}
          <View style={styles.stopsContainer}>
            {visibleStops.map((stop, index) => {
              const status = getStopStatus(index);
              const color = getStopColor(status);
              // The destination is always the last stop in the route
              const isDestination = index === stops.length - 1;
              // The current stop is the one that matches the currentStopIndex from props
              const isCurrent = index === currentStopIndex;
              
              return (
                <View 
                  key={stop.id} 
                  style={styles.stopItem}
                  ref={ref => {
                    // Store reference to all stops
                    stopRefs.current[index] = ref;
                    
                    // Store special reference to current stop for scrolling
                    if (isCurrent) {
                      currentStopRef.current = ref;
                    }
                  }}>
                  {/* Connector line */}
                  {index > 0 && (
                    <>
                      {/* Road-like connector with dashed center line */}
                      <View 
                        style={[
                          styles.connectorLine, 
                          { 
                            backgroundColor: '#D1D5DB', // Base road color
                          }
                        ]} 
                      />
                      
                      {/* Center line (dashed yellow line) */}
                      <View 
                        style={[
                          styles.connectorCenterLine, 
                        ]} 
                      />
                      
                      {/* Progress fill for the connector */}
                      <View 
                        style={[
                          styles.connectorProgress, 
                          { 
                            height: `${getConnectorProgress(index)}%`,
                            backgroundColor: '#4BB377', // Progress color
                            top: -25, // Start from top
                          }
                        ]} 
                      />
                    </>
                  )}
                  
                  {/* Stop Circle */}
                  <View 
                    style={[
                      styles.stopCircle, 
                      { 
                        backgroundColor: color,
                        borderWidth: (isDestination || isCurrent) ? 3 : 0,
                        borderColor: color,
                        width: isDestination ? 12 : 12,
                        height: isDestination ? 12 : 12,
                      }
                    ]} 
                  />
                  
                  {/* Stop Info */}
                  <View style={styles.stopInfo}>
                    <Text 
                      style={[
                        styles.stopName, 
                        { 
                          color: color,
                          fontWeight: (isDestination || isCurrent) ? '700' : '400'
                        }
                      ]}
                    >
                      {stop.name}
                      {isDestination && ' (Destination)'}
                      {isCurrent && ' (Current)'}
                    </Text>
                    
                    {/* Current position indicator */}
                    {isCurrent && (
                      <View style={styles.currentPositionBadge}>
                        <Text style={styles.currentPositionText}>You are here</Text>
                      </View>
                    )}
                    
                    {/* Upcoming indicator - only show for future stops */}
                    {!isCurrent && !isDestination && index > currentStopIndex && (
                      <Text style={styles.stopDetailText}>
                        Upcoming
                      </Text>
                    )}
                    
                    {/* Past stop indicator */}
                    {index < currentStopIndex && (
                      <Text style={[styles.stopDetailText, { color: '#9CA3AF' }]}>
                        Passed
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Progress bar at bottom of map */}
      <View style={styles.progressBarContainer}>
        <View style={styles.journeySummary}>
          <View style={styles.journeyPoint}>
            <MapPin size={16} color="#4BB377" />
            <Text style={styles.journeyPointText}>{stops[currentStopIndex]?.name || 'Current'}</Text>
          </View>
          <ArrowRight size={16} color="#9CA3AF" />
          <View style={styles.journeyPoint}>
            <MapPin size={16} color="#FF8A65" />
            <Text style={[styles.journeyPointText, styles.destinationText]}>
              {stops[stops.length - 1]?.name || 'Destination'}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressBarTrack}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progress}%` }
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
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    marginBottom: 100, // Space for the progress bar
  },
  scrollViewContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  routeMapContainer: {
    padding: 20,
    flexDirection: 'row',
  },
  routeTypeContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 15,
  },
  stopsContainer: {
    flex: 1,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center', // Center align items vertically
    marginBottom: 35,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    width: 8, // Wider to look like a road
    height: 40, // Height needs to match the marginBottom of stopItem plus some adjustment
    backgroundColor: '#D1D5DB',
    left: 2, // Centered with the stop circle
    top: -25,
    zIndex: 1,
    borderRadius: 4, // Slightly rounded edges
  },
  connectorCenterLine: {
    position: 'absolute',
    width: 2, // Thin center line
    height: 40,
    backgroundColor: '#FFCC00', // Yellow center line
    left: 5, // Centered within the connector
    top: -25,
    zIndex: 2,
    opacity: 0.7,
    // Dashed effect
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#FFCC00',
  },
  connectorProgress: {
    position: 'absolute',
    width: 8, // Same as connector
    height: '0%', // Will be dynamically set
    backgroundColor: '#4BB377',
    left: 2, // Same as connector
    zIndex: 2,
    borderRadius: 4, // Slightly rounded edges
  },
  stopCircle: {
    width: 12,
    height: 12,
    borderRadius: 10,
    backgroundColor: '#6B7280',
    marginRight: 15,
    marginTop: 4,
    zIndex: 3, // Higher than the connector
    alignSelf: 'center', // Center horizontally
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  stopDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  currentPositionBadge: {
    backgroundColor: '#4BB377',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  currentPositionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  journeySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  journeyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  journeyPointText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  destinationText: {
    color: '#FF8A65',
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