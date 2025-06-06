import * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CachedLocation {
  coordinates: Coordinates;
  timestamp: number;
}

let currentLocationSubscribers: ((location: Coordinates) => void)[] = [];
let locationCache: CachedLocation | null = null;
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

// Default location (Singapore) for fallback
const DEFAULT_LOCATION: Coordinates = {
  latitude: 1.3521,
  longitude: 103.8198
};

// Global subscription for continuous background location updates
let globalWatchSubscription: Location.LocationSubscription | null = null;
let globalFallbackInterval: NodeJS.Timeout | null = null;
let isBackgroundLocationRunning = false;

// Real location service without mock functionality
export const locationService = {
  // Initialize location services and request permissions
  async init(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }
      
      // Start the background location updates immediately after initialization
      this.startBackgroundLocationUpdates();
      return true;
    } catch (error) {
      console.error('Error initializing location service:', error);
      return false;
    }
  },
  
  // Start continuous background location updates
  startBackgroundLocationUpdates(): void {
    // Don't start if already running
    if (isBackgroundLocationRunning) {
      console.log('Background location updates already running');
      return;
    }
    
    console.log('Starting background location updates');
    isBackgroundLocationRunning = true;
    
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        console.log('Location permission denied for background updates, using default');
        // Use interval with default location as fallback
        globalFallbackInterval = setInterval(() => {
          // Update the cache with default location
          locationCache = {
            coordinates: DEFAULT_LOCATION,
            timestamp: Date.now()
          };
          
          // Notify all subscribers
          currentLocationSubscribers.forEach(callback => {
            callback(DEFAULT_LOCATION);
          });
        }, 3000);
        return;
      }
      
      // Start watching with optimized settings for transit tracking
      Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.BestForNavigation, 
          timeInterval: 3000,  // Update every 3 seconds
          distanceInterval: 5  // Update after moving 5 meters
        },
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          
          // Update the cache with the latest location
          locationCache = {
            coordinates: location,
            timestamp: Date.now()
          };
          
          console.log('Background location update:', location);
          
          // Notify all subscribers
          currentLocationSubscribers.forEach(callback => {
            callback(location);
          });
        }
      ).then(subscription => {
        globalWatchSubscription = subscription;
      }).catch(error => {
        console.error('Error setting up background location watching:', error);
        // Fallback to interval with default location
        globalFallbackInterval = setInterval(() => {
          // Update the cache with default location
          locationCache = {
            coordinates: DEFAULT_LOCATION,
            timestamp: Date.now()
          };
          
          // Notify all subscribers
          currentLocationSubscribers.forEach(callback => {
            callback(DEFAULT_LOCATION);
          });
        }, 3000);
      });
    });
  },
  
  // Stop background location updates
  stopBackgroundLocationUpdates(): void {
    console.log('Stopping background location updates');
    
    if (globalWatchSubscription) {
      globalWatchSubscription.remove();
      globalWatchSubscription = null;
    }
    
    if (globalFallbackInterval) {
      clearInterval(globalFallbackInterval);
      globalFallbackInterval = null;
    }
    
    isBackgroundLocationRunning = false;
  },

  // Get current location with high accuracy and caching
  async getCurrentLocation(): Promise<Coordinates> {
    try {
      // Start background updates if not already running
      if (!isBackgroundLocationRunning) {
        this.startBackgroundLocationUpdates();
      }
      
      // Check if we have a valid cached location
      const now = Date.now();
      if (locationCache && (now - locationCache.timestamp < CACHE_TTL_MS)) {
        console.log('Using cached location from', new Date(locationCache.timestamp));
        return locationCache.coordinates;
      }
      
      // No valid cache, get a fresh location directly
      // This should rarely happen since background updates should keep the cache fresh
      console.log('No valid cached location, getting fresh location');
      return await this.updateLocationCache();
    } catch (error) {
      console.error('Error getting location:', error);
      return locationCache?.coordinates || DEFAULT_LOCATION;
    }
  },
  
  // Helper method to update the location cache
  async updateLocationCache(): Promise<Coordinates> {
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Location permission not granted, using default location');
      return DEFAULT_LOCATION;
    }
    
    // Get the actual device location with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation
    });
    
    const coordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    
    // Update the cache
    locationCache = {
      coordinates,
      timestamp: Date.now()
    };
    
    console.log('Updated location cache:', coordinates);
    return coordinates;
  },

  // Watch location changes with optimized settings for transit tracking
  watchLocation(callback: (location: Coordinates) => void): () => void {
    // Add to subscribers list
    currentLocationSubscribers.push(callback);
    
    // Make sure background location updates are running
    if (!isBackgroundLocationRunning) {
      this.startBackgroundLocationUpdates();
    }
    
    // If we have a current location, immediately call the callback
    if (locationCache) {
      // Use setTimeout to make this async
      setTimeout(() => {
        callback(locationCache!.coordinates);
      }, 0);
    }
    
    // Return unsubscribe function
    return () => {
      // Remove from subscribers list
      currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
    };
  },

  // These methods are kept for API compatibility but now do nothing
  disableTestMode() {
    // No-op - test mode is removed
    return true;
  },

  isTestModeEnabled() {
    // Always return false since test mode is removed
    return false;
  }
};