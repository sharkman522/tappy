import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  DataMallResponse, 
  BusStop, 
  BusArrival,
  BusRoute,
  BusService,
  TrainStation,
  TrainServiceAlert,
  AppBusStop,
  AppBusService,
  AppTrainStation,
  AppTrainService,
  AppTransportService
} from '../types/lta-api';
import { ltaApi } from './supabase';

// Cache keys
const CACHE_KEYS = {
  BUS_STOPS: 'lta_bus_stops',
  BUS_SERVICES: 'lta_bus_services',
  TRAIN_STATIONS: 'lta_train_stations',
  FAVORITES: 'lta_favorites',
  SEARCH_HISTORY: 'lta_search_history',
};

// Cache TTL in milliseconds (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Cache timestamp key suffix
const TIMESTAMP_SUFFIX = '_timestamp';

// Helper function to store data based on platform
const storeData = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    // Fallback to AsyncStorage if SecureStore fails
    if (Platform.OS !== 'web') {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (fallbackError) {
        console.error(`Fallback storage also failed for key ${key}:`, fallbackError);
      }
    }
  }
};

// Helper function to retrieve data based on platform
const retrieveData = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) {
        return value;
      }
      // If SecureStore returns null, try AsyncStorage as fallback
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Error retrieving data for key ${key}:`, error);
    // If SecureStore fails, try AsyncStorage
    if (Platform.OS !== 'web') {
      try {
        return await AsyncStorage.getItem(key);
      } catch (fallbackError) {
        console.error(`Fallback retrieval also failed for key ${key}:`, fallbackError);
        return null;
      }
    }
    return null;
  }
};

// Helper function to check if cache is valid
const isCacheValid = async (key: string): Promise<boolean> => {
  const timestamp = await retrieveData(key + TIMESTAMP_SUFFIX);
  if (!timestamp) return false;
  
  const cachedTime = parseInt(timestamp, 10);
  return Date.now() - cachedTime < CACHE_TTL;
};

// Helper function to save data to cache
const saveToCache = async <T>(key: string, data: T): Promise<void> => {
  await storeData(key, JSON.stringify(data));
  await storeData(key + TIMESTAMP_SUFFIX, Date.now().toString());
};

// Helper function to get data from cache
const getFromCache = async <T>(key: string): Promise<T | null> => {
  const isValid = await isCacheValid(key);
  if (!isValid) return null;
  
  const data = await retrieveData(key);
  return data ? JSON.parse(data) as T : null;
};

// Bus Services
export const getBusStops = async (): Promise<AppBusStop[]> => {
  // Try to get from cache first
  const cached = await getFromCache<AppBusStop[]>(CACHE_KEYS.BUS_STOPS);
  if (cached) return cached;
  
  // Fetch all bus stops (need to handle pagination since API returns max 500 items per request)
  let allBusStops: BusStop[] = [];
  let skip = 0;
  const limit = 500;
  
  while (true) {
    try {
      // Use Supabase RPC function instead of direct API call
      const response = await ltaApi.getBusStops(skip);
      const busStops = response.value;
      
      if (busStops.length === 0) break;
      
      allBusStops = [...allBusStops, ...busStops];
      skip += limit;
      
      // If we got less than the limit, we've reached the end
      if (busStops.length < limit) break;
    } catch (error) {
      console.error('Error fetching bus stops:', error);
      throw error;
    }
  }
  
  // Map to app format
  const appBusStops: AppBusStop[] = allBusStops.map(stop => ({
    ...stop,
    id: stop.BusStopCode,
    name: stop.Description, 
    coordinates: {
      latitude: stop.Latitude,
      longitude: stop.Longitude
    }
  }));
  
  // Save to cache
  await saveToCache(CACHE_KEYS.BUS_STOPS, appBusStops);
  
  return appBusStops;
};

export const getBusServices = async (): Promise<BusService[]> => {
  // Try to get from cache first
  const cached = await getFromCache<BusService[]>(CACHE_KEYS.BUS_SERVICES);
  if (cached) return cached;
  
  // Estimated total number of bus services in Singapore (around 600-700)
  // Using a conservative estimate of 800 to ensure we fetch all services
  const estimatedTotalServices = 800;
  const limit = 100; // LTA API limit per request
  
  // Calculate number of batches needed
  const batchCount = Math.ceil(estimatedTotalServices / limit);
  const batchOffsets = Array.from({ length: batchCount }, (_, i) => i * limit);
  
  try {
    // Make parallel requests using Promise.all
    const responses = await Promise.all(
      batchOffsets.map(offset => ltaApi.getBusServices(offset))
    );
    
    // Combine all results
    const allBusServices = responses.flatMap(response => response.value);
    
    // Save to cache
    await saveToCache(CACHE_KEYS.BUS_SERVICES, allBusServices);
    
    return allBusServices;
  } catch (error) {
    console.error('Error fetching bus services:', error);
    throw error;
  }
};

export const getBusArrivals = async (busStopCode: string): Promise<BusArrival[]> => {
  console.log(`[getBusArrivals] Fetching arrivals for bus stop: ${busStopCode}`);
  try {
    // Use Supabase RPC function instead of direct API call
    const response = await ltaApi.getBusArrivals(busStopCode);
    console.log(`[getBusArrivals] Response from API:`, response);
    
    const services = response.Services || [];
    console.log(`[getBusArrivals] Extracted ${services.length} services from response`);
    return services;
  } catch (error) {
    console.error(`[getBusArrivals] Error fetching bus arrivals for stop ${busStopCode}:`, error);
    throw error;
  }
};

export const getBusRoutes = async (serviceNo: string): Promise<BusRoute[]> => {
  try {
    // Use Supabase RPC function to get all routes (now with pagination and caching)
    const response = await ltaApi.getBusRoutes(0);
    
    // Filter for the specific service number
    if (response && response.value && Array.isArray(response.value)) {
      return response.value.filter(route => route.ServiceNo === serviceNo);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching routes for bus ${serviceNo}:`, error);
    throw error;
  }
};

// Train Services
export const getTrainStations = async (): Promise<AppTrainStation[]> => {
  // Try to get from cache first
  const cached = await getFromCache<AppTrainStation[]>(CACHE_KEYS.TRAIN_STATIONS);
  if (cached) return cached;
  
  try {
    // This is a placeholder since LTA API doesn't have a direct endpoint for train stations
    // In a real app, you'd fetch from the actual API endpoint or use a predetermined list
    
    // Simulating train station data for Singapore's MRT lines
    const trainStations: TrainStation[] = [
      // North-South Line (Red)
      { StationCode: 'NS1', StationName: 'Jurong East', Line: 'NSL', Latitude: 1.3329, Longitude: 103.7422 },
      { StationCode: 'NS2', StationName: 'Bukit Batok', Line: 'NSL', Latitude: 1.3491, Longitude: 103.7493 },
      { StationCode: 'NS3', StationName: 'Bukit Gombak', Line: 'NSL', Latitude: 1.3587, Longitude: 103.7519 },
      { StationCode: 'NS4', StationName: 'Choa Chu Kang', Line: 'NSL', Latitude: 1.3852, Longitude: 103.7443 },
      { StationCode: 'NS5', StationName: 'Yew Tee', Line: 'NSL', Latitude: 1.3973, Longitude: 103.7474 },
      { StationCode: 'NS7', StationName: 'Kranji', Line: 'NSL', Latitude: 1.4252, Longitude: 103.7618 },
      { StationCode: 'NS8', StationName: 'Marsiling', Line: 'NSL', Latitude: 1.4326, Longitude: 103.7743 },
      { StationCode: 'NS9', StationName: 'Woodlands', Line: 'NSL', Latitude: 1.4369, Longitude: 103.7864 },
      { StationCode: 'NS10', StationName: 'Admiralty', Line: 'NSL', Latitude: 1.4406, Longitude: 103.8010 },
      { StationCode: 'NS11', StationName: 'Sembawang', Line: 'NSL', Latitude: 1.4491, Longitude: 103.8197 },
      { StationCode: 'NS12', StationName: 'Canberra', Line: 'NSL', Latitude: 1.4431, Longitude: 103.8296 },
      { StationCode: 'NS13', StationName: 'Yishun', Line: 'NSL', Latitude: 1.4295, Longitude: 103.8353 },
      { StationCode: 'NS14', StationName: 'Khatib', Line: 'NSL', Latitude: 1.4174, Longitude: 103.8329 },
      { StationCode: 'NS15', StationName: 'Yio Chu Kang', Line: 'NSL', Latitude: 1.3817, Longitude: 103.8448 },
      { StationCode: 'NS16', StationName: 'Ang Mo Kio', Line: 'NSL', Latitude: 1.3700, Longitude: 103.8495 },
      { StationCode: 'NS17', StationName: 'Bishan', Line: 'NSL', Latitude: 1.3506, Longitude: 103.8483 },
      { StationCode: 'NS18', StationName: 'Braddell', Line: 'NSL', Latitude: 1.3404, Longitude: 103.8471 },
      { StationCode: 'NS19', StationName: 'Toa Payoh', Line: 'NSL', Latitude: 1.3326, Longitude: 103.8474 },
      { StationCode: 'NS20', StationName: 'Novena', Line: 'NSL', Latitude: 1.3204, Longitude: 103.8439 },
      { StationCode: 'NS21', StationName: 'Newton', Line: 'NSL', Latitude: 1.3138, Longitude: 103.8381 },
      { StationCode: 'NS22', StationName: 'Orchard', Line: 'NSL', Latitude: 1.3043, Longitude: 103.8322 },
      { StationCode: 'NS23', StationName: 'Somerset', Line: 'NSL', Latitude: 1.3006, Longitude: 103.8389 },
      { StationCode: 'NS24', StationName: 'Dhoby Ghaut', Line: 'NSL', Latitude: 1.2986, Longitude: 103.8456 },
      { StationCode: 'NS25', StationName: 'City Hall', Line: 'NSL', Latitude: 1.2926, Longitude: 103.8529 },
      { StationCode: 'NS26', StationName: 'Raffles Place', Line: 'NSL', Latitude: 1.2840, Longitude: 103.8514 },
      { StationCode: 'NS27', StationName: 'Marina Bay', Line: 'NSL', Latitude: 1.2765, Longitude: 103.8547 },
      { StationCode: 'NS28', StationName: 'Marina South Pier', Line: 'NSL', Latitude: 1.2713, Longitude: 103.8631 },
      
      // East-West Line (Green)
      { StationCode: 'EW1', StationName: 'Pasir Ris', Line: 'EWL', Latitude: 1.3732, Longitude: 103.9492 },
      { StationCode: 'EW2', StationName: 'Tampines', Line: 'EWL', Latitude: 1.3546, Longitude: 103.9456 },
      { StationCode: 'EW3', StationName: 'Simei', Line: 'EWL', Latitude: 1.3432, Longitude: 103.9530 },
      { StationCode: 'EW4', StationName: 'Tanah Merah', Line: 'EWL', Latitude: 1.3272, Longitude: 103.9468 },
      { StationCode: 'EW5', StationName: 'Bedok', Line: 'EWL', Latitude: 1.3244, Longitude: 103.9296 },
      { StationCode: 'EW6', StationName: 'Kembangan', Line: 'EWL', Latitude: 1.3214, Longitude: 103.9129 },
      { StationCode: 'EW7', StationName: 'Eunos', Line: 'EWL', Latitude: 1.3198, Longitude: 103.9030 },
      { StationCode: 'EW8', StationName: 'Paya Lebar', Line: 'EWL', Latitude: 1.3177, Longitude: 103.8927 },
      { StationCode: 'EW9', StationName: 'Aljunied', Line: 'EWL', Latitude: 1.3162, Longitude: 103.8829 },
      { StationCode: 'EW10', StationName: 'Kallang', Line: 'EWL', Latitude: 1.3116, Longitude: 103.8713 },
      { StationCode: 'EW11', StationName: 'Lavender', Line: 'EWL', Latitude: 1.3075, Longitude: 103.8630 },
      { StationCode: 'EW12', StationName: 'Bugis', Line: 'EWL', Latitude: 1.3011, Longitude: 103.8562 },
      { StationCode: 'EW13', StationName: 'City Hall', Line: 'EWL', Latitude: 1.2926, Longitude: 103.8529 },
      { StationCode: 'EW14', StationName: 'Raffles Place', Line: 'EWL', Latitude: 1.2840, Longitude: 103.8514 },
      { StationCode: 'EW15', StationName: 'Tanjong Pagar', Line: 'EWL', Latitude: 1.2762, Longitude: 103.8462 },
      { StationCode: 'EW16', StationName: 'Outram Park', Line: 'EWL', Latitude: 1.2807, Longitude: 103.8388 },
      { StationCode: 'EW17', StationName: 'Tiong Bahru', Line: 'EWL', Latitude: 1.2861, Longitude: 103.8267 },
      { StationCode: 'EW18', StationName: 'Redhill', Line: 'EWL', Latitude: 1.2901, Longitude: 103.8168 },
      { StationCode: 'EW19', StationName: 'Queenstown', Line: 'EWL', Latitude: 1.2951, Longitude: 103.8060 },
      { StationCode: 'EW20', StationName: 'Commonwealth', Line: 'EWL', Latitude: 1.3023, Longitude: 103.7982 },
      { StationCode: 'EW21', StationName: 'Buona Vista', Line: 'EWL', Latitude: 1.3073, Longitude: 103.7901 },
      { StationCode: 'EW22', StationName: 'Dover', Line: 'EWL', Latitude: 1.3116, Longitude: 103.7787 },
      { StationCode: 'EW23', StationName: 'Clementi', Line: 'EWL', Latitude: 1.3151, Longitude: 103.7652 },
      { StationCode: 'EW24', StationName: 'Jurong East', Line: 'EWL', Latitude: 1.3329, Longitude: 103.7422 },
      { StationCode: 'EW25', StationName: 'Chinese Garden', Line: 'EWL', Latitude: 1.3421, Longitude: 103.7328 },
      { StationCode: 'EW26', StationName: 'Lakeside', Line: 'EWL', Latitude: 1.3444, Longitude: 103.7208 },
      { StationCode: 'EW27', StationName: 'Boon Lay', Line: 'EWL', Latitude: 1.3386, Longitude: 103.7060 },
      { StationCode: 'EW28', StationName: 'Pioneer', Line: 'EWL', Latitude: 1.3378, Longitude: 103.6972 },
      { StationCode: 'EW29', StationName: 'Joo Koon', Line: 'EWL', Latitude: 1.3278, Longitude: 103.6783 },
      { StationCode: 'EW30', StationName: 'Gul Circle', Line: 'EWL', Latitude: 1.3207, Longitude: 103.6606 },
      { StationCode: 'EW31', StationName: 'Tuas Crescent', Line: 'EWL', Latitude: 1.3212, Longitude: 103.6496 },
      { StationCode: 'EW32', StationName: 'Tuas West Road', Line: 'EWL', Latitude: 1.3302, Longitude: 103.6385 },
      { StationCode: 'EW33', StationName: 'Tuas Link', Line: 'EWL', Latitude: 1.3396, Longitude: 103.6368 },
    ];
    
    // Map to app format
    const appTrainStations: AppTrainStation[] = trainStations.map(station => ({
      ...station,
      id: station.StationCode,
      name: station.StationName,
      coordinates: {
        latitude: station.Latitude,
        longitude: station.Longitude
      }
    }));
    
    // Save to cache
    await saveToCache(CACHE_KEYS.TRAIN_STATIONS, appTrainStations);
    
    return appTrainStations;
  } catch (error) {
    console.error('Error fetching train stations:', error);
    throw error;
  }
};

export const getTrainServiceAlerts = async (): Promise<TrainServiceAlert | null> => {
  try {
    // LTA doesn't provide a direct API for train service alerts
    // In a real app, you would fetch from an actual API endpoint
    
    // For this demo, we'll return a normal status
    return {
      Status: "1", // 1 = Normal service
      AffectedSegments: [],
      Message: "Normal service on all lines."
    };
  } catch (error) {
    console.error('Error fetching train service alerts:', error);
    throw error;
  }
};

// Format time string to human-readable form
export const formatArrivalTime = (arrivalTimeISO: string): string => {
  if (!arrivalTimeISO) return 'No arrivals';
  
  try {
    const arrivalTime = new Date(arrivalTimeISO);
    const now = new Date();
    
    // Calculate minutes difference
    const diffMs = arrivalTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins <= 0) return 'Arriving';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    
    // If more than an hour, show time
    return arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error('Error formatting arrival time:', e);
    return 'Unknown';
  }
};

// Get bus stop name by code
export const getBusStopName = async (busStopCode: string): Promise<string> => {
  try {
    const busStops = await getBusStops();
    const busStop = busStops.find(stop => stop.BusStopCode === busStopCode);
    return busStop ? busStop.Description : 'Unknown Bus Stop';
  } catch (error) {
    console.error(`Error getting bus stop name for ${busStopCode}:`, error);
    return 'Unknown Bus Stop';
  }
};

// Get nearby bus stops based on coordinates
export const getNearbyBusStops = async (
  latitude: number, 
  longitude: number, 
  radius: number = 0.5
): Promise<AppBusStop[]> => {
  try {
    const busStops = await getBusStops();
    
    // Calculate distances and filter by radius (in km)
    return busStops.filter(stop => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        stop.coordinates.latitude, 
        stop.coordinates.longitude
      );
      return distance <= radius;
    });
  } catch (error) {
    console.error('Error getting nearby bus stops:', error);
    throw error;
  }
};

// Get nearby train stations based on coordinates
export const getNearbyTrainStations = async (
  latitude: number, 
  longitude: number, 
  radius: number = 1
): Promise<AppTrainStation[]> => {
  try {
    const trainStations = await getTrainStations();
    
    // Calculate distances and filter by radius (in km)
    return trainStations.filter(station => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        station.coordinates.latitude, 
        station.coordinates.longitude
      );
      return distance <= radius;
    });
  } catch (error) {
    console.error('Error getting nearby train stations:', error);
    throw error;
  }
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};

// Search functionality
export interface SearchResult {
  busStops: AppBusStop[];
  busServices: AppBusService[];
  trainStations: AppTrainStation[];
}

export const searchTransport = async (query: string): Promise<SearchResult> => {
  if (!query || query.trim() === '') {
    return { busStops: [], busServices: [], trainStations: [] };
  }

  try {
    // Normalize search query
    const normalizedQuery = query.trim().toLowerCase();
    
    // Get all data
    const [busStops, busServices, trainStations, favorites] = await Promise.all([
      getBusStops(),
      getBusServices(),
      getTrainStations(),
      getFavoriteRoutes()
    ]);
    
    // Search bus stops
    const matchedBusStops = busStops.filter(stop => 
      stop.BusStopCode.toLowerCase().includes(normalizedQuery) || 
      stop.Description.toLowerCase().includes(normalizedQuery) ||
      stop.RoadName.toLowerCase().includes(normalizedQuery)
    ).slice(0, 10); // Limit to 10 results
    
    // Search bus services
    const matchedBusServices = busServices
      .filter(service => service.ServiceNo.toLowerCase().includes(normalizedQuery))
      .slice(0, 10) // Limit to 10 results
      .map(service => {
        const id = `${service.ServiceNo}-${service.OriginCode}`;
        return {
          id,
          type: 'bus' as const,
          routeNumber: `Bus ${service.ServiceNo}`,
          destination: service.LoopDesc || `To ${service.DestinationCode}`,
          time: 'Check schedule',
          isFavorite: favorites.includes(id)
        };
      });
    
    // Search train stations
    const matchedTrainStations = trainStations.filter(station => 
      station.StationCode.toLowerCase().includes(normalizedQuery) || 
      station.StationName.toLowerCase().includes(normalizedQuery)
    ).slice(0, 10); // Limit to 10 results
    
    // Add to search history
    await addToSearchHistory(query);
    
    return {
      busStops: matchedBusStops,
      busServices: matchedBusServices,
      trainStations: matchedTrainStations
    };
  } catch (error) {
    console.error('Error searching transport:', error);
    throw error;
  }
};

// Search history management
export const getSearchHistory = async (): Promise<string[]> => {
  try {
    const history = await retrieveData(CACHE_KEYS.SEARCH_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
};

export const addToSearchHistory = async (query: string): Promise<void> => {
  if (!query || query.trim() === '') return;
  
  try {
    const history = await getSearchHistory();
    const normalizedQuery = query.trim();
    
    // Remove if already exists (to move it to the top)
    const updatedHistory = history.filter(item => item !== normalizedQuery);
    
    // Add to the beginning of the array
    updatedHistory.unshift(normalizedQuery);
    
    // Keep only the most recent 10 searches
    const limitedHistory = updatedHistory.slice(0, 10);
    
    await storeData(CACHE_KEYS.SEARCH_HISTORY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error adding to search history:', error);
  }
};

export const clearSearchHistory = async (): Promise<void> => {
  try {
    await storeData(CACHE_KEYS.SEARCH_HISTORY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

// Favorites Management
export const getFavoriteRoutes = async (): Promise<string[]> => {
  try {
    const favorites = await retrieveData(CACHE_KEYS.FAVORITES);
    return favorites ? JSON.parse(favorites) : [];
  } catch (error) {
    console.error('Error getting favorite routes:', error);
    return [];
  }
};

export const addFavoriteRoute = async (routeId: string): Promise<void> => {
  try {
    const favorites = await getFavoriteRoutes();
    if (!favorites.includes(routeId)) {
      favorites.push(routeId);
      await storeData(CACHE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error adding favorite route:', error);
    throw error;
  }
};

export const removeFavoriteRoute = async (routeId: string): Promise<void> => {
  try {
    const favorites = await getFavoriteRoutes();
    const updatedFavorites = favorites.filter(id => id !== routeId);
    await storeData(CACHE_KEYS.FAVORITES, JSON.stringify(updatedFavorites));
  } catch (error) {
    console.error('Error removing favorite route:', error);
    throw error;
  }
};

// Get nearby transport services (bus and train)
export const getNearbyTransportServices = async (
  latitude: number,
  longitude: number
): Promise<AppTransportService[]> => {
  try {
    // Get nearby bus stops
    const busStops = await getNearbyBusStops(latitude, longitude);
    
    // Get bus arrivals for each stop
    const busServices: AppBusService[] = [];
    const favorites = await getFavoriteRoutes();
    
    // Limit to first 3 bus stops to avoid too many API calls
    const limitedBusStops = busStops.slice(0, 3);
    
    for (const stop of limitedBusStops) {
      try {
        const arrivals = await getBusArrivals(stop.BusStopCode);
        
        // Create app bus services from arrivals
        for (const arrival of arrivals) {
          // Only add if we have valid arrival info
          if (arrival.NextBus && arrival.NextBus.EstimatedArrival) {
            const id = `${arrival.ServiceNo}-${stop.BusStopCode}`;
            const destinationName = await getBusStopName(arrival.NextBus.DestinationCode);
            
            busServices.push({
              id,
              type: 'bus',
              routeNumber: `Bus ${arrival.ServiceNo}`,
              destination: destinationName,
              time: `Next in ${formatArrivalTime(arrival.NextBus.EstimatedArrival)}`,
              isFavorite: favorites.includes(id)
            });
          }
        }
      } catch (error) {
        console.error(`Error getting bus arrivals for stop ${stop.BusStopCode}:`, error);
        // Continue with next stop
      }
    }
    
    // Get nearby train stations
    const trainStations = await getNearbyTrainStations(latitude, longitude);
    
    // For trains, we don't have real-time arrivals through the API
    // So we'll create generic train services for each nearby station
    const trainServices: AppTrainService[] = trainStations.map(station => {
      const id = `${station.Line}-${station.StationCode}`;
      let lineName = '';
      
      // Map line code to line name
      switch (station.Line) {
        case 'NSL': lineName = 'North-South Line'; break;
        case 'EWL': lineName = 'East-West Line'; break;
        case 'CCL': lineName = 'Circle Line'; break;
        case 'DTL': lineName = 'Downtown Line'; break;
        case 'NEL': lineName = 'North East Line'; break;
        case 'TEL': lineName = 'Thomson-East Coast Line'; break;
        default: lineName = station.Line;
      }
      
      return {
        id,
        type: 'train',
        routeNumber: lineName,
        destination: station.name,
        time: 'Check platform display',
        isFavorite: favorites.includes(id)
      };
    });
    
    // Combine and sort services
    return [...busServices, ...trainServices].sort((a, b) => {
      // Sort favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then sort by estimated arrival time (if available)
      const timeA = a.time.includes('min') 
        ? parseInt(a.time.match(/\d+/)?.[0] || '999', 10)
        : 999;
      const timeB = b.time.includes('min')
        ? parseInt(b.time.match(/\d+/)?.[0] || '999', 10)
        : 999;
      
      return timeA - timeB;
    });
  } catch (error) {
    console.error('Error getting nearby transport services:', error);
    throw error;
  }
};