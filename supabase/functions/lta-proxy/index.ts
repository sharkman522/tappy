// Follow this Deno implementation guide: https://deno.com/deploy/docs/hello-world

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://your-project-ref.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase-based cache implementation
class SupabaseCache {
  private tableName = 'lta_cache';
  
  constructor() {
    // Table should be created in advance with the following structure:
    // - key (text, primary key)
    // - value (jsonb)
    // - expires_at (timestamp with time zone)
  }

  async get(key: string[]) {
    const keyString = key.join('::');
    
    try {
      // Get cache entry and check expiry
      const { data, error } = await supabase
        .from(this.tableName)
        .select('key, value, expires_at')
        .eq('key', keyString)
        .single();
      
      if (error || !data) {
        return { value: null };
      }
      
      // Check if entry has expired
      if (new Date(data.expires_at) < new Date()) {
        // Delete expired entry
        await supabase
          .from(this.tableName)
          .delete()
          .eq('key', keyString);
        return { value: null };
      }
      
      return { value: data.value };
    } catch (error) {
      console.error(`[lta-proxy] Cache get error:`, error);
      return { value: null };
    }
  }

  async set(key: string[], value: any, options?: { expireIn?: number }) {
    const keyString = key.join('::');
    const expiryMs = options?.expireIn || 24 * 60 * 60 * 1000; // Default 24 hours
    const expiryDate = new Date(Date.now() + expiryMs);
    
    try {
      // Upsert cache entry
      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          key: keyString,
          value: value,
          expires_at: expiryDate.toISOString()
        });
      
      if (error) {
        console.error(`[lta-proxy] Cache set error:`, error);
        return { ok: false };
      }
      
      return { ok: true };
    } catch (error) {
      console.error(`[lta-proxy] Cache set error:`, error);
      return { ok: false };
    }
  }
}

// Initialize Supabase cache
const kv = new SupabaseCache();

interface RequestParams {
  endpoint: string;
  method: string;
  params?: Record<string, string>;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Whether to return stale data while fetching fresh data
}

// Cache configuration based on endpoint type
const CACHE_CONFIG: Record<string, CacheConfig> = {
  // Static data (bus stops, routes, services) - cache for 24 hours
  "BusStops": { ttl: 24 * 60 * 60 * 1000, staleWhileRevalidate: true },
  "BusServices": { ttl: 24 * 60 * 60 * 1000, staleWhileRevalidate: true },
  "BusRoutes": { ttl: 24 * 60 * 60 * 1000, staleWhileRevalidate: true },
  // Dynamic data (bus arrivals) - cache for 30 seconds
  "v3/BusArrival": { ttl: 30 * 1000, staleWhileRevalidate: false },
  // Default cache config (5 minutes)
  "default": { ttl: 5 * 60 * 1000, staleWhileRevalidate: false }
};

const LTA_API_URL = Deno.env.get("LTA_API_URL") || "https://datamall2.mytransport.sg/ltaodataservice";

serve(async (req) => {
  console.log('[lta-proxy] Received request:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('[lta-proxy] Handling CORS preflight request');
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      const requestBody = await req.json();
      console.log('[lta-proxy] Request body:', JSON.stringify(requestBody));
      
      const { endpoint, method, params = {} } = requestBody as RequestParams;
      console.log(`[lta-proxy] Processing request for endpoint: ${endpoint}, method: ${method}`);
      console.log('[lta-proxy] Request params:', params);
      
      // Validate endpoint to prevent arbitrary API calls
      const validEndpoints = [
        "BusStops", 
        "BusServices", 
        "BusRoutes", 
        "v3/BusArrival"
      ];
      
      if (!validEndpoints.includes(endpoint)) {
        console.error(`[lta-proxy] Invalid endpoint requested: ${endpoint}`);
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      console.log(`[lta-proxy] Endpoint ${endpoint} validated successfully`);

      // Build URL with query parameters
      let url = `${LTA_API_URL}/${endpoint}`;
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
      }
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      // Generate a cache key based on the endpoint, method, and params
      const cacheKey = [`lta-proxy`, endpoint, method, JSON.stringify(params)];
      console.log(`[lta-proxy] Cache key: ${cacheKey.join('::')}`);
      
      // Get cache configuration for this endpoint
      const cacheConfig = CACHE_CONFIG[endpoint] || CACHE_CONFIG.default;
      
      // Try to get data from cache first
      const cachedResult = await kv.get(cacheKey);
      
      if (cachedResult.value) {
        const { data, timestamp } = cachedResult.value as { data: any, timestamp: number };
        const age = Date.now() - timestamp;
        
        // Check if the cached data is still fresh
        if (age < cacheConfig.ttl) {
          console.log(`[lta-proxy] Cache HIT (fresh): ${endpoint} - Age: ${age}ms`);
          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" } }
          );
        } 
        
        // If staleWhileRevalidate is enabled, return stale data and refresh in background
        if (cacheConfig.staleWhileRevalidate) {
          console.log(`[lta-proxy] Cache HIT (stale): ${endpoint} - Age: ${age}ms`);
          
          // Refresh cache in background
          setTimeout(async () => {
            try {
              await fetchAndCacheData(url, method, cacheKey, cacheConfig);
              console.log(`[lta-proxy] Background cache refresh completed for ${endpoint}`);
            } catch (error) {
              console.error(`[lta-proxy] Background cache refresh failed for ${endpoint}:`, error);
            }
          }, 0);
          
          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" } }
          );
        }
      }
      
      console.log(`[lta-proxy] Cache MISS: ${endpoint}`);
      
      // If not in cache or stale without staleWhileRevalidate, fetch from API
      return await fetchAndCacheData(url, method, cacheKey, cacheConfig, corsHeaders);
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

/**
 * Fetches data from the LTA API and caches it
 */
async function fetchAndCacheData(
  url: string, 
  method: string, 
  cacheKey: string[], 
  cacheConfig: CacheConfig,
  responseHeaders: Record<string, string> = corsHeaders
) {
  console.log(`[lta-proxy] Fetching from API: ${url}`);
  
  // Make request to LTA API
  const response = await fetch(url, {
    method: method || "GET",
    headers: {
      "AccountKey": 'qYVYhFVvQZuDj2KI3w8lBw==',
      "Accept": "application/json"
    }
  });

  // Check if the response is successful
  if (!response.ok) {
    console.error(`API error: ${response.status} ${response.statusText}`);
    return new Response(
      JSON.stringify({ 
        error: "API request failed", 
        status: response.status,
        statusText: response.statusText 
      }),
      { 
        status: response.status, 
        headers: { ...responseHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  // Check if response is empty
  const responseText = await response.text();
  if (!responseText) {
    return new Response(
      JSON.stringify({ error: "Empty response from API" }),
      { 
        status: 500, 
        headers: { ...responseHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  // Parse JSON safely
  let data;
  try {
    data = JSON.parse(responseText);
    
    // Cache the successful response
    const cacheValue = {
      data,
      timestamp: Date.now()
    };
    
    // Store in KV with expiry based on TTL
    const result = await kv.set(cacheKey, cacheValue, { expireIn: cacheConfig.ttl });
    if (!result.ok) {
      console.error(`[lta-proxy] Failed to cache data for ${cacheKey.join('::')}`);  
    } else {
      console.log(`[lta-proxy] Successfully cached data for ${cacheKey.join('::')}, expires in ${cacheConfig.ttl}ms`);
    }
    
  } catch (error) {
    const parseError = error as Error;
    console.error("JSON parsing error:", parseError);
    return new Response(
      JSON.stringify({ 
        error: "Invalid JSON response from API", 
        details: parseError.message,
        responseText: responseText.substring(0, 100) // Include part of the response for debugging
      }),
      { 
        status: 500, 
        headers: { ...responseHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  // Return response from LTA API
  return new Response(
    JSON.stringify(data),
    { 
      headers: { ...responseHeaders, "Content-Type": "application/json", "X-Cache": "MISS" } 
    }
  );
}
