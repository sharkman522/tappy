import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Bus, Brain as Train, Heart } from 'lucide-react-native';

interface RouteCardProps {
  type: 'bus' | 'train';
  routeNumber: string;
  destination: string;
  time: string;
  isFavorite?: boolean;
  onPress: () => void;
  onFavoriteToggle?: () => void;
}

export default function RouteCard({
  type,
  routeNumber,
  destination,
  time,
  isFavorite = false,
  onPress,
  onFavoriteToggle,
}: RouteCardProps) {
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
        <Text style={styles.time}>{time}</Text>
      </View>
      
      {/* Favorite Toggle */}
      {onFavoriteToggle && (
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
        >
          <Heart 
            size={22} 
            color={isFavorite ? '#FF8A65' : '#D1D5DB'} 
            fill={isFavorite ? '#FF8A65' : 'none'}
          />
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