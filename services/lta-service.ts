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
import {
  haversineDistance,
  findKNearestBusStops,
  findKNearestTrainStations,
  createSpatialIndex,
  calculateBearing,
  isPointNearPath
} from '../utils/geospatialUtils';
import {
  CACHE_KEYS,
  CACHE_TTL,
  saveToCache,
  getFromCache,
  clearCache,
  deduplicateRequest
} from '../utils/cacheUtils';

// Spatial indices for fast geospatial queries
let busStopSpatialIndex: ReturnType<typeof createSpatialIndex<AppBusStop>> | null = null;
let trainStationSpatialIndex: ReturnType<typeof createSpatialIndex<AppTrainStation>> | null = null;

// Bus Services
export const getBusStops = async (): Promise<AppBusStop[]> => {
  return deduplicateRequest<AppBusStop[]>('getBusStops', async () => {
    console.log('[getBusStops] Checking cache for bus stops');
    // Try to get from cache first with LONG TTL (24 hours)
    const cached = await getFromCache<AppBusStop[]>(CACHE_KEYS.BUS_STOPS, CACHE_TTL.LONG);
    if (cached) {
      console.log(`[getBusStops] Using cached data with ${cached.length} bus stops`);
      
      // Initialize spatial index if not already done
      if (!busStopSpatialIndex) {
        console.log('[getBusStops] Creating spatial index from cached bus stops');
        busStopSpatialIndex = createSpatialIndex<AppBusStop>(cached);
      }
      
      return cached;
    }
    
    console.log('[getBusStops] Cache miss, fetching from API');
    // Fetch all bus stops (need to handle pagination since API returns max 500 items per request)
    let allBusStops: BusStop[] = [];
    let skip = 0;
    const limit = 500;
    
    while (true) {
      try {
        console.log(`[getBusStops] Fetching batch with skip=${skip}`);
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
    
    console.log(`[getBusStops] Fetched ${allBusStops.length} bus stops from API`);
    
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
    
    // Create spatial index for fast geospatial queries
    busStopSpatialIndex = createBusStopSpatialIndex(appBusStops);
    console.log('[getBusStops] Created spatial index for bus stops');
    
    return appBusStops;
  });
};

export const getBusServices = async (): Promise<BusService[]> => {
  return deduplicateRequest<BusService[]>('getBusServices', async () => {
    console.log('[getBusServices] Checking cache for bus services');
    // Try to get from cache first with LONG TTL (24 hours)
    const cached = await getFromCache<BusService[]>(CACHE_KEYS.BUS_SERVICES, CACHE_TTL.LONG);
    if (cached) {
      console.log(`[getBusServices] Using cached data with ${cached.length} bus services`);
      return cached;
    }
    
    console.log('[getBusServices] Cache miss, fetching from API');
    // Estimated total number of bus services in Singapore (around 600-700)
    // Using a conservative estimate of 800 to ensure we fetch all services
    const estimatedTotalServices = 800;
    const limit = 100; // LTA API limit per request
    
    // Calculate number of batches needed
    const batchCount = Math.ceil(estimatedTotalServices / limit);
    const batchOffsets = Array.from({ length: batchCount }, (_, i) => i * limit);
    
    try {
      console.log(`[getBusServices] Making ${batchCount} parallel requests`);
      // Make parallel requests using Promise.all
      const responses = await Promise.all(
        batchOffsets.map(offset => ltaApi.getBusServices(offset))
      );
      
      // Combine all results
      const allBusServices = responses.flatMap(response => response.value);
      console.log(`[getBusServices] Fetched ${allBusServices.length} bus services from API`);
      
      // Save to cache
      await saveToCache(CACHE_KEYS.BUS_SERVICES, allBusServices);
      
      return allBusServices;
    } catch (error) {
      console.error('Error fetching bus services:', error);
      throw error;
    }
  });
};

export const getBusArrivals = async (busStopCode: string): Promise<BusArrival[]> => {
  return deduplicateRequest<BusArrival[]>(`getBusArrivals_${busStopCode}`, async () => {
    console.log(`[getBusArrivals] Fetching arrivals for bus stop: ${busStopCode}`);
    
    // Check cache with SHORT TTL (5 minutes) for arrivals
    const cacheKey = `${CACHE_KEYS.BUS_ARRIVALS}${busStopCode}`;
    const cached = await getFromCache<BusArrival[]>(cacheKey, CACHE_TTL.SHORT);
    
    if (cached) {
      console.log(`[getBusArrivals] Using cached arrivals for stop ${busStopCode}`);
      return cached;
    }
    
    try {
      // Use Supabase RPC function instead of direct API call
      const response = await ltaApi.getBusArrivals(busStopCode);
      
      const services = response.Services || [];
      console.log(`[getBusArrivals] Fetched ${services.length} services from API`);
      
      // Cache arrivals with SHORT TTL
      await saveToCache(cacheKey, services);
      
      return services;
    } catch (error) {
      console.error(`[getBusArrivals] Error fetching bus arrivals for stop ${busStopCode}:`, error);
      throw error;
    }
  });
};

// Function to fetch all bus routes with caching
const fetchAllBusRoutes = async (): Promise<BusRoute[]> => {
  return deduplicateRequest<BusRoute[]>('fetchAllBusRoutes', async () => {
    console.log('[fetchAllBusRoutes] Checking cache for all bus routes');
    
    // Try to get from cache first with LONG TTL (24 hours)
    const cached = await getFromCache<BusRoute[]>(CACHE_KEYS.BUS_ROUTES, CACHE_TTL.LONG);
    if (cached) {
      console.log(`[fetchAllBusRoutes] Using cached data with ${cached.length} bus routes`);
      return cached;
    }
    
    console.log('[fetchAllBusRoutes] Cache miss, fetching all bus routes from API');
    
    try {
      // Fetch from API
      const response = await ltaApi.getBusRoutes(0);
      
      if (response && response.value && Array.isArray(response.value)) {
        const routes = response.value;
        console.log(`[fetchAllBusRoutes] Received ${routes.length} bus routes from API`);
        
        // Save to cache
        await saveToCache(CACHE_KEYS.BUS_ROUTES, routes);
        
        return routes;
      } else {
        console.log('[fetchAllBusRoutes] Invalid response structure:', response);
        return [];
      }
    } catch (error) {
      console.error('[fetchAllBusRoutes] Error fetching all bus routes:', error);
      return [];
    }
  });
};

export const getBusRoutes = async (serviceNo: string): Promise<BusRoute[]> => {
  return deduplicateRequest<BusRoute[]>(`getBusRoutes_${serviceNo}`, async () => {
    console.log(`[getBusRoutes] Fetching routes for bus service: ${serviceNo}`);
    
    if (!serviceNo) {
      console.log('[getBusRoutes] No service number provided, returning empty array');
      return [];
    }
    
    // Check service-specific cache first with LONG TTL (24 hours)
    const serviceSpecificCacheKey = `${CACHE_KEYS.BUS_ROUTES_BY_SERVICE}${serviceNo}`;
    const cachedRoutes = await getFromCache<BusRoute[]>(serviceSpecificCacheKey, CACHE_TTL.LONG);
    
    if (cachedRoutes) {
      console.log(`[getBusRoutes] Using cached routes for service ${serviceNo}`);
      return cachedRoutes;
    }
    
    try {
      // Get all routes from API (this function already has its own caching)
      const allRoutes = await fetchAllBusRoutes();
      console.log(`[getBusRoutes] Got ${allRoutes.length} total routes, filtering for service ${serviceNo}`);
      
      // Try multiple matching strategies
      // 1. Exact match (most strict)
      let filteredRoutes = allRoutes.filter(route => route.ServiceNo === serviceNo);
      
      // 2. Try loose equality if no exact matches (handles type coercion)
      if (filteredRoutes.length === 0) {
        filteredRoutes = allRoutes.filter(route => route.ServiceNo == serviceNo);
      }
      
      // 3. Try trimmed comparison if still no matches (handles whitespace issues)
      if (filteredRoutes.length === 0) {
        const trimmedServiceNo = serviceNo.trim();
        filteredRoutes = allRoutes.filter(route => {
          const routeServiceNo = route.ServiceNo?.trim() || '';
          return routeServiceNo === trimmedServiceNo;
        });
      }
      
      // 4. Case insensitive comparison as last resort
      if (filteredRoutes.length === 0) {
        const lowerServiceNo = serviceNo.toLowerCase().trim();
        filteredRoutes = allRoutes.filter(route => {
          const routeServiceNo = route.ServiceNo?.toLowerCase().trim() || '';
          return routeServiceNo === lowerServiceNo;
        });
      }
      
      // Log the results
      if (filteredRoutes.length > 0) {
        console.log(`[getBusRoutes] Found ${filteredRoutes.length} routes for service ${serviceNo}`);
        
        // Cache the filtered routes for this specific service
        await saveToCache(serviceSpecificCacheKey, filteredRoutes);
      } else {
        console.log(`[getBusRoutes] No routes found for service ${serviceNo} after all matching attempts`);
      }
      
      return filteredRoutes;
    } catch (error) {
      console.error(`[getBusRoutes] Error fetching routes for bus ${serviceNo}:`, error);
      throw error;
    }
  });
};

// Train Services
export const getTrainStations = async (): Promise<AppTrainStation[]> => {
  return deduplicateRequest<AppTrainStation[]>('getTrainStations', async () => {
    console.log('[getTrainStations] Checking cache for train stations');
    // Try to get from cache first with LONG TTL (24 hours)
    const cached = await getFromCache<AppTrainStation[]>(CACHE_KEYS.TRAIN_STATIONS, CACHE_TTL.LONG);
    if (cached) {
      console.log(`[getTrainStations] Using cached data with ${cached.length} train stations`);
      
      // Initialize spatial index if not already done
      if (!trainStationSpatialIndex) {
        console.log('[getTrainStations] Creating spatial index from cached train stations');
        trainStationSpatialIndex = createSpatialIndex<AppTrainStation>(cached);
      }
      
      return cached;
    }
    
    console.log('[getTrainStations] Cache miss, fetching from API');
    try {
      // Fetch train stations from LTA API via Supabase
    const response = await ltaApi.getTrainStations();
    const trainStations = response.value || [];
    
    console.log(`[getTrainStations] Fetched ${trainStations.length} train stations from API`);
    
    // Map to app format
    const appTrainStations: AppTrainStation[] = trainStations.map((station: TrainStation) => ({
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
    
    // Create spatial index for fast geospatial queries
    trainStationSpatialIndex = createSpatialIndex<AppTrainStation>(appTrainStations);
    console.log('[getTrainStations] Created spatial index for train stations');
    
    return appTrainStations;
  } catch (error) {
    console.error('Error fetching train stations:', error);
    
    // Fallback to hardcoded data if API fails
    console.log('[getTrainStations] API failed, using fallback data');
    
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
      
      // East-West Line (Green) - just a few stations as examples
      { StationCode: 'EW1', StationName: 'Pasir Ris', Line: 'EWL', Latitude: 1.3732, Longitude: 103.9492 },
      { StationCode: 'EW2', StationName: 'Tampines', Line: 'EWL', Latitude: 1.3546, Longitude: 103.9456 },
      { StationCode: 'EW3', StationName: 'Simei', Line: 'EWL', Latitude: 1.3432, Longitude: 103.9530 },
      { StationCode: 'EW4', StationName: 'Tanah Merah', Line: 'EWL', Latitude: 1.3272, Longitude: 103.9468 },
      { StationCode: 'EW5', StationName: 'Bedok', Line: 'EWL', Latitude: 1.3244, Longitude: 103.9296 },
    ];
    
    // Map to app format
    const appTrainStations: AppTrainStation[] = trainStations.map((station: TrainStation) => ({
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
  }
  });
};

export const getTrainArrivals = async (stationCode: string): Promise<any> => {
  return deduplicateRequest<any>(`getTrainArrivals_${stationCode}`, async () => {
    console.log(`[getTrainArrivals] Fetching arrivals for station: ${stationCode}`);
    
    // Check cache with SHORT TTL (5 minutes) for arrivals
    const cacheKey = `${CACHE_KEYS.TRAIN_ARRIVALS}${stationCode}`;
    const cached = await getFromCache<any>(cacheKey, CACHE_TTL.SHORT);
    
    if (cached) {
      console.log(`[getTrainArrivals] Using cached arrivals for station ${stationCode}`);
      return cached;
    }
    
    try {
      // Fetch train arrivals from LTA API via Supabase
      const response = await ltaApi.getTrainArrivals(stationCode);
      
      if (response) {
        console.log('[getTrainArrivals] Received train arrivals data from API');
        // Cache arrivals with SHORT TTL
        await saveToCache(cacheKey, response);
        return response;
      }
      
      // Return empty data if no arrivals are available
      console.log('[getTrainArrivals] No arrivals data from API');
      return { Services: [] };
    } catch (error) {
      console.error(`[getTrainArrivals] Error fetching train arrivals for station ${stationCode}:`, error);
      // Return empty data in case of error
      return { Services: [] };
    }
  });
};

export const getTrainServiceAlerts = async (): Promise<TrainServiceAlert | null> => {
  return deduplicateRequest<TrainServiceAlert | null>('getTrainServiceAlerts', async () => {
    console.log('[getTrainServiceAlerts] Checking for cached service alerts');
    
    // Use a medium TTL for service alerts (1 hour)
    const cached = await getFromCache<TrainServiceAlert | null>('lta_train_service_alerts', CACHE_TTL.MEDIUM);
    if (cached) {
      console.log('[getTrainServiceAlerts] Using cached service alerts');
      return cached;
    }
    
    try {
      // Fetch train service alerts from LTA API via Supabase
      const response = await ltaApi.getTrainServiceAlerts();
      
      if (response && response.value && response.value.length > 0) {
        console.log('[getTrainServiceAlerts] Received service alerts from API');
        const alerts = response.value[0];
        
        // Cache the alerts with MEDIUM TTL
        await saveToCache('lta_train_service_alerts', alerts);
        
        return alerts;
      }
      
      // Fallback to default response if no data is returned
      console.log('[getTrainServiceAlerts] No alerts from API, using default response');
      const defaultAlerts = {
        Status: "1", // 1 = Normal service
        AffectedSegments: [],
        Message: "Normal service on all lines."
      };
      
      // Cache the default alerts
      await saveToCache('lta_train_service_alerts', defaultAlerts);
      
      return defaultAlerts;
    } catch (error) {
      console.error('Error fetching train service alerts:', error);
      
      // Return a default response in case of error
      return {
        Status: "1", // 1 = Normal service
        AffectedSegments: [],
        Message: "Normal service on all lines."
      };
    }
  });
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
  return deduplicateRequest<string>(`getBusStopName_${busStopCode}`, async () => {
    try {
      // Check memory cache for bus stop names (very fast lookup)
      const busStopNameCacheKey = `busStopName_${busStopCode}`;
      const cachedName = await getFromCache<string>(busStopNameCacheKey, CACHE_TTL.VERY_LONG);
      
      if (cachedName) {
        return cachedName;
      }
      
      // If not in cache, look it up from the full bus stops list
      const busStops = await getBusStops();
      const busStop = busStops.find(stop => stop.BusStopCode === busStopCode);
      const name = busStop ? busStop.Description : 'Unknown Bus Stop';
      
      // Cache the name for future lookups
      await saveToCache(busStopNameCacheKey, name);
      
      return name;
    } catch (error) {
      console.error(`Error getting bus stop name for ${busStopCode}:`, error);
      return 'Unknown Bus Stop';
    }
  });
};

// Get nearby bus stops based on coordinates using optimized K-nearest neighbors algorithm
export const getNearbyBusStops = async (
  latitude: number, 
  longitude: number, 
  radius: number = 0.5,
  limit: number = 20
): Promise<AppBusStop[]> => {
  return deduplicateRequest<AppBusStop[]>(`getNearbyBusStops_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${radius}_${limit}`, async () => {
    console.log(`[getNearbyBusStops] Finding bus stops near (${latitude}, ${longitude})`);
    
    try {
      const busStops = await getBusStops();
      
      // Use spatial index if already created (much faster)
      if (busStopSpatialIndex) {
        console.log('[getNearbyBusStops] Using spatial index for faster query');
        const nearbyStops = busStopSpatialIndex.nearest(
          { x: longitude, y: latitude },
          limit,
          radius * 1000 // Convert km to meters
        );
        
        // With our updated spatial index, we now get the stops directly
        return nearbyStops;
      }
      
      // If no spatial index yet, create one
      console.log('[getNearbyBusStops] Creating spatial index for bus stops');
      busStopSpatialIndex = createSpatialIndex(busStops);
      
      // Now use the spatial index
      const nearbyStops = busStopSpatialIndex.nearest(
        { x: longitude, y: latitude },
        limit,
        radius * 1000 // Convert km to meters
      );
      
      // With our updated spatial index, we now get the stops directly
      return nearbyStops;
    } catch (error) {
      console.error('Error getting nearby bus stops:', error);
      throw error;
    }
  });
};

// Get nearby train stations based on coordinates using optimized K-nearest neighbors algorithm
export const getNearbyTrainStations = async (
  latitude: number, 
  longitude: number, 
  radius: number = 1,
  limit: number = 10
): Promise<AppTrainStation[]> => {
  return deduplicateRequest<AppTrainStation[]>(`getNearbyTrainStations_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${radius}_${limit}`, async () => {
    console.log(`[getNearbyTrainStations] Finding train stations near (${latitude}, ${longitude})`);
    
    try {
      const trainStations = await getTrainStations();
      
      // Use spatial index if available for faster queries
      if (trainStationSpatialIndex) {
        console.log('[getNearbyTrainStations] Using spatial index for faster query');
        const nearbyStations = trainStationSpatialIndex.nearest(
          { x: longitude, y: latitude },
          limit,
          radius * 1000 // Convert km to meters
        );
        
        // With our updated spatial index, we now get the stations directly
        return nearbyStations;
      }
      
      // If no spatial index yet, create one
      console.log('[getNearbyTrainStations] Creating spatial index for train stations');
      trainStationSpatialIndex = createSpatialIndex(trainStations);
      
      // Now use the spatial index
      const nearbyStations = trainStationSpatialIndex.nearest(
        { x: longitude, y: latitude },
        limit,
        radius * 1000 // Convert km to meters
      );
      
      // With our updated spatial index, we now get the stations directly
      return nearbyStations;
    } catch (error) {
      console.error('Error getting nearby train stations:', error);
      throw error;
    }
  });
};

// Use the haversineDistance function from geospatialUtils instead
const calculateDistance = haversineDistance;

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
    const history = await getFromCache<string[]>(CACHE_KEYS.SEARCH_HISTORY, CACHE_TTL.VERY_LONG);
    return history || [];
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
    
    await saveToCache(CACHE_KEYS.SEARCH_HISTORY, limitedHistory);
  } catch (error) {
    console.error('Error adding to search history:', error);
  }
};

export const clearSearchHistory = async (): Promise<void> => {
  try {
    await saveToCache(CACHE_KEYS.SEARCH_HISTORY, []);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

// Favorites Management
export const getFavoriteRoutes = async (): Promise<string[]> => {
  try {
    const favorites = await getFromCache<string[]>(CACHE_KEYS.FAVORITES, CACHE_TTL.VERY_LONG);
    return favorites || [];
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
      await saveToCache(CACHE_KEYS.FAVORITES, favorites);
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
    await saveToCache(CACHE_KEYS.FAVORITES, updatedFavorites);
  } catch (error) {
    console.error('Error removing favorite route:', error);
    throw error;
  }
};

// Get nearby transport services (bus and train) using optimized geospatial algorithms
export const getNearbyTransportServices = async (
  latitude: number,
  longitude: number
): Promise<AppTransportService[]> => {
  return deduplicateRequest<AppTransportService[]>(`getNearbyTransportServices_${latitude.toFixed(4)}_${longitude.toFixed(4)}`, async () => {
    console.log(`[getNearbyTransportServices] Finding transport services near (${latitude}, ${longitude})`);
    
    // Check cache with SHORT TTL (2 minutes) for nearby services
    // This helps reduce API calls while still providing relatively fresh data
    const cacheKey = `${CACHE_KEYS.NEARBY_SERVICES}_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const cached = await getFromCache<AppTransportService[]>(cacheKey, CACHE_TTL.SHORT);
    
    if (cached) {
      console.log(`[getNearbyTransportServices] Using cached nearby services (${cached.length} services)`);
      return cached;
    }
    
    try {
    // Get nearby bus stops (already sorted by distance using optimized algorithms)
    const busStops = await getNearbyBusStops(latitude, longitude);
    
    // Get bus arrivals for each stop
    const busServices: AppBusService[] = [];
    const favorites = await getFavoriteRoutes();
    
    // Limit to closest 5 bus stops to avoid too many API calls but ensure we get the nearest ones
    // This is now more accurate since we're using optimized spatial indexing
    const limitedBusStops = busStops.slice(0, 5);
    
    // Create a map to store bus stop distances for later use in sorting
    const busStopDistances = new Map<string, number>();
    limitedBusStops.forEach(stop => {
      busStopDistances.set(stop.BusStopCode, stop.distance || 0);
    });
    
    // Calculate bearing from user to each bus stop for directional context
    const busStopBearings = new Map<string, number>();
    limitedBusStops.forEach(stop => {
      const bearing = calculateBearing(
        latitude,
        longitude,
        stop.coordinates.latitude,
        stop.coordinates.longitude
      );
      busStopBearings.set(stop.BusStopCode, bearing);
    });
    
    // Process each bus stop in parallel for better performance
    const busServicePromises = limitedBusStops.map(async (stop) => {
      try {
        const arrivals = await getBusArrivals(stop.BusStopCode);
        const stopServices: AppBusService[] = [];
        
        // Create app bus services from arrivals
        for (const arrival of arrivals) {
          // Only add if we have valid arrival info
          if (arrival.NextBus && arrival.NextBus.EstimatedArrival) {
            const id = `${arrival.ServiceNo}-${stop.BusStopCode}`;
            const destinationName = await getBusStopName(arrival.NextBus.DestinationCode);
            
            stopServices.push({
              id,
              type: 'bus',
              routeNumber: `Bus ${arrival.ServiceNo}`,
              destination: destinationName,
              time: `Next in ${formatArrivalTime(arrival.NextBus.EstimatedArrival)}`,
              isFavorite: favorites.includes(id),
              // Add distance to the bus service for sorting
              distance: busStopDistances.get(stop.BusStopCode) || 999,
              // Add bus stop code for reference
              busStopCode: stop.BusStopCode,
              // Add bus stop name for display
              busStopName: stop.Description,
              // Add bearing information for directional context
              bearing: busStopBearings.get(stop.BusStopCode)
            });
          }
        }
        
        return stopServices;
      } catch (error) {
        console.error(`Error getting bus arrivals for stop ${stop.BusStopCode}:`, error);
        return [];
      }
    });
    
    // Wait for all bus service requests to complete
    const busServiceResults = await Promise.all(busServicePromises);
    
    // Flatten the array of arrays
    busServiceResults.forEach(services => {
      busServices.push(...services);
    });
    
    // Get nearby train stations using spatial index for faster queries
    const trainStations = await getNearbyTrainStations(latitude, longitude, 1, 5);
    
    // Calculate bearing from user to each train station for directional context
    const trainStationBearings = new Map<string, number>();
    trainStations.forEach(station => {
      const bearing = calculateBearing(
        latitude,
        longitude,
        station.coordinates.latitude,
        station.coordinates.longitude
      );
      trainStationBearings.set(station.StationCode, bearing);
    });
    
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
        isFavorite: favorites.includes(id),
        // Add distance to the train service for sorting
        distance: station.distance || 999,
        // Add bearing information for directional context
        bearing: trainStationBearings.get(station.StationCode)
      };
    });
    
    // Advanced sorting algorithm that considers multiple factors
    const sortedServices = [...busServices, ...trainServices].sort((a, b) => {
      // Sort favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then sort by physical distance (closest first)
      const distanceA = a.distance || 999;
      const distanceB = b.distance || 999;
      
      // If distance difference is significant (more than 100 meters)
      if (Math.abs(distanceA - distanceB) > 0.1) {
        return distanceA - distanceB;
      }
      
      // For services at similar distances, sort by arrival time
      const timeA = a.time.includes('min') 
        ? parseInt(a.time.match(/\d+/)?.[0] || '999', 10)
        : 999;
      const timeB = b.time.includes('min')
        ? parseInt(b.time.match(/\d+/)?.[0] || '999', 10)
        : 999;
      
      // If arrival times are significantly different
      if (Math.abs(timeA - timeB) > 2) {
        return timeA - timeB;
      }
      
      // For services with similar distances and arrival times,
      // prioritize bus services over train services as they're typically more frequent
      if (a.type !== b.type) {
        return a.type === 'bus' ? -1 : 1;
      }
      
      // If all else is equal, sort by service number for consistency
      return a.routeNumber.localeCompare(b.routeNumber);
    });
    
    const result = sortedServices;
      
    // Cache the results with a SHORT TTL (2 minutes)
    await saveToCache(cacheKey, result);
    console.log(`[getNearbyTransportServices] Cached ${result.length} nearby services`);
      
    return result;
  } catch (error) {
    console.error('Error getting nearby transport services:', error);
    throw error;
  }
  });
};