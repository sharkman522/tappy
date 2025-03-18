// Bus Related Types
export interface BusStop {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
}

export interface BusArrival {
  ServiceNo: string;
  Operator: string;
  NextBus: BusArrivalInfo;
  NextBus2: BusArrivalInfo;
  NextBus3: BusArrivalInfo;
}

export interface BusArrivalInfo {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string;
  Monitored: number;
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: string; // SEA (Seats Available) / SDA (Standing Available) / LSD (Limited Standing)
  Feature: string; // WAB (Wheelchair Accessible)
  Type: string; // SD (Single Deck) / DD (Double Deck) / BD (Bendy)
}

export interface BusRoute {
  ServiceNo: string;
  Operator: string;
  Direction: number;
  StopSequence: number;
  BusStopCode: string;
  Distance: number;
  WD_FirstBus: string;
  WD_LastBus: string;
  SAT_FirstBus: string;
  SAT_LastBus: string;
  SUN_FirstBus: string;
  SUN_LastBus: string;
}

export interface BusService {
  ServiceNo: string;
  Operator: string;
  Direction: number;
  Category: string;
  OriginCode: string;
  DestinationCode: string;
  AM_Peak_Freq: string;
  AM_Offpeak_Freq: string;
  PM_Peak_Freq: string;
  PM_Offpeak_Freq: string;
  LoopDesc?: string;
}

// MRT Related Types
export interface TrainStation {
  StationCode: string;
  StationName: string;
  Line: string;
  Latitude: number;
  Longitude: number;
}

export interface TrainServiceAlert {
  Status: string; // 1: Normal, 2: Disruption
  AffectedSegments: TrainDisruption[];
  Message: string;
}

export interface TrainDisruption {
  Line: string;
  Direction: string;
  Stations: string[];
  FreePublicBus: string;
  FreeMRTShuttle: string;
  MRTShuttleDirection: string;
}

// LTA API Response Types
export interface DataMallResponse<T> {
  odata_metadata: string;
  value: T[];
}

// App-specific Types
export interface AppBusStop extends BusStop {
  id: string; // Same as BusStopCode for consistency
  name: string; // Combination of Description and RoadName
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // Distance from user's location in km
  bearing?: number; // Bearing from user's location to the bus stop (0-360 degrees)
  stopSequence?: number; // Sequence number of the stop in the route
  direction?: number; // Direction of the bus route
  time?: string; // Display information about the stop (e.g., "Next stop", "2 stops away")
  stopsAway?: number; // Number of stops away from the current stop
  isPassed?: boolean; // Whether this stop has already been passed by the bus
}

export interface AppBusService {
  id: string; // Same as ServiceNo for consistency
  type: 'bus';
  routeNumber: string; // ServiceNo with "Bus " prefix
  destination: string; // From stop description
  time: string; // Formatted arrival time
  isFavorite: boolean;
  distance?: number; // Distance from user's location in km
  bearing?: number; // Bearing from user's location to the bus stop (0-360 degrees)
  busStopCode?: string; // The bus stop code this service is associated with
  busStopName?: string; // The name of the bus stop this service is associated with
}

export interface AppTrainStation extends TrainStation {
  id: string; // StationCode for consistency
  name: string; // StationName
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // Distance from user's location in km
  bearing?: number; // Bearing from user's location to the train station (0-360 degrees)
}

export interface AppTrainService {
  id: string; // Line code + destination
  type: 'train';
  routeNumber: string; // Line name
  destination: string; // Terminal station
  time: string; // From schedule or just "Next train" if real-time not available
  isFavorite: boolean;
  distance?: number; // Distance from user's location in km
  bearing?: number; // Bearing from user's location to the train station (0-360 degrees)
}

export type AppTransportService = AppBusService | AppTrainService;

// Search related types
export interface SearchResults {
  busStops: AppBusStop[];
  busServices: AppBusService[];
  trainStations: AppTrainStation[];
}