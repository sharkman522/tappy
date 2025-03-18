import { Platform } from 'react-native';

interface Coordinates {
  latitude: number;
  longitude: number;
}

let mockEnabled = false;
let mockRoute: Coordinates[] = [];
let mockCurrentIndex = 0;
let mockWatchId: NodeJS.Timeout | null = null;
let currentLocationSubscribers: ((location: Coordinates) => void)[] = [];

// Main location service with test mode support
export const locationService = {
  // Initialize location services
  async init() {
    // Always return true for web/simplified implementation
    return true;
  },

  // Get current location
  async getCurrentLocation(): Promise<Coordinates> {
    if (mockEnabled && mockRoute.length > 0) {
      return mockRoute[mockCurrentIndex];
    }

    try {
      // Use the Expo Location API to get the actual device location
      // Import the Location API at the top of the file
      const Location = require('expo-location');
      
      // Request permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied, using default location');
        return { latitude: 1.3521, longitude: 103.8198 }; // Default to Singapore
      }
      
      // Get the actual device location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      console.log('Got actual device location:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Error getting location:', error);
      // Return a default location (Singapore) as fallback
      return { latitude: 1.3521, longitude: 103.8198 };
    }
  },

  // Watch location changes
  watchLocation(callback: (location: Coordinates) => void): () => void {
    currentLocationSubscribers.push(callback);

    if (mockEnabled && mockRoute.length > 0) {
      // If already watching, don't start another interval
      if (mockWatchId === null) {
        mockWatchId = setInterval(() => {
          if (mockCurrentIndex < mockRoute.length - 1) {
            mockCurrentIndex++;
            const newLocation = mockRoute[mockCurrentIndex];
            currentLocationSubscribers.forEach(subscriber => subscriber(newLocation));
          } else {
            // End of route
            if (mockWatchId) {
              clearInterval(mockWatchId);
              mockWatchId = null;
            }
          }
        }, 3000); // Update every 3 seconds
      }

      // Return unsubscribe function
      return () => {
        currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
        if (currentLocationSubscribers.length === 0 && mockWatchId) {
          clearInterval(mockWatchId);
          mockWatchId = null;
        }
      };
    }

    try {
      // Use Expo Location API for actual device location tracking
      const Location = require('expo-location');
      
      // Request permission first (if not already granted)
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status !== 'granted') {
          console.log('Location permission denied for watching, using default');
          // Use interval with default location as fallback
          const intervalId = setInterval(() => {
            callback({ latitude: 1.3521, longitude: 103.8198 });
          }, 5000);
          
          return () => {
            clearInterval(intervalId);
            currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
          };
        }
      });
      
      // Start watching position with high accuracy
      const watchId = Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('Location update:', location);
          callback(location);
        }
      );
      
      // Return unsubscribe function
      return () => {
        watchId.then(subscription => subscription.remove());
        currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
      };
    } catch (error) {
      console.error('Error setting up location watching:', error);
      
      // Fallback to interval with default location
      const intervalId = setInterval(() => {
        callback({ latitude: 1.3521, longitude: 103.8198 });
      }, 5000);
      
      return () => {
        clearInterval(intervalId);
        currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
      };
    }
  },

  // Enable test mode with a predefined route
  enableTestMode(route: Coordinates[]) {
    mockEnabled = true;
    mockRoute = route;
    mockCurrentIndex = 0;
    return true;
  },

  // Disable test mode
  disableTestMode() {
    mockEnabled = false;
    if (mockWatchId) {
      clearInterval(mockWatchId);
      mockWatchId = null;
    }
    return true;
  },

  // Check if test mode is enabled
  isTestModeEnabled() {
    return mockEnabled;
  },

  // For testing: manually set the current position in the route
  setMockPosition(index: number) {
    if (mockEnabled && index >= 0 && index < mockRoute.length) {
      mockCurrentIndex = index;
      const newLocation = mockRoute[mockCurrentIndex];
      currentLocationSubscribers.forEach(subscriber => subscriber(newLocation));
      return true;
    }
    return false;
  }
};