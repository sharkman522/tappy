import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, RefreshCw } from 'lucide-react-native';

interface LocationErrorCardProps {
  error: string;
  onRetry: () => void;
  style?: object;
}

export default function LocationErrorCard({
  error,
  onRetry,
  style
}: LocationErrorCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <MapPin size={24} color="#FF8A65" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.errorTitle}>Location Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={18} color="#FFFFFF" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3F1',
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8A65',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#4B5563',
  },
  retryButton: {
    backgroundColor: '#FF8A65',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
});