import * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

let currentLocationSubscribers: ((location: Coordinates) => void)[] = [];

// Default location (Singapore) for fallback
const DEFAULT_LOCATION: Coordinates = { latitude: 1.3521, longitude: 103.8198 };

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
      return true;
    } catch (error) {
      console.error('Error initializing location service:', error);
      return false;
    }
  },

  // Get current location with high accuracy
  async getCurrentLocation(): Promise<Coordinates> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission not granted, using default location');
        return DEFAULT_LOCATION;
      }
      
      // Get the actual device location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      console.log('Got actual device location:', coordinates);
      return coordinates;
    } catch (error) {
      console.error('Error getting location:', error);
      return DEFAULT_LOCATION;
    }
  },

  // Watch location changes with optimized settings for transit tracking
  watchLocation(callback: (location: Coordinates) => void): () => void {
    // Add to subscribers list
    currentLocationSubscribers.push(callback);

    // Set up real location tracking
    let watchSubscription: Location.LocationSubscription | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    
    // Start watching position with appropriate settings for transit tracking
    // - timeInterval: 3000ms (3s) for more frequent updates
    // - distanceInterval: 5m to detect smaller movements
    // - accuracy: High for better precision
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        console.log('Location permission denied for watching, using default');
        // Use interval with default location as fallback
        fallbackInterval = setInterval(() => {
          callback(DEFAULT_LOCATION);
        }, 3000);
        return;
      }
      
      // Start watching with optimized settings for transit tracking
      Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.High, 
          timeInterval: 3000,  // Update every 3 seconds
          distanceInterval: 5  // Update after moving 5 meters
        },
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('Location update:', location);
          callback(location);
        }
      ).then(subscription => {
        watchSubscription = subscription;
      }).catch(error => {
        console.error('Error setting up location watching:', error);
        // Fallback to interval with default location
        fallbackInterval = setInterval(() => {
          callback(DEFAULT_LOCATION);
        }, 3000);
      });
    });
    
    // Return unsubscribe function
    return () => {
      // Remove from subscribers list
      currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
      
      // Clean up location watching
      if (watchSubscription) {
        watchSubscription.remove();
      }
      
      // Clean up fallback interval if it exists
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
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