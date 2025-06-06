import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { AppTransportService, AppBusStop, SearchResults, BusRoute, DataMallResponse } from '../types/lta-api';
import * as ltaService from '../services/lta-service';

// Hook for getting user location
export const useUserLocation = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        setLoading(true);
        
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLoading(false);
          return;
        }
        
        // Get current location
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (isMounted) {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error getting location:', err);
          setError('Could not get your location. Using default location.');
          
          // Use default location (Singapore city center)
          setLocation({
            latitude: 1.3521,
            longitude: 103.8198,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshLocation = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setError(null);
    } catch (err) {
      console.error('Error refreshing location:', err);
      setError('Could not refresh your location');
    } finally {
      setLoading(false);
    }
  };

  return { location, loading, error, refreshLocation };
};

// Hook for getting nearby transport services
export const useNearbyTransportServices = (
  latitude?: number,
  longitude?: number
) => {
  const [services, setServices] = useState<AppTransportService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { favorites } = useFavorites();

  useEffect(() => {
    let isMounted = true;

    const fetchServices = async () => {
      if (!latitude || !longitude) return;
      
      try {
        setLoading(true);
        const nearbyServices = await ltaService.getNearbyTransportServices(latitude, longitude);
        
        if (isMounted) {
          // Apply latest favorite state from context
          const updatedServices = nearbyServices.map(service => ({
            ...service,
            isFavorite: favorites.includes(service.id)
          }));
          
          setServices(updatedServices);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching nearby services:', err);
          setError('Could not load nearby transport services');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchServices();

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, favorites]);

  const refreshServices = async () => {
    if (!latitude || !longitude || loading) return;
    
    setLoading(true);
    try {
      const nearbyServices = await ltaService.getNearbyTransportServices(latitude, longitude);
      // Apply latest favorite state from context
      const updatedServices = nearbyServices.map(service => ({
        ...service,
        isFavorite: favorites.includes(service.id)
      }));
      
      setServices(updatedServices);
      setError(null);
    } catch (err) {
      console.error('Error refreshing services:', err);
      setError('Could not refresh transport services');
    } finally {
      setLoading(false);
    }
  };

  return { services, loading, error, refreshServices };
};

// Hook for getting stops for a route
export const useRouteStops = (routeNumber: string, direction: number = 1, initialBusStopCode?: string) => {
  const [stops, setStops] = useState<AppBusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<{[key: number]: string}>({});
  const [selectedDirection, setSelectedDirection] = useState<number>(direction);
  const [autoSelectedDirection, setAutoSelectedDirection] = useState<boolean>(false);

  // Function to set the direction
  const changeDirection = (newDirection: number) => {
    console.log(`[useRouteStops] Changing direction to ${newDirection}`);
    setSelectedDirection(newDirection);
  };

  useEffect(() => {
    let isMounted = true;
    console.log('[useRouteStops] Hook initialized with routeNumber:', routeNumber, 'direction:', selectedDirection);

    const fetchStops = async () => {
      if (!routeNumber) {
        console.log('[useRouteStops] No route number provided, skipping fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // For train routes
        if (routeNumber.toLowerCase().includes('line')) {
          console.log('[useRouteStops] Processing train route:', routeNumber);
          // Filter train stations by line
          const allStations = await ltaService.getTrainStations();
          const lineCode = getLineCodeFromName(routeNumber);
          console.log('[useRouteStops] Line code:', lineCode);
          const lineStations = allStations.filter(station => station.Line === lineCode);
          console.log('[useRouteStops] Found stations for line:', lineStations.length);
          
          if (isMounted) {
            // Convert train stations to the same format as bus stops for consistency
            const stopsFormat = lineStations.map((station, index) => ({
              BusStopCode: station.StationCode,
              RoadName: station.Line,
              Description: station.StationName,
              Latitude: station.Latitude,
              Longitude: station.Longitude,
              id: station.StationCode,
              name: station.StationName,
              coordinates: {
                latitude: station.Latitude,
                longitude: station.Longitude,
              },
              time: `${index * 3} mins`, // Simulate travel time
              direction: 1 // Default direction for trains
            }));
            
            console.log('[useRouteStops] Setting stops for train route:', stopsFormat.length);
            setStops(stopsFormat);
            setDirections({ 1: 'All Stations' });
            setError(null);
          }
        } 
        // For bus routes
        else {
          // Extract bus number from routeNumber (e.g., "Bus 51" -> "51")
          const busNumber = routeNumber.replace('Bus ', '');
          console.log('[useRouteStops] Processing bus route, service number:', busNumber);
          
          // Get routes for this bus number
          console.log('[useRouteStops] Fetching bus routes for service number:', busNumber);
          const busRoutes = await ltaService.getBusRoutes(busNumber);
          console.log('[useRouteStops] Bus routes returned:', busRoutes?.length || 0);
          
          // Get all bus stops
          console.log('[useRouteStops] Fetching all bus stops');
          const allBusStops = await ltaService.getBusStops();
          console.log('[useRouteStops] Total bus stops:', allBusStops?.length || 0);
          
          // Check if we have a valid response with routes
          if (isMounted && busRoutes && busRoutes.length > 0) {
            // Get available directions
            const availableDirections = [...new Set(busRoutes.map(r => r.Direction))].sort();
            console.log('[useRouteStops] Available directions:', availableDirections);
            
            // Create direction names based on first and last stop
            const directionLabels: {[key: number]: string} = {};
            
            for (const dir of availableDirections) {
              const dirRoutes = busRoutes
                .filter((r: BusRoute) => r.Direction === dir)
                .sort((a: BusRoute, b: BusRoute) => a.StopSequence - b.StopSequence);
              
              if (dirRoutes.length > 0) {
                const firstStopCode = dirRoutes[0].BusStopCode;
                const lastStopCode = dirRoutes[dirRoutes.length - 1].BusStopCode;
                
                const firstStop = allBusStops.find(s => s.BusStopCode === firstStopCode);
                const lastStop = allBusStops.find(s => s.BusStopCode === lastStopCode);
                
                directionLabels[dir] = `${firstStop?.Description || firstStopCode} → ${lastStop?.Description || lastStopCode}`;
              } else {
                directionLabels[dir] = `Direction ${dir}`;
              }
            }
            
            console.log('[useRouteStops] Direction labels:', directionLabels);
            setDirections(directionLabels);
            
            // Auto-select direction based on initialBusStopCode if provided
            let directionToUse = selectedDirection;
            
            if (initialBusStopCode && !autoSelectedDirection) {
              console.log('[useRouteStops] Attempting to auto-select direction based on bus stop:', initialBusStopCode);
              
              // Find which direction contains the initialBusStopCode
              for (const dir of availableDirections) {
                const dirRoutes = busRoutes.filter((r: BusRoute) => r.Direction === dir);
                const stopInDirection = dirRoutes.some(route => route.BusStopCode === initialBusStopCode);
                
                if (stopInDirection) {
                  console.log(`[useRouteStops] Found initialBusStopCode in direction ${dir}`);
                  directionToUse = dir;
                  setAutoSelectedDirection(true);
                  break;
                }
              }
            }
            
            // If the selected direction doesn't exist, use the first available one
            if (!availableDirections.includes(directionToUse) && availableDirections.length > 0) {
              directionToUse = availableDirections[0];
            }
            
            // Update the selected direction
            if (directionToUse !== selectedDirection) {
              setSelectedDirection(directionToUse);
            }
            
            // Filter routes by selected direction
            const directionRoutes = busRoutes
              .filter((r: BusRoute) => r.Direction === selectedDirection)
              .sort((a: BusRoute, b: BusRoute) => a.StopSequence - b.StopSequence);
            
            console.log(`[useRouteStops] Direction ${selectedDirection} routes:`, directionRoutes.length);
            console.log('[useRouteStops] First few routes:', directionRoutes.slice(0, 3));
            
            // Map route stops to full stop info
            const routeStops = directionRoutes.map((route: BusRoute, index: number) => {
              const stop = allBusStops.find(s => s.BusStopCode === route.BusStopCode);
              
              if (!stop) {
                console.log('[useRouteStops] Could not find stop for code:', route.BusStopCode);
                return null;
              }
              
              // Simulate a bus journey with some stops already passed
              // For demonstration, we'll mark the first 30% of stops as already passed
              const totalStops = directionRoutes.length;
              const passedStopsCount = Math.floor(totalStops * 0.3); // 30% of stops have been passed
              
              // Calculate estimated time (simulated)
              // Instead of using fixed 2-minute intervals, calculate distance-based information
              const isPassed = index < passedStopsCount;
              
              // Format the distance-based information instead of time
              let stopInfo = '';
              if (isPassed) {
                stopInfo = 'Passed';
              } else if (index === passedStopsCount) {
                stopInfo = 'Current stop';
              } else {
                // For upcoming stops, show the stop number
                // We'll calculate this differently when displaying in the UI
                // to account for hidden stops
                const stopsAway = index - passedStopsCount;
                stopInfo = stopsAway === 1 ? 'Next stop' : `${stopsAway} stops away`;
              }
              
              return {
                ...stop,
                id: stop.BusStopCode,
                name: stop.Description,
                coordinates: {
                  latitude: stop.Latitude,
                  longitude: stop.Longitude,
                },
                time: stopInfo, // Use the distance-based information instead of time
                direction: route.Direction,
                stopSequence: route.StopSequence,
                stopsAway: index - passedStopsCount, // Store the raw stops away (can be negative for passed stops)
                isPassed: isPassed // Flag if this stop is in the past
              };
            }).filter(Boolean) as AppBusStop[];
            
            console.log('[useRouteStops] Total route stops count:', routeStops.length);
            
            // Store the complete list of stops first
            const allStops = [...routeStops];
            
            // Filter out stops that are in the past (negative estimated time)
            const futureStops = routeStops.filter(stop => !stop.isPassed);
            console.log('[useRouteStops] Future stops count (excluding passed stops):', futureStops.length);
            console.log('[useRouteStops] Past stops count:', allStops.length - futureStops.length);
            
            setStops(futureStops);
            setError(null);
          } else if (isMounted) {
            console.log('[useRouteStops] No routes found for bus number:', busNumber);
            setStops([]);
            setDirections({});
            setError('No stops found for this route');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching route stops:', err);
          setError('Could not load stops for this route');
        }

      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStops();

    return () => {
      isMounted = false;
    };
  }, [routeNumber, selectedDirection]);

  // Create a state variable to hold all stops (including past stops)
  const [allStops, setAllStops] = useState<AppBusStop[]>([]);
  
  // Update allStops when routeStops are processed
  useEffect(() => {
    if (stops.length > 0) {
      // Get all stops including past ones by checking the original routeStops
      const allRoutesIncludingPast = [...stops];
      setAllStops(allRoutesIncludingPast);
    }
  }, [stops]);

  return { stops, loading, error, directions, selectedDirection, changeDirection, allStops, autoSelectedDirection };
};

// Helper function to get line code from name
const getLineCodeFromName = (lineName: string): string => {
  const lineNameLower = lineName.toLowerCase();
  
  if (lineNameLower.includes('north-south')) return 'NSL';
  if (lineNameLower.includes('east-west')) return 'EWL';
  if (lineNameLower.includes('circle')) return 'CCL';
  if (lineNameLower.includes('downtown')) return 'DTL';
  if (lineNameLower.includes('north east')) return 'NEL';
  if (lineNameLower.includes('thomson')) return 'TEL';
  
  // Default to North-South Line if unknown
  return 'NSL';
};

// Hook for managing favorites
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load favorites on mount
  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      try {
        const favoriteRoutes = await ltaService.getFavoriteRoutes();
        if (isMounted) {
          setFavorites(favoriteRoutes);
        }
      } catch (err) {
        console.error('Error loading favorites:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  // Add a favorite route
  const addFavorite = useCallback(async (routeId: string) => {
    try {
      await ltaService.addFavoriteRoute(routeId);
      setFavorites(prev => {
        if (prev.includes(routeId)) {
          return prev;
        }
        return [...prev, routeId];
      });
    } catch (err) {
      console.error('Error adding favorite:', err);
    }
  }, []);

  // Remove a favorite route
  const removeFavorite = useCallback(async (routeId: string) => {
    try {
      await ltaService.removeFavoriteRoute(routeId);
      setFavorites(prev => prev.filter(id => id !== routeId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (routeId: string) => {
    try {
      console.log('Toggling favorite for route:', routeId);
      
      // Check current state directly from storage to avoid stale state
      const currentFavorites = await ltaService.getFavoriteRoutes();
      console.log('Current favorites from storage:', currentFavorites);
      const isFavorite = currentFavorites.includes(routeId);
      console.log('Is currently favorite:', isFavorite, 'for route:', routeId);
      
      // Perform the appropriate action based on current state
      if (isFavorite) {
        console.log('Removing favorite:', routeId);
        await ltaService.removeFavoriteRoute(routeId);
      } else {
        console.log('Adding favorite:', routeId);
        await ltaService.addFavoriteRoute(routeId);
      }
      
      // Verify the change by getting fresh data
      const updatedFavorites = await ltaService.getFavoriteRoutes();
      console.log('Updated favorites after toggle:', updatedFavorites);
      
      // Update local state with fresh data
      setFavorites(updatedFavorites);
      
      // Double check the new state
      const newIsFavorite = updatedFavorites.includes(routeId);
      console.log('New favorite state:', newIsFavorite, 'for route:', routeId);
      
      return newIsFavorite; // Return the actual new state, not the inverse of the old state
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return null; // Return null to indicate error
    }
  }, []); // No dependencies to avoid stale closures

  return { 
    favorites, 
    loading, 
    addFavorite, 
    removeFavorite, 
    toggleFavorite 
  };
};

// Hook for fetching bus arrivals at a specific stop
export const useBusArrivals = (busStopCode: string) => {
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log('[useBusArrivals] Hook initialized with busStopCode:', busStopCode);

    const fetchArrivals = async () => {
      if (!busStopCode) {
        console.log('[useBusArrivals] No busStopCode provided, skipping fetch');
        setLoading(false);
        return;
      }
      
      console.log('[useBusArrivals] Fetching arrivals for bus stop:', busStopCode);
      try {
        setLoading(true);
        const busArrivals = await ltaService.getBusArrivals(busStopCode);
        console.log('[useBusArrivals] Raw bus arrivals data:', JSON.stringify(busArrivals, null, 2));
        
        if (isMounted) {
          // Format the arrivals data for display
          const formattedArrivals = busArrivals.map(arrival => {
            const formatted = {
              serviceNo: arrival.ServiceNo,
              operator: arrival.Operator,
              nextBus: arrival.NextBus?.EstimatedArrival ? formatArrivalTime(arrival.NextBus.EstimatedArrival) : 'N/A',
              nextBus2: arrival.NextBus2?.EstimatedArrival ? formatArrivalTime(arrival.NextBus2.EstimatedArrival) : 'N/A',
              nextBus3: arrival.NextBus3?.EstimatedArrival ? formatArrivalTime(arrival.NextBus3.EstimatedArrival) : 'N/A',
            };
            console.log(`[useBusArrivals] Formatted arrival for service ${arrival.ServiceNo}:`, formatted);
            return formatted;
          });
          
          console.log('[useBusArrivals] Setting arrivals state with formatted data:', formattedArrivals);
          setArrivals(formattedArrivals);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useBusArrivals] Error fetching bus arrivals:', err);
          setError('Could not load bus arrivals');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('[useBusArrivals] Loading state set to false');
        }
      }
    };

    fetchArrivals();

    // Refresh every 30 seconds
    const intervalId = setInterval(fetchArrivals, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [busStopCode]);

  return { arrivals, loading, error };
};

// Hook for fetching train arrivals at a specific station
export const useTrainArrivals = (stationCode: string) => {
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log('[useTrainArrivals] Hook initialized with stationCode:', stationCode);

    const fetchArrivals = async () => {
      if (!stationCode) {
        console.log('[useTrainArrivals] No station code provided, skipping fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await ltaService.getTrainArrivals(stationCode);
        
        if (isMounted && response && response.Services) {
          console.log(`[useTrainArrivals] Received ${response.Services.length} train services`);
          setArrivals(response.Services);
          setError(null);
        } else if (isMounted) {
          console.log('[useTrainArrivals] No services found or empty response');
          setArrivals([]);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useTrainArrivals] Error fetching train arrivals:', err);
          setError('Could not load train arrivals');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchArrivals();

    // Set up a refresh interval (every 30 seconds)
    const intervalId = setInterval(fetchArrivals, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [stationCode]);

  const refreshArrivals = useCallback(async () => {
    if (!stationCode || loading) return;
    
    setLoading(true);
    try {
      const response = await ltaService.getTrainArrivals(stationCode);
      if (response && response.Services) {
        setArrivals(response.Services);
        setError(null);
      } else {
        setArrivals([]);
      }
    } catch (err) {
      console.error('[useTrainArrivals] Error refreshing train arrivals:', err);
      setError('Could not refresh train arrivals');
    } finally {
      setLoading(false);
    }
  }, [stationCode, loading]);

  return { arrivals, loading, error, refreshArrivals };
};

// Helper function to format arrival time
const formatArrivalTime = (isoTimeString: string): string => {
  if (!isoTimeString) return 'N/A';
  
  try {
    const arrivalTime = new Date(isoTimeString);
    const now = new Date();
    
    // Calculate minutes difference
    const diffMs = arrivalTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins <= 0) return 'Arriving';
    if (diffMins === 1) return '1 min';
    return `${diffMins} mins`;
  } catch (err) {
    console.error('Error formatting time:', err);
    return 'N/A';
  }
};

// Hook for search functionality
export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    busStops: [],
    busServices: [],
    trainStations: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { favorites } = useFavorites();

  // Load search history on mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await ltaService.getSearchHistory();
        setSearchHistory(history);
      } catch (err) {
        console.error('Error loading search history:', err);
      }
    };
    
    loadSearchHistory();
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim() === '') {
      setResults({ busStops: [], busServices: [], trainStations: [] });
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await ltaService.searchTransport(searchQuery);
      
      // Update results with favorites status
      const updatedResults = {
        busStops: searchResults.busStops,
        busServices: searchResults.busServices.map(service => ({
          ...service,
          isFavorite: favorites.includes(service.id)
        })),
        trainStations: searchResults.trainStations
      };
      
      setResults(updatedResults);
      
      // Update search history
      const history = await ltaService.getSearchHistory();
      setSearchHistory(history);
    } catch (err) {
      console.error('Error performing search:', err);
      setError('Could not perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [favorites]);

  // Clear search history
  const clearSearchHistory = useCallback(async () => {
    try {
      await ltaService.clearSearchHistory();
      setSearchHistory([]);
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    performSearch,
    searchHistory,
    clearSearchHistory
  };
};