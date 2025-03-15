import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { MapPin, Bus, Brain as Train, ArrowRight } from 'lucide-react-native';

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
}

export default function MapWeb({
  stops,
  currentStopIndex,
  destinationStopIndex,
}: MapWebProps) {
  // Create a ref for the ScrollView
  const scrollViewRef = React.useRef<ScrollView>(null);
  // Create refs for each stop item to measure their positions
  const stopRefs = React.useRef<Array<View | null>>([]);
  
  // Initialize the refs array based on the number of stops
  React.useEffect(() => {
    stopRefs.current = Array(stops.length).fill(null);
  }, [stops.length]);
  // Determine which stops are passed, current, next, or upcoming
  const getStopStatus = (index: number) => {
    if (index < currentStopIndex) return 'passed';
    if (index === currentStopIndex) return 'current';
    if (index === destinationStopIndex) return 'destination';
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

  // Calculate progress percentage
  const progress = stops.length > 1 
    ? (currentStopIndex / (stops.length - 1)) * 100 
    : 0;

  // Scroll to the current stop when currentStopIndex changes
  React.useEffect(() => {
    // Ensure we have a valid index and the ScrollView is available
    if (currentStopIndex >= 0 && currentStopIndex < stops.length && scrollViewRef.current) {
      // Use a timeout to ensure the view has been laid out
      setTimeout(() => {
        // Get the current stop ref
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
            },
            () => console.log('Failed to measure layout')
          );
        }
      }, 100);
    }
  }, [currentStopIndex, stops.length]);

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
              <Train size={24} color="#4BB377" />
            )}
          </View>

          {/* Stops Visualization */}
          <View style={styles.stopsContainer}>
            {stops.map((stop, index) => {
              const status = getStopStatus(index);
              const color = getStopColor(status);
              const isDestination = index === destinationStopIndex;
              const isCurrent = index === currentStopIndex;
              
              return (
                <View 
                  key={stop.id} 
                  style={styles.stopItem}
                  ref={ref => stopRefs.current[index] = ref}>
                  {/* Connector line */}
                  {index > 0 && (
                    <View 
                      style={[
                        styles.connectorLine, 
                        { 
                          backgroundColor: index <= currentStopIndex ? '#4BB377' : '#D1D5DB'
                        }
                      ]} 
                    />
                  )}
                  
                  {/* Stop Circle */}
                  <View 
                    style={[
                      styles.stopCircle, 
                      { 
                        backgroundColor: color,
                        borderWidth: (isDestination || isCurrent) ? 3 : 0,
                        borderColor: color,
                        width: isDestination ? 18 : 12,
                        height: isDestination ? 18 : 12,
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
                    
                    {/* Upcoming/passed indicators */}
                    {!isCurrent && !isDestination && (
                      <Text style={styles.stopDetailText}>
                        {index < currentStopIndex ? 'Passed' : 'Upcoming'}
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
            <MapPin size={16} color="#9CA3AF" />
            <Text style={styles.journeyPointText}>{stops[0]?.name || 'Start'}</Text>
          </View>
          <ArrowRight size={16} color="#9CA3AF" />
          <View style={styles.journeyPoint}>
            <MapPin size={16} color="#FF8A65" />
            <Text style={[styles.journeyPointText, styles.destinationText]}>
              {stops[destinationStopIndex]?.name || 'Destination'}
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
    alignItems: 'flex-start',
    marginBottom: 35,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    width: 3,
    height: 40, // Height needs to match the marginBottom of stopItem plus some adjustment
    backgroundColor: '#D1D5DB',
    left: 6, // Half of the normal stop circle width
    top: -25,
    zIndex: 1,
  },
  stopCircle: {
    width: 12,
    height: 12,
    borderRadius: 10,
    backgroundColor: '#6B7280',
    marginRight: 15,
    marginTop: 4,
    zIndex: 2,
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