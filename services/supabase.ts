import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { BusRoute, TrainStation } from '../types/lta-api';

// Initialize the Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the entire app
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// LTA API wrapper using Supabase RPC
export const ltaApi = {
  /**
   * Get bus stops from LTA API via Supabase proxy
   */
  getBusStops: async (skip = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke('lta-proxy', {
        body: {
          endpoint: 'BusStops',
          method: 'GET',
          params: { $skip: skip.toString() }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching bus stops via Supabase:', error);
      throw error;
    }
  },

  /**
   * Get bus services from LTA API via Supabase proxy
   */
  getBusServices: async (skip = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke('lta-proxy', {
        body: {
          endpoint: 'BusServices',
          method: 'GET',
          params: { $skip: skip.toString() }
        }
      });

      if (error) throw error;
      console.log({data})
      return data;
    } catch (error) {
      console.error('Error fetching bus services via Supabase:', error);
      throw error;
    }
  },

  /**
   * Get bus routes from LTA API via Supabase proxy
   */
  getBusRoutes: async (skip = 0) => {
    try {
      // Check if we have cached data in local storage
      const cachedData = await AsyncStorage.getItem('busRoutesCache');
      const cacheTimestamp = await AsyncStorage.getItem('busRoutesCacheTimestamp');
      
      // If we have cached data and it's less than 24 hours old, use it
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 30* 1000; // 60 days in milliseconds
        
        if (now - timestamp < oneDay) {
          return JSON.parse(cachedData);
        }
      }
      
      // If no valid cache, fetch all routes in parallel using Promise.all
      let allRoutes: BusRoute[] = [];
      
      // Create an array of skip values from 0 to 30000 in increments of 500
      const skipValues = [];
      for (let skip = 0; skip <= 30000; skip += 500) {
        skipValues.push(skip);
      }
      
      // Create an array of promises for each skip value
      const fetchPromises = skipValues.map(skip => 
        supabase.functions.invoke('lta-proxy', {
          body: {
            endpoint: 'BusRoutes',
            method: 'GET',
            params: { $skip: skip.toString() }
          }
        })
      );
      
      // Execute all promises in parallel
      console.log(`Fetching ${fetchPromises.length} batches of bus routes in parallel...`);
      const results = await Promise.all(fetchPromises);
      
      // Process the results
      for (const result of results) {
        const { data, error } = result;
        
        if (error) {
          console.error('Error fetching bus routes:', error);
          continue; // Skip this batch if there's an error
        }
        
        if (data && data.value && data.value.length > 0) {
          allRoutes = [...allRoutes, ...data.value];
          console.log(`Fetched ${data.value.length} routes, total now: ${allRoutes.length}`);
        }
      }
      
      // Cache the results
      const routesData = { value: allRoutes };
      await AsyncStorage.setItem('busRoutesCache', JSON.stringify(routesData));
      await AsyncStorage.setItem('busRoutesCacheTimestamp', Date.now().toString());
      
      return routesData;
    } catch (error) {
      console.error('Error fetching bus routes via Supabase:', error);
      throw error;
    }
  },

  /**
   * Get bus arrivals from LTA API via Supabase proxy
   */
  getBusArrivals: async (busStopCode: string, serviceNo?: string) => {
    console.log(`[ltaApi.getBusArrivals] Starting request for bus stop: ${busStopCode}${serviceNo ? `, service: ${serviceNo}` : ''}`);
    try {
      const params: Record<string, string> = { BusStopCode: busStopCode };
      if (serviceNo) {
        params.ServiceNo = serviceNo;
      }
      
      console.log('[ltaApi.getBusArrivals] Request params:', params);
      console.log('[ltaApi.getBusArrivals] Calling Supabase function: lta-proxy with endpoint: v3/BusArrival');

      const { data, error } = await supabase.functions.invoke('lta-proxy', {
        body: {
          endpoint: 'v3/BusArrival',
          method: 'GET',
          params
        }
      });

      if (error) {
        console.error('[ltaApi.getBusArrivals] Supabase function error:', error);
        throw error;
      }
      
      console.log('[ltaApi.getBusArrivals] Received response data:', data);
      return data;
    } catch (error) {
      console.error(`[ltaApi.getBusArrivals] Error fetching bus arrivals for stop ${busStopCode} via Supabase:`, error);
      throw error;
    }
  },

  /**
   * Get train stations from LTA API via Supabase proxy
   */
  getTrainStations: async () => {
    try {
      // Check if we have cached data in local storage
      const cachedData = await AsyncStorage.getItem('trainStationsCache');
      const cacheTimestamp = await AsyncStorage.getItem('trainStationsCacheTimestamp');
      
      // If we have cached data and it's less than 24 hours old, use it
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (now - timestamp < oneDay) {
          return JSON.parse(cachedData);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('lta-proxy', {
        body: {
          endpoint: 'TrainStationList',
          method: 'GET',
          params: {}
        }
      });

      if (error) throw error;
      
      // Cache the results
      await AsyncStorage.setItem('trainStationsCache', JSON.stringify(data));
      await AsyncStorage.setItem('trainStationsCacheTimestamp', Date.now().toString());
      
      return data;
    } catch (error) {
      console.error('Error fetching train stations via Supabase:', error);
      throw error;
    }
  },

  /**
   * Get train service alerts from LTA API via Supabase proxy
   */
  getTrainServiceAlerts: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('lta-proxy', {
        body: {
          endpoint: 'TrainServiceAlerts',
          method: 'GET',
          params: {}
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching train service alerts via Supabase:', error);
      throw error;
    }
  },

  /**
   * Get train arrival timing for a specific station
   */
  getTrainArrivals: async (stationCode: string) => {
    try {
      console.log(`[ltaApi.getTrainArrivals] Starting request for station: ${stationCode}`);
      
      const { data, error } = await supabase.functions.invoke('lta-proxy', {
        body: {
          endpoint: 'TrainArrival',
          method: 'GET',
          params: { StationCode: stationCode }
        }
      });

      if (error) {
        console.error('[ltaApi.getTrainArrivals] Supabase function error:', error);
        throw error;
      }
      
      console.log('[ltaApi.getTrainArrivals] Received response data:', data);
      return data;
    } catch (error) {
      console.error(`[ltaApi.getTrainArrivals] Error fetching train arrivals for station ${stationCode} via Supabase:`, error);
      throw error;
    }
  }
};