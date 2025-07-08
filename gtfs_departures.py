#!/usr/bin/env python3
"""
gtfs_departures.py
Fetch a GTFS-Realtime (.ashx) feed, parse it, and show the next departures
for a given stop.  Route and stop name look-ups are done via CSV files that
live in ./public/  (route_map.csv, stop_map.csv).

Output format:
  HH:MM:SS | <route name> | trip <trip_id> | delay <seconds or n/a>
"""

import argparse
import datetime as dt
import json
import logging
import os  # new dependency for REDIS_URL environment variable
import sys
from pathlib import Path
from typing import Dict, List

# ---------- third-party deps ----------
try:
    import requests
except ImportError:
    requests = None  # we'll complain later

try:
    import redis
except ImportError:
    redis = None  # we'll complain later

try:
    from google.transit import gtfs_realtime_pb2
except ImportError:
    print(
        "Missing protobuf bindings.\n"
        "Run:  pip install protobuf gtfs-realtime-bindings requests"
    )
    sys.exit(1)

from zoneinfo import ZoneInfo

# ---------- constants ----------
PUBLIC_DIR = Path(__file__).resolve().parent / "public"
ROUTE_CSV  = PUBLIC_DIR / "route_map.csv"
STOP_CSV   = PUBLIC_DIR / "stop_map.csv"
LOCAL_TZ   = ZoneInfo("America/New_York")

# ---------- logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# ---------- helpers ----------

def fetch_blob(url: str, timeout: int = 10) -> bytes:
    if not requests:
        raise RuntimeError("The requests library is not installed.")
    logging.info("Fetching GTFS feed: %s", url)
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    logging.info("✓ fetched %d bytes", len(r.content))
    return r.content


def parse_feed(blob: bytes):
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(blob)
    logging.info(
        "✓ parsed feed: version=%s ts=%s entities=%d",
        feed.header.gtfs_realtime_version,
        dt.datetime.fromtimestamp(feed.header.timestamp, LOCAL_TZ).isoformat(),
        len(feed.entity),
    )
    return feed


def load_mapping(path: Path) -> Dict[str, str]:
    import csv

    if not path.is_file():
        logging.warning("Mapping file not found: %s (IDs will be shown raw)", path)
        return {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        mapping = {row[0].strip(): row[1].strip() for row in reader if row and not row[0].startswith("#")}
    logging.info("✓ loaded %d rows from %s", len(mapping), path.name)
    return mapping


def extract_all_departures(feed, top_n: int = 10) -> Dict[str, List[dict]]:
    """Extract departures for all stops from the feed."""
    per_stop: Dict[str, List[dict]] = {}
    now_ms = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
    
    for ent in feed.entity:
        if ent.HasField("trip_update"):
            tu = ent.trip_update
            trip = tu.trip
            route_id = trip.route_id or "??"
            headsign = trip.trip_id or "Unknown"
            
            for stu in tu.stop_time_update:
                stop_id = stu.stop_id
                if not stop_id or not stu.departure.time:
                    continue
                
                scheduled_ms = stu.departure.time * 1000
                delay_s = stu.departure.delay if stu.departure.HasField("delay") else 0
                predicted_ms = scheduled_ms + delay_s * 1000
                
                # Filter out clearly outdated/far-future departures
                if predicted_ms < now_ms - 60_000:  # >1 min in the past
                    continue
                if predicted_ms > now_ms + 2 * 60 * 60 * 1000:  # >2h ahead
                    continue
                
                status = (
                    "delayed" if delay_s > 90 else "early" if delay_s < -90 else "on-time"
                )
                
                dep = {
                    "route": route_id,
                    "headsign": headsign,
                    "time": dt.datetime.fromtimestamp(predicted_ms / 1000, LOCAL_TZ).isoformat(),
                    "status": status,
                }
                
                per_stop.setdefault(stop_id, []).append(dep)
    
    # Sort and cap for each stop
    for stop_id, deps in per_stop.items():
        deps.sort(key=lambda d: d["time"])
        per_stop[stop_id] = deps[:top_n]
    
    return per_stop


def push_all_to_redis(departures_by_stop: Dict[str, List[dict]], redis_url: str) -> None:
    """Push all stop departures to Redis."""
    if not redis:
        logging.warning("The redis library is not installed; skipping Redis push.")
        return

    client = redis.from_url(redis_url, decode_responses=True)
    
    for stop_id, departures in departures_by_stop.items():
        key = f"stop:{stop_id}"
        payload = {
            "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "departures": departures,
        }
        
        logging.info("SET %s (len=%d)", key, len(departures))
        client.set(key, json.dumps(payload))
    
    logging.info("✓ Redis push successful for %d stops", len(departures_by_stop))
    deps: List[dict] = []
    now_ms = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
    
    for ent in feed.entity:
        if ent.HasField("trip_update"):
            tu = ent.trip_update
            trip = tu.trip
            route_id = trip.route_id or "??"
            headsign = trip.trip_id or "Unknown"
            
            for stu in tu.stop_time_update:
                if stu.stop_id == stop_id and stu.departure.time:
                    scheduled_ms = stu.departure.time * 1000
                    delay_s = stu.departure.delay if stu.departure.HasField("delay") else 0
                    predicted_ms = scheduled_ms + delay_s * 1000
                    
                    # Filter out clearly outdated/far-future departures
                    if predicted_ms < now_ms - 60_000:  # >1 min in the past
                        continue
                    if predicted_ms > now_ms + 2 * 60 * 60 * 1000:  # >2h ahead
                        continue
                    
                    status = (
                        "delayed" if delay_s > 90 else "early" if delay_s < -90 else "on-time"
                    )
                    
                    deps.append({
                        "route": route_id,
                        "headsign": headsign,
                        "time": dt.datetime.fromtimestamp(predicted_ms / 1000, LOCAL_TZ).isoformat(),
                        "status": status,
                    })
    
    deps.sort(key=lambda d: d["time"])
    return deps[:top_n]

# ---------- redis helper ----------

# The Python runtime on Vercel (and locally) exposes the Redis connection string via the
# REDIS_URL environment variable. We push the departures list under the key `stop:<id>`
# using the redis-py client.

def push_to_redis(stop_id: str, departures: List[dict], redis_url: str) -> None:
    """Push departure payload to Redis. Logs success/failure. Raises on Redis errors."""
    if not redis:
        logging.warning("The redis library is not installed; skipping Redis push.")
        return

    client = redis.from_url(redis_url, decode_responses=True)
    key = f"stop:{stop_id}"
    payload = {
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "departures": departures,
    }

    logging.info("SET %s (len=%d)", key, len(departures))
    client.set(key, json.dumps(payload))   # atomic overwrite every 5 min
    logging.info("✓ Redis push successful")

# ---------- CLI ----------

def main() -> None:
    p = argparse.ArgumentParser(description="Show upcoming departures for a stop.")
    p.add_argument("url", help="URL of the .ashx GTFS-Realtime feed")
    p.add_argument("stop_id", nargs="?", help="Stop ID (e.g. 54) or 'all' for all stops")
    p.add_argument("-n", "--number", type=int, default=8, help="How many departures to list (default 8)")
    p.add_argument("--all", action="store_true", help="Process all stops and push to Redis")
    args = p.parse_args()

    try:
        blob  = fetch_blob(args.url)
        feed  = parse_feed(blob)
    except Exception as e:
        logging.error("FAILED: %s", e, exc_info=True)
        sys.exit(1)

    # Handle all stops mode
    if args.all or (args.stop_id and args.stop_id.lower() == "all"):
        departures_by_stop = extract_all_departures(feed, args.number)
        
        # Push to Redis if configured
        redis_url = os.environ.get("REDIS_URL")
        if redis_url:
            try:
                push_all_to_redis(departures_by_stop, redis_url)
            except Exception as e:
                logging.error("Redis push failed: %s", e, exc_info=True)
                sys.exit(1)
        else:
            logging.warning("REDIS_URL not set; skipping Redis push")
        
        print(f"Processed {len(departures_by_stop)} stops")
        return

    # Handle single stop mode
    if not args.stop_id:
        print("Error: stop_id is required unless using --all flag")
        sys.exit(1)
        
    departures = extract_departures(feed, args.stop_id, args.number)

    # Attempt to push results to Redis, if a URL is configured.
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        try:
            push_to_redis(args.stop_id, departures, redis_url)
        except Exception as e:
            logging.error("Redis push failed: %s", e, exc_info=True)
    else:
        logging.warning("REDIS_URL not set; skipping Redis push")

    if not departures:
        print(f"No departures found for stop {args.stop_id}.")
        return

    # load mappings once
    route_map = load_mapping(ROUTE_CSV)
    stop_map  = load_mapping(STOP_CSV)

    stop_name = stop_map.get(args.stop_id, f"Stop {args.stop_id}")
    print(f"Next {len(departures)} departures at {stop_name}:")

    for d in departures:
        time_str = dt.datetime.strptime(d["time"], "%Y-%m-%dT%H:%M:%S%z").strftime("%H:%M:%S")
        route = route_map.get(d["route"], d["route"])
        print(f" {time_str} | {route} | {d['headsign']} | {d['status']}")


if __name__ == "__main__":
    main() 