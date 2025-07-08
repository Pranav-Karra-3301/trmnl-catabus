# CATA GTFS-RT Microservice

A fully-working microservice that fetches CATA's GTFS-RT (General Transit Feed Specification Real-Time) TripUpdate protobuf feed, processes departure data, and serves it via a REST API.

## Features

- **Real-time Data**: Fetches CATA's GTFS-RT feed every 60 seconds via cron
- **Smart Caching**: In-memory Map caching with Edge Config read fallback
- **Edge Runtime**: All functions run on Vercel's Edge Runtime for optimal performance
- **REST API**: Simple JSON API to get departure times for any stop
- **Debugging**: Endpoint to list all cached stop IDs
- **TypeScript**: Fully typed with strict TypeScript
- **Testing**: Jest unit tests for core functionality

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CATA GTFS-RT  │───▶│  Cron Handler   │───▶│  MapCache Only  │
│   Protobuf Feed │    │  /api/cron      │    │  (In-Memory)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐              │
│    Client       │◀───│  Stop API       │◀─────────────┤
│   (Terminal)    │    │ /api/stop/[id]  │              │
└─────────────────┘    └─────────────────┘              │
                                                        │
┌─────────────────┐    ┌─────────────────┐              │
│    Debug Tool   │◀───│  Stops API      │◀─────────────┘
│   (Developer)   │    │  /api/stops     │
└─────────────────┘    └─────────────────┘
```

## API Endpoints

### GET /api/stop/[id]

Returns departure times for a specific stop ID.

**Response** (200 OK):
```json
{
  "updatedAt": 1703123456789,
  "departures": [
    {
      "routeId": "ROUTE1",
      "routeShortName": "ROUTE1", 
      "tripId": "trip_123",
      "stopId": "STOP1",
      "scheduledTime": 1703123456789,
      "predictedTime": 1703123516789,
      "delay": 60,
      "vehicleId": "vehicle_456"
    }
  ]
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "error": "no-data",
  "message": "No departure data available for stop STOP1"
}
```

### GET /api/stops

Returns array of all cached stop IDs for debugging.

**Response** (200 OK):
```json
["STOP1", "STOP2", "STOP3"]
```

### GET /api/cron

Internal cron endpoint that fetches and caches GTFS-RT data. Returns 204 No Content on success.

## Environment Variables

Create a `.env.local` file with:

```bash
# Required: CATA GTFS-RT feed URL
CATA_RT_URL=https://your-cata-gtfs-rt-url

# Optional: Vercel Edge Config (for read-only fallback)
EDGE_CONFIG_ID=your_edge_config_id
EDGE_CONFIG_TOKEN=your_edge_config_token
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your CATA_RT_URL
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Test the API**:
   ```bash
   # First, populate the cache
   curl http://localhost:3000/api/cron
   
   # List all cached stops
   curl http://localhost:3000/api/stops
   
   # Query a specific stop
   curl http://localhost:3000/api/stop/YOUR_STOP_ID
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode

## Cache Strategy

### Development
- **In-Memory Map**: Fast, simple caching during development
- **Automatic Expiry**: Data expires after 5 minutes
- **No External Dependencies**: Works immediately with no setup

### Production
- **MapCache Primary**: All writes go to in-memory Map cache
- **Edge Config Fallback**: Read-only fallback for distributed caching
- **Performance**: Fast local cache with optional distributed reads

## Data Processing

1. **Fetch**: Downloads GTFS-RT protobuf feed from CATA
2. **Parse**: Extracts trip updates and stop time predictions
3. **Filter**: Removes past departures and limits to 2-hour window
4. **Sort**: Orders by predicted departure time
5. **Limit**: Maximum 10 departures per stop
6. **Cache**: Stores in MapCache (in-memory only)

## Deployment

### Vercel (Recommended)

1. **Connect repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: Automatic deployment on git push

### Other Platforms

Ensure the platform supports:
- Next.js 15+
- Edge Runtime
- Environment variables
- Cron/scheduled functions

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- cache.test.ts
```

Tests automatically skip on Edge Runtime to avoid compatibility issues.

## Monitoring

Check logs for:
- **Cron execution**: Look for "Successfully cached departures for X stops"
- **API requests**: Monitor response times and error rates
- **Cache performance**: Track hit/miss ratios
- **Debug endpoint**: Use `/api/stops` to verify cache contents

## License

This project is licensed under the MIT License.
