import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { MapPin, Train } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';
import DestinationSearchBar from '@/components/DestinationSearchBar';
import RouteCard from '@/components/RouteCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import LocationErrorCard from '@/components/LocationErrorCard';
import SearchResults from '@/components/SearchResults';
import SearchHistoryList from '@/components/SearchHistoryList';

// Context and Hooks
import { useLTA } from '@/app/LTAApiContext';

// Utils
import { getTappyGreeting } from '@/utils/mockData';

export default function HomeScreen() {
  // States for UI
  const [greeting, setGreeting] = useState(getTappyGreeting());
  const [tappyAnimating, setTappyAnimating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Get LTA context data
  const { 
    userLocation,
    locationLoading,
    locationError,
    refreshLocation,
    nearbyServices,
    servicesLoading,
    servicesError,
    refreshServices,
    toggleFavorite,
    
    // Search related
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    performSearch,
    searchHistory,
    clearSearchHistory
  } = useLTA();

  // Filter favorite services
  const favoriteServices = nearbyServices.filter(service => service.isFavorite);

  // Update greeting based on time of day
  useEffect(() => {
    setGreeting(getTappyGreeting());
    
    // Start with a wave animation
    setTappyAnimating(true);
    const timer = setTimeout(() => setTappyAnimating(false), 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle search
  const handleSearch = useCallback((text: string) => {
    if (!text || text.trim() === '') {
      setShowSearchResults(false);
      return;
    }
    
    // Perform the search
    performSearch(text);
    
    // Show search results inline (not in modal)
    setShowSearchResults(true);
    setShowSearchHistory(false);
  }, [performSearch]);

  // Handle search bar focus
  const handleSearchFocus = useCallback(() => {
    if (!searchQuery) {
      setShowSearchHistory(true);
    }
  }, [searchQuery]);

  // Handle search history item selection
  const handleSelectHistoryItem = useCallback((query: string) => {
    setSearchQuery(query);
    handleSearch(query);
    setShowSearchHistory(false);
  }, [setSearchQuery, handleSearch]);

  // Handle route selection
  const handleRoutePress = (route: any) => {
    // Animate Tappy when selecting a route
    setTappyAnimating(true);
    setTimeout(() => {
      setTappyAnimating(false);
      // Navigate to route details
      router.push({
        pathname: '/route-details',
        params: { routeId: route.id, routeNumber: route.routeNumber }
      });
    }, 1500);
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLocation();
      await refreshServices();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocation, refreshServices]);

  // Handle search result selection
  const handleSelectBusStop = (stopId: string, stopName: string) => {
    console.log(`Selected bus stop: ${stopId} - ${stopName}`);
    // Navigate to bus stop detail page
    router.push({
      pathname: '/route-details',
      params: { 
        busStopCode: stopId,
        description: stopName,
        type: 'busStop'
      }
    });
    setShowSearchResults(false);
  };

  const handleSelectBusService = (service: any) => {
    console.log(`Selected bus service:`, service);
    handleRoutePress(service);
    setShowSearchResults(false);
  };

  const handleSelectTrainStation = (station: any) => {
    console.log(`Selected train station:`, station);
    // Navigate to train station detail page
    router.push({
      pathname: '/route-details',
      params: { 
        stationCode: station.StationCode,
        stationName: station.StationName,
        line: station.Line,
        type: 'trainStation'
      }
    });
    setShowSearchResults(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Tappy Character & Speech Bubble - Always visible */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression="happy" 
            size="medium" 
            animationType={tappyAnimating ? 'wave' : 'none'} 
          />
          <SpeechBubble 
            text={greeting} 
            position="top" 
            style={styles.speechBubble}
          />
        </View>
        
        {/* Search Bar - Always visible */}
        <DestinationSearchBar 
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text === '') {
              setShowSearchResults(false);
              setShowSearchHistory(true);
            }
          }}
          onSearch={handleSearch}
          onSubmitEditing={() => {
            if (searchQuery.trim() !== '') {
              handleSearch(searchQuery);
            }
          }}
          placeholder="Search for bus, train, or stop"
        />
        
        {/* Search History - Conditionally visible */}
        {showSearchHistory && !showSearchResults && (
          <SearchHistoryList 
            searchHistory={searchHistory}
            onSelectHistoryItem={handleSelectHistoryItem}
            onClearHistory={clearSearchHistory}
          />
        )}
        
        {/* Conditional rendering based on search state */}
        {showSearchResults ? (
          /* Search Results View */
          <View style={styles.sectionContainer}>
            {searchLoading ? (
              <LoadingIndicator message="Searching..." />
            ) : (
              <>
                {/* Bus Stops Section */}
                {searchResults.busStops.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>Bus Stops</Text>
                    {searchResults.busStops.map((stop) => (
                      <TouchableOpacity 
                        key={stop.BusStopCode}
                        style={styles.resultItem}
                        onPress={() => handleSelectBusStop(stop.BusStopCode, stop.Description)}
                      >
                        <View style={styles.resultIconContainer}>
                          <MapPin size={18} color="#4BB377" />
                        </View>
                        <View style={styles.resultTextContainer}>
                          <Text style={styles.resultTitle}>{stop.Description}</Text>
                          <Text style={styles.resultSubtitle}>{stop.RoadName} (#{stop.BusStopCode})</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Bus Services Section */}
                {searchResults.busServices.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>Bus Services</Text>
                    {searchResults.busServices.map((service) => (
                      <RouteCard
                        key={service.id}
                        type={service.type}
                        routeNumber={service.routeNumber}
                        destination={service.destination}
                        time={service.time}
                        isFavorite={service.isFavorite}
                        onPress={() => handleSelectBusService(service)}
                        onFavoriteToggle={() => toggleFavorite(service.id)}
                      />
                    ))}
                  </View>
                )}

                {/* Train Stations Section */}
                {searchResults.trainStations.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>Train Stations</Text>
                    {searchResults.trainStations.map((station) => (
                      <TouchableOpacity 
                        key={station.StationCode}
                        style={styles.resultItem}
                        onPress={() => handleSelectTrainStation(station)}
                      >
                        <View style={styles.resultIconContainer}>
                          <Train size={18} color="#4BB377" />
                        </View>
                        <View style={styles.resultTextContainer}>
                          <Text style={styles.resultTitle}>{station.StationName}</Text>
                          <Text style={styles.resultSubtitle}>{station.Line} ({station.StationCode})</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No Results Message */}
                {searchResults.busStops.length === 0 && 
                 searchResults.busServices.length === 0 && 
                 searchResults.trainStations.length === 0 && (
                  <Text style={styles.emptyText}>No results found matching your search.</Text>
                )}
              </>
            )}
            
            {/* Favorites Section in search results */}
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>Favorite Routes</Text>
            {favoriteServices.length > 0 ? (
              favoriteServices.map((service) => (
                <RouteCard
                  key={service.id}
                  type={service.type}
                  routeNumber={service.routeNumber}
                  destination={service.destination}
                  time={service.time}
                  isFavorite={true}
                  onPress={() => handleRoutePress(service)}
                  onFavoriteToggle={() => toggleFavorite(service.id)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No favorites yet! Tap the heart icon on any route to add it to your favorites.</Text>
            )}
          </View>
        ) : (
          /* Main Content View */
          <ScrollView 
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            keyboardShouldPersistTaps="handled"
          >
            {/* Location Error Card (if error) */}
            {locationError && (
              <LocationErrorCard 
                error={locationError} 
                onRetry={refreshLocation}
                style={styles.errorCard}
              />
            )}
            
            {/* Favorites Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Favorite Routes</Text>
              {favoriteServices.length > 0 ? (
                favoriteServices.map((service) => (
                  <RouteCard
                    key={service.id}
                    type={service.type}
                    routeNumber={service.routeNumber}
                    destination={service.destination}
                    time={service.time}
                    isFavorite={true}
                    onPress={() => handleRoutePress(service)}
                    onFavoriteToggle={() => toggleFavorite(service.id)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No favorites yet! Tap the heart icon on any route to add it to your favorites.</Text>
              )}
            </View>
            
            {/* Nearby Routes Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Nearby Routes</Text>
              
              {servicesLoading ? (
                <LoadingIndicator message="Finding nearby routes..." />
              ) : servicesError ? (
                <Text style={styles.errorText}>
                  Could not load nearby routes. Please try again later.
                </Text>
              ) : nearbyServices.length > 0 ? (
                nearbyServices.map((service) => (
                  <RouteCard
                    key={service.id}
                    type={service.type}
                    routeNumber={service.routeNumber}
                    destination={service.destination}
                    time={service.time}
                    isFavorite={service.isFavorite}
                    onPress={() => handleRoutePress(service)}
                    onFavoriteToggle={() => toggleFavorite(service.id)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No routes found nearby.</Text>
              )}
            </View>
          </ScrollView>
        )}
        
        {/* Clear search button when showing results */}
        {showSearchResults && (
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={() => {
              setSearchQuery('');
              setShowSearchResults(false);
            }}
          >
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
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
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontStyle: 'italic',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    color: '#EF4444',
    padding: 20,
  },
  errorCard: {
    marginVertical: 15,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  // New styles for search results
  resultSection: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  clearSearchButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#4BB377',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});