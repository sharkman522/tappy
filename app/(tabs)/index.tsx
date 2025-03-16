import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import * as ltaService from '@/services/lta-service';

export default function HomeScreen() {
  // States for UI
  const [greeting, setGreeting] = useState(getTappyGreeting());
  const [tappyAnimating, setTappyAnimating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // New state for filtering: 'all', 'bus', 'train'
  const [busStopNames, setBusStopNames] = useState<Record<string, string>>({});

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

  // Function to get bus stop name from code
  const getBusStopName = useCallback(async (code: string) => {
    try {
      const name = await ltaService.getBusStopName(code);
      setBusStopNames(prev => ({ ...prev, [code]: name }));
    } catch (error) {
      console.error(`Error getting bus stop name for code ${code}:`, error);
    }
  }, []);

  // Update greeting based on time of day
  useEffect(() => {
    setGreeting(getTappyGreeting());
    
    // Start with a wave animation
    setTappyAnimating(true);
    const timer = setTimeout(() => setTappyAnimating(false), 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Track all bus stop codes that need to be fetched
  const [allBusStopCodes, setAllBusStopCodes] = useState<Set<string>>(new Set());
  
  // Update bus stop codes when services change
  useEffect(() => {
    const codes = new Set<string>();
    nearbyServices.forEach(service => {
      if (service.type === 'bus' && service.id) {
        const parts = service.id.split('-');
        if (parts.length > 1) {
          codes.add(parts[1]);
        }
      }
    });
    setAllBusStopCodes(codes);
  }, [nearbyServices]);
  
  // Fetch bus stop names whenever the codes change
  useEffect(() => {
    allBusStopCodes.forEach(code => {
      if (!busStopNames[code]) {
        getBusStopName(code);
      }
    });
  }, [allBusStopCodes, busStopNames, getBusStopName]);

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
      console.log({route});
      
      // Create params object based on route type
      const params: any = { 
        routeId: route.id,
        type: route.type
      };
      
      // Add type-specific parameters
      if (route.type === 'bus') {
        // For bus routes, the ID format is "ServiceNo-BusStopCode"
        // Extract the service number from routeNumber ("Bus 123" -> "123")
        const serviceNumber = route.routeNumber.replace('Bus ', '');
        
        // Set the routeNumber for the route details screen
        params.routeNumber = route.routeNumber;
        
        // The useRouteStops hook expects just the service number without "Bus "
        params.serviceNumber = serviceNumber;
        
        // Extract bus stop code from the ID (format: ServiceNo-BusStopCode)
        const idParts = route.id.split('-');
        console.log('[handleRoutePress] Bus route ID parts:', idParts);
        if (idParts.length > 1) {
          params.busStopCode = idParts[1];
          console.log('[handleRoutePress] Extracted bus stop code:', params.busStopCode);
        }
      } else if (route.type === 'busStop') {
        params.busStopCode = route.busStopCode;
        params.description = route.description;
      } else if (route.type === 'trainStation') {
        params.stationCode = route.stationCode;
        params.stationName = route.stationName;
        params.line = route.line;
      }
      
      router.push({
        pathname: '/route-details',
        params
      });
    }, 200);
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
              <View style={styles.sectionHeader}>
                
                {/* Filter Tabs */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                    onPress={() => setActiveTab('all')}
                  >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'bus' && styles.activeTab]}
                    onPress={() => setActiveTab('bus')}
                  >
                    <Text style={[styles.tabText, activeTab === 'bus' && styles.activeTabText]}>Bus</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'train' && styles.activeTab]}
                    onPress={() => setActiveTab('train')}
                  >
                    <Text style={[styles.tabText, activeTab === 'train' && styles.activeTabText]}>Train</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {servicesLoading ? (
                <LoadingIndicator message="Finding nearby routes..." />
              ) : servicesError ? (
                <Text style={styles.errorText}>
                  Could not load nearby routes. Please try again later.
                </Text>
              ) : nearbyServices.length > 0 ? (
                // Group services by bus stop
                (() => {
                  // Filter services based on active tab
                  const filteredServices = nearbyServices.filter(
                    service => activeTab === 'all' || service.type === activeTab
                  );
                  
                  if (filteredServices.length === 0) {
                    return <Text style={styles.emptyText}>No {activeTab !== 'all' ? activeTab : ''} routes found nearby.</Text>;
                  }
                  
                  
                  // Extract bus stop code from service ID (format: "ServiceNo-BusStopCode")
                  const getBusStopCode = (service: any) => {
                    if (service.type === 'bus' && service.id) {
                      const parts = service.id.split('-');
                      return parts.length > 1 ? parts[1] : null;
                    }
                    return null;
                  };
                  
                  // Group bus services by bus stop code
                  const busServicesByStop: Record<string, Array<any>> = {};
                  const trainServices: Array<any> = [];
                  const busStopCodes = new Set<string>();
                  
                  filteredServices.forEach(service => {
                    if (service.type === 'bus') {
                      const busStopCode = getBusStopCode(service);
                      if (busStopCode) {
                        busStopCodes.add(busStopCode);
                        if (!busServicesByStop[busStopCode]) {
                          busServicesByStop[busStopCode] = [];
                        }
                        busServicesByStop[busStopCode].push(service);
                      }
                    } else if (service.type === 'train') {
                      trainServices.push(service);
                    }
                  });
                  
                  // We now handle bus stop names at the component level
                  
                  // Render bus services by stop
                  const busStopSections = Object.entries(busServicesByStop).map(([stopCode, services]) => {
                    // Get bus stop name from our state, or use a default
                    const stopName = busStopNames[stopCode] || 'Bus Stop';
                    const busStopName = `${stopName} (${stopCode})`;
                    
                    return (
                      <View key={stopCode} style={styles.busStopSection}>
                        <Text style={styles.busStopName}>{busStopName}</Text>
                        {services.map((service: any) => (
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
                        ))}
                      </View>
                    );
                  });
                  
                  // Render train services if any
                  const trainSection = trainServices.length > 0 ? (
                    <View key="train-stations" style={styles.busStopSection}>
                      <Text style={styles.busStopName}>Nearby Train Stations</Text>
                      {trainServices.map((service: any) => (
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
                      ))}
                    </View>
                  ) : null;
                  
                  // Combine bus and train sections
                  return (
                    <>
                      {busStopSections}
                      {activeTab !== 'bus' && trainSection}
                    </>
                  );
                })()
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: -35, // Pull the filter tabs up to align with the section title
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  // Bus stop section styles
  busStopSection: {
    marginBottom: 15,
    paddingTop: 5,
  },
  busStopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    paddingHorizontal: 15,
    marginBottom: 8,
    marginTop: 5,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 2,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4BB377',
    fontWeight: '600',
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