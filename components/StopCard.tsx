import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';

interface StopCardProps {
  stopName: string;
  isDestination?: boolean;
  isCurrent?: boolean;
  estimatedTime?: string;
  onPress: () => void;
}

export default function StopCard({
  stopName,
  isDestination = false,
  isCurrent = false,
  estimatedTime,
  onPress,
}: StopCardProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isDestination && styles.destinationContainer,
        isCurrent && styles.currentContainer
      ]} 
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <MapPin 
          size={20} 
          color={isDestination ? '#FF8A65' : isCurrent ? '#3498DB' : '#4BB377'} 
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[
          styles.stopName,
          isDestination && styles.destinationText,
          isCurrent && styles.currentText
        ]}>
          {stopName}
          {isDestination && ' ⭐'}
          {isCurrent && ' (Current)'}
        </Text>
        {estimatedTime && (
          <Text style={styles.timeText}>
            {estimatedTime}
          </Text>
        )}
      </View>
      {isDestination && (
        <View style={styles.destinationBadge}>
          <Text style={styles.destinationBadgeText}>Your Stop!</Text>
        </View>
      )}
      {isCurrent && !isDestination && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>Current</Text>
        </View>
      )}
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
  destinationContainer: {
    borderWidth: 2,
    borderColor: '#FF8A65',
  },
  currentContainer: {
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  destinationText: {
    fontWeight: '700',
    color: '#FF8A65',
  },
  currentText: {
    fontWeight: '600',
    color: '#3498DB',
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  destinationBadge: {
    backgroundColor: '#FF8A65',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  destinationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#3498DB',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});