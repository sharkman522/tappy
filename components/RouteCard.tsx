import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ChevronRight, Bus, Train, Heart } from 'lucide-react-native';

interface RouteCardProps {
  type: 'bus' | 'train';
  routeNumber: string;
  destination: string;
  time: string;
  isFavorite?: boolean;
  busStopName?: string; // Added bus stop name prop
  onPress: () => void;
  onFavoriteToggle?: () => void;
}

export default function RouteCard({
  type,
  routeNumber,
  destination,
  time,
  isFavorite = false,
  busStopName,
  onPress,
  onFavoriteToggle,
}: RouteCardProps) {
  // Animation value for heart icon
  const [heartScale] = useState(new Animated.Value(1));
  // Local state to track favorite status for immediate UI feedback
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        {type === 'bus' ? (
          <Bus size={24} color="#4BB377" />
        ) : (
          <Train size={24} color="#4BB377" />
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeNumber}>{routeNumber}</Text>
          <Text style={styles.destination}>to {destination}</Text>
        </View>
        {busStopName && (
          <Text style={styles.busStopName}>at {busStopName}</Text>
        )}
        <Text style={styles.time}>{time}</Text>
      </View>
      
      {/* Favorite Toggle */}
      {onFavoriteToggle && (
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            
            // Update local state immediately for UI feedback
            setLocalIsFavorite(!localIsFavorite);
            
            // Animate heart icon for immediate feedback
            Animated.sequence([
              Animated.timing(heartScale, {
                toValue: 1.3,
                duration: 100,
                useNativeDriver: true
              }),
              Animated.timing(heartScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true
              })
            ]).start();
            
            // Toggle favorite state in parent component
            onFavoriteToggle();
          }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Heart 
              size={22} 
              color={localIsFavorite ? '#FF8A65' : '#D1D5DB'} 
              fill={localIsFavorite ? '#FF8A65' : 'none'}
            />
          </Animated.View>
        </TouchableOpacity>
      )}
      
      <View style={styles.arrowContainer}>
        <ChevronRight size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 6,
  },
  destination: {
    fontSize: 16,
    color: '#4B5563',
  },
  busStopName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 14,
    color: '#4BB377',
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 8,
    marginRight: 4,
  },
  arrowContainer: {
    marginLeft: 4,
  },
});