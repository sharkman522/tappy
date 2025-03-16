import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { AppTransportService, AppBusStop, SearchResults } from '../types/lta-api';
import { useUserLocation, useNearbyTransportServices, useFavorites, useSearch } from '../utils/ltaDataProvider';

// Define the context type
interface LTAContextType {
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
  locationLoading: boolean;
  locationError: string | null;
  refreshLocation: () => Promise<void>;
  
  nearbyServices: AppTransportService[];
  servicesLoading: boolean;
  servicesError: string | null;
  refreshServices: () => Promise<void>;
  
  favorites: string[];
  favoritesLoading: boolean;
  addFavorite: (routeId: string) => Promise<void>;
  removeFavorite: (routeId: string) => Promise<void>;
  toggleFavorite: (routeId: string) => Promise<boolean | null>;
  
  // Search related
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResults;
  searchLoading: boolean;
  searchError: string | null;
  performSearch: (query: string) => Promise<void>;
  searchHistory: string[];
  clearSearchHistory: () => Promise<void>;
  
  // Optional fallback data for when location is not available
  useFallbackData: boolean;
  setUseFallbackData: (use: boolean) => void;
}

// Create the context
const LTAContext = createContext<LTAContextType | undefined>(undefined);

// Provider component
export function LTAProvider({ children }: { children: ReactNode }) {
  const [useFallbackData, setUseFallbackData] = useState(false);
  
  // Use location hook
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError, 
    refreshLocation 
  } = useUserLocation();
  
  // Use favorites hook
  const { 
    favorites, 
    loading: favoritesLoading, 
    addFavorite: addFavoriteImpl, 
    removeFavorite: removeFavoriteImpl, 
    toggleFavorite: toggleFavoriteImpl 
  } = useFavorites();
  
  // Use nearby services hook (depends on location)
  const { 
    services: nearbyServices, 
    loading: servicesLoading, 
    error: servicesError, 
    refreshServices 
  } = useNearbyTransportServices(
    userLocation?.latitude || (useFallbackData ? 1.3521 : undefined), 
    userLocation?.longitude || (useFallbackData ? 103.8198 : undefined)
  );
  
  // We need to refresh services when favorites change to update UI
  const refreshServicesOnFavoriteChange = useCallback(() => {
    console.log('Refreshing services after favorite change');
    refreshServices();
  }, [refreshServices]);
  
  // Use search hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    performSearch,
    searchHistory,
    clearSearchHistory
  } = useSearch();
  
  // If location is unavailable after a timeout, use fallback data
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (locationLoading || locationError) {
        setUseFallbackData(true);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(fallbackTimer);
  }, [locationLoading, locationError]);
  
  // These wrappers ensure we update the UI state immediately after API calls
  const addFavorite = useCallback(async (routeId: string) => {
    await addFavoriteImpl(routeId);
    // Update the isFavorite property on nearbyServices
    // (This happens automatically through the useEffect in the hook)
  }, [addFavoriteImpl]);
  
  const removeFavorite = useCallback(async (routeId: string) => {
    await removeFavoriteImpl(routeId);
    // Update occurs automatically through useEffect
  }, [removeFavoriteImpl]);
  
  const toggleFavorite = useCallback(async (routeId: string) => {
    // Call the implementation and get the new favorite state
    const newIsFavorite = await toggleFavoriteImpl(routeId);
    
    // Immediately refresh services to update UI
    setTimeout(() => refreshServicesOnFavoriteChange(), 100);
    
    // Return the new state so UI components can update immediately
    return newIsFavorite;
  }, [toggleFavoriteImpl, refreshServicesOnFavoriteChange]);

  const value: LTAContextType = {
    userLocation,
    locationLoading,
    locationError,
    refreshLocation,
    
    nearbyServices,
    servicesLoading,
    servicesError,
    refreshServices,
    
    favorites,
    favoritesLoading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    performSearch,
    searchHistory,
    clearSearchHistory,
    
    useFallbackData,
    setUseFallbackData
  };

  return <LTAContext.Provider value={value}>{children}</LTAContext.Provider>;
}

// Custom hook to use the LTA context
export function useLTA() {
  const context = useContext(LTAContext);
  if (context === undefined) {
    throw new Error('useLTA must be used within an LTAProvider');
  }
  return context;
}