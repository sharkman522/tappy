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
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          // Try to use web Geolocation API
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              },
              (error) => {
                console.error('Error getting browser geolocation:', error);
                // Fall back to default location
                resolve({ latitude: 1.3521, longitude: 103.8198 });
              },
              { enableHighAccuracy: true }
            );
          } else {
            // No geolocation available, use default
            resolve({ latitude: 1.3521, longitude: 103.8198 });
          }
        });
      } else {
        // For non-web platforms, return default Singapore location
        return { latitude: 1.3521, longitude: 103.8198 };
      }
    } catch (error) {
      console.error('Error getting location:', error);
      // Return a default location (Singapore)
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

    // Real location watching for web
    if (Platform.OS === 'web' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error watching location:', error);
          // Provide mock location as fallback
          callback({ latitude: 1.3521, longitude: 103.8198 });
        },
        { enableHighAccuracy: true }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        currentLocationSubscribers = currentLocationSubscribers.filter(sub => sub !== callback);
      };
    } else {
      // For native platforms without native modules or no geolocation,
      // just use a simple interval to move through the mock route
      const intervalId = setInterval(() => {
        // Just use default location 
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