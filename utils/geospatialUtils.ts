/**
 * Geospatial Utilities for Tappy's Travels
 * 
 * This module provides optimized geospatial algorithms for location matching
 * and nearest neighbor searches in the application.
 */

import { AppBusStop, AppTrainStation } from '../types/lta-api';

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians
 */
export const deg2rad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * This accounts for the Earth's curvature and is more accurate for geographic coordinates
 * than Euclidean distance.
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in kilometers
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Implementation of K-nearest neighbors algorithm for bus stops
 * 
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param busStops - Array of bus stops
 * @param k - Number of nearest neighbors to return (default: 10)
 * @returns Array of k nearest bus stops with distance information
 */
export const findKNearestBusStops = (
  userLat: number,
  userLon: number,
  busStops: AppBusStop[],
  k: number = 10
): AppBusStop[] => {
  // Calculate distances for all bus stops
  const stopsWithDistance = busStops.map(stop => {
    const distance = haversineDistance(
      userLat,
      userLon,
      stop.coordinates.latitude,
      stop.coordinates.longitude
    );
    return { ...stop, distance };
  });
  
  // Sort by distance (closest first) and take the k nearest
  return stopsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
};

/**
 * Implementation of K-nearest neighbors algorithm for train stations
 * 
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param trainStations - Array of train stations
 * @param k - Number of nearest neighbors to return (default: 5)
 * @returns Array of k nearest train stations with distance information
 */
export const findKNearestTrainStations = (
  userLat: number,
  userLon: number,
  trainStations: AppTrainStation[],
  k: number = 5
): AppTrainStation[] => {
  // Calculate distances for all train stations
  const stationsWithDistance = trainStations.map(station => {
    const distance = haversineDistance(
      userLat,
      userLon,
      station.coordinates.latitude,
      station.coordinates.longitude
    );
    return { ...station, distance };
  });
  
  // Sort by distance (closest first) and take the k nearest
  return stationsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
};

/**
 * Creates a spatial index for bus stops using a simplified grid-based approach
 * This is more efficient than computing distances for all stops when dealing with large datasets
 * 
 * @param busStops - Array of bus stops to index
 * @param gridSize - Size of grid cells in degrees (default: 0.01, roughly 1km)
 * @returns A spatial index for quick proximity lookups
 */
export const createBusStopSpatialIndex = (
  busStops: AppBusStop[],
  gridSize: number = 0.01
) => {
  const gridIndex: { [key: string]: AppBusStop[] } = {};
  
  // Place each bus stop in a grid cell
  busStops.forEach(stop => {
    // Calculate grid cell coordinates
    const gridX = Math.floor(stop.coordinates.longitude / gridSize);
    const gridY = Math.floor(stop.coordinates.latitude / gridSize);
    const gridKey = `${gridX}:${gridY}`;
    
    // Add to grid
    if (!gridIndex[gridKey]) {
      gridIndex[gridKey] = [];
    }
    gridIndex[gridKey].push(stop);
  });
  
  /**
   * Find nearby bus stops using the spatial index
   * 
   * @param lat - Latitude to search around
   * @param lon - Longitude to search around
   * @param radiusKm - Search radius in kilometers
   * @returns Array of bus stops within the radius
   */
  const findNearby = (lat: number, lon: number, radiusKm: number): AppBusStop[] => {
    // Convert radius to approximate grid cells
    // 0.01 degrees is roughly 1km at the equator
    const gridRadius = Math.ceil(radiusKm / (gridSize * 111));
    
    // Calculate user's grid cell
    const userGridX = Math.floor(lon / gridSize);
    const userGridY = Math.floor(lat / gridSize);
    
    // Collect stops from nearby grid cells
    const nearbyStops: AppBusStop[] = [];
    
    // Search in surrounding grid cells
    for (let x = userGridX - gridRadius; x <= userGridX + gridRadius; x++) {
      for (let y = userGridY - gridRadius; y <= userGridY + gridRadius; y++) {
        const key = `${x}:${y}`;
        if (gridIndex[key]) {
          nearbyStops.push(...gridIndex[key]);
        }
      }
    }
    
    // Calculate actual distances and filter by radius
    return nearbyStops
      .map(stop => {
        const distance = haversineDistance(
          lat,
          lon,
          stop.coordinates.latitude,
          stop.coordinates.longitude
        );
        return { ...stop, distance };
      })
      .filter(stop => stop.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  };
  
  return {
    findNearby,
    // Return the raw index for advanced usage
    gridIndex
  };
};

/**
 * Calculates the bearing between two points
 * Useful for determining direction for journey planning
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Bearing in degrees (0-360)
 */
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const startLat = deg2rad(lat1);
  const startLng = deg2rad(lon1);
  const destLat = deg2rad(lat2);
  const destLng = deg2rad(lon2);

  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x = Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  let brng = Math.atan2(y, x);
  brng = (brng * 180 / Math.PI + 360) % 360; // Convert to degrees
  
  return brng;
};

/**
 * Finds the closest stop to the user's location from an array of stops
 * This is a unified function that can be used across the application for consistency
 * 
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param stops - Array of stops with coordinates
 * @param maxDistanceKm - Maximum distance in kilometers to consider a stop as "closest" (default: 1km)
 * @returns Object containing the closest stop, its index, and all stops with distance information
 */
export const findClosestStop = <T extends { id: string; coordinates: { latitude: number; longitude: number } }>(  
  userLat: number,
  userLon: number,
  stops: T[],
  maxDistanceKm: number = 1 // Default max distance of 1km
): { 
  closestStop: T & { distance: number } | null; 
  closestStopIndex: number; 
  stopsWithDistance: (T & { distance: number })[] 
} => {
  if (!stops || stops.length === 0) {
    return { closestStop: null, closestStopIndex: -1, stopsWithDistance: [] };
  }
  
  // Calculate distances for all stops
  const stopsWithDistance = stops.map(stop => {
    const distance = haversineDistance(
      userLat,
      userLon,
      stop.coordinates.latitude,
      stop.coordinates.longitude
    );
    return { ...stop, distance };
  });
  
  // Sort by distance (closest first)
  const sortedStops = [...stopsWithDistance].sort((a, b) => a.distance - b.distance);
  
  // Find the closest stop
  const closestStop = sortedStops[0];
  
  // If the closest stop is too far away, don't consider it as "current"
  if (closestStop && closestStop.distance > maxDistanceKm) {
    console.log(`Closest stop is too far away: ${closestStop.distance.toFixed(2)}km > ${maxDistanceKm}km threshold`);
    return {
      closestStop: null,
      closestStopIndex: -1,
      stopsWithDistance
    };
  }
  
  // Find the index of the closest stop in the original stops array
  const closestStopIndex = stops.findIndex(stop => stop.id === closestStop.id);
  
  return {
    closestStop,
    closestStopIndex,
    stopsWithDistance
  };
};

/**
 * Determines if a point is within a given distance of a path
 * Useful for determining if a user is on a specific bus route
 * 
 * @param pointLat - Latitude of the point
 * @param pointLon - Longitude of the point
 * @param pathPoints - Array of path points as [lat, lon] pairs
 * @param maxDistanceKm - Maximum distance in kilometers
 * @returns Whether the point is within the specified distance of the path
 */
export const isPointNearPath = (
  pointLat: number,
  pointLon: number,
  pathPoints: [number, number][],
  maxDistanceKm: number
): boolean => {
  // Check distance to each segment of the path
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const [lat1, lon1] = pathPoints[i];
    const [lat2, lon2] = pathPoints[i + 1];
    
    // Calculate distance from point to line segment
    const distance = distanceToLineSegment(
      pointLat, pointLon,
      lat1, lon1,
      lat2, lon2
    );
    
    if (distance <= maxDistanceKm) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calculates the distance from a point to a line segment
 * 
 * @param pointLat - Latitude of the point
 * @param pointLon - Longitude of the point
 * @param lineLat1 - Latitude of first endpoint of the line
 * @param lineLon1 - Longitude of first endpoint of the line
 * @param lineLat2 - Latitude of second endpoint of the line
 * @param lineLon2 - Longitude of second endpoint of the line
 * @returns Distance in kilometers
 */
export const distanceToLineSegment = (
  pointLat: number,
  pointLon: number,
  lineLat1: number,
  lineLon1: number,
  lineLat2: number,
  lineLon2: number
): number => {
  // Convert to Cartesian coordinates for simplicity
  // This is an approximation that works for small distances
  const p = {
    x: pointLon,
    y: pointLat
  };
  
  const v1 = {
    x: lineLon1,
    y: lineLat1
  };
  
  const v2 = {
    x: lineLon2,
    y: lineLat2
  };
  
  // Calculate the squared length of the line segment
  const l2 = Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);
  
  // If the line segment is just a point, return distance to that point
  if (l2 === 0) {
    return haversineDistance(pointLat, pointLon, lineLat1, lineLon1);
  }
  
  // Calculate projection of point onto line
  const t = Math.max(0, Math.min(1, (
    (p.x - v1.x) * (v2.x - v1.x) + (p.y - v1.y) * (v2.y - v1.y)
  ) / l2));
  
  // Calculate the closest point on the line segment
  const closestPoint = {
    x: v1.x + t * (v2.x - v1.x),
    y: v1.y + t * (v2.y - v1.y)
  };
  
  // Calculate Haversine distance to the closest point
  return haversineDistance(pointLat, pointLon, closestPoint.y, closestPoint.x);
};
