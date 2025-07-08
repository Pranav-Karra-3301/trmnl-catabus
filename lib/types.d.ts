export interface Departure {
  routeId: string;
  routeShortName: string;
  tripId: string;
  stopId: string;
  scheduledTime: number; // Unix timestamp
  predictedTime: number; // Unix timestamp
  delay: number; // seconds
  vehicleId?: string;
}

export interface ParsedFeed {
  updatedAt: number; // Unix timestamp
  departures: Record<string, Departure[]>; // stopId -> departures
}

export interface StopResponse {
  updatedAt: number;
  departures: Departure[];
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export interface CacheEntry {
  updatedAt: number;
  data: Departure[];
} 