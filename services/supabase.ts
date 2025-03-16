import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { BusRoute } from '../types/lta-api';

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
      
      // If no valid cache, fetch all routes by paginating
      let allRoutes: BusRoute[] = [];
      let currentSkip = 0;
      let hasMoreData = true;
      
      while (hasMoreData) {
        const { data, error } = await supabase.functions.invoke('lta-proxy', {
          body: {
            endpoint: 'BusRoutes',
            method: 'GET',
            params: { $skip: currentSkip.toString() }
          }
        });

        console.log({data2: data})

        if (error) throw error;
        
        if (data && data.value && data.value.length > 0) {
          allRoutes = [...allRoutes, ...data.value];
          currentSkip += data.value.length;
        } else {
          hasMoreData = false;
        }
        
        // Safety check to prevent infinite loops
        // Set the limit to match the expected total data size of 5975570
        if (currentSkip >= 12000) {
          hasMoreData = false;
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
  }
};