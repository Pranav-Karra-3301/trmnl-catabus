export interface Departure {
  /** Short name or identifier of the route */
  route: string;
  /** Vehicle headsign / destination */
  headsign: string;
  /** ISO‐8601 timestamp when the vehicle is expected to depart */
  time: string;
  /** Simple status label e.g. `on-time`, `delayed`, `early` */
  status: string;
}

export interface StopPayload {
  updatedAt: string;
  departures: Departure[];
}

export interface ErrorResponse {
  error: string;
  message?: string;
} 