import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';
import RouteCard from '@/components/RouteCard';
import LoadingIndicator from '@/components/LoadingIndicator';

// Context and Hooks
import { useLTA } from '@/app/LTAApiContext';

export default function FavoritesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // Get LTA context data
  const { 
    nearbyServices,
    servicesLoading,
    refreshServices,
    toggleFavorite
  } = useLTA();

  // Filter favorite services
  const favoriteServices = nearbyServices.filter(service => service.isFavorite);

  // Handle route selection
  const handleRoutePress = (route: any) => {
    router.push({
      pathname: '/route-details',
      params: { routeId: route.id, routeNumber: route.routeNumber }
    });
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshServices();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshServices]);

  // Toggle favorite status
  const handleToggleFavorite = async (routeId: string) => {
    try {
      await toggleFavorite(routeId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tappy Character & Speech Bubble */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression="happy" 
            size="medium" 
          />
          <SpeechBubble 
            text="Here are your favorite routes!" 
            position="top" 
            style={styles.speechBubble}
          />
        </View>
        
        {/* Favorites List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Saved Routes</Text>
          
          {servicesLoading ? (
            <LoadingIndicator message="Loading your favorites..." />
          ) : favoriteServices.length > 0 ? (
            favoriteServices.map((service) => (
              <RouteCard
                key={service.id}
                type={service.type}
                routeNumber={service.routeNumber}
                destination={service.destination}
                time={service.time}
                isFavorite={true}
                onPress={() => handleRoutePress(service)}
                onFavoriteToggle={() => handleToggleFavorite(service.id)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No favorites yet!</Text>
              <Text style={styles.emptySubtext}>
                Tap the heart icon on any route to add it to your favorites.
              </Text>
              <TappyCharacter 
                expression="sad" 
                size="small" 
                style={{ marginTop: 20 }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
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
  sectionContainer: {
    marginTop: 10,
    marginBottom: 15,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
});