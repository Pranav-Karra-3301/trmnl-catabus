"""Python Serverless Function: /api/cron.py
Runs as a Vercel Cron Job every 5 minutes to fetch the latest CATA GTFS-Realtime
feed and store parsed departures per stop in Edge Config. The data shape matches
what /api/stop/[id] expects (see lib/types.d.ts).

Environment variables required:
  EDGE_CONFIG_ID – ID of the Edge Config store (read-write permissions)
  VERCEL_TOKEN   – Vercel API token with access to the Edge Config
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Tuple

import requests
from zoneinfo import ZoneInfo  # Python >=3.9 (added via requirements)

# Reuse helpers from script; gtfs_realtime_pb2 directly from google.transit
from gtfs_departures import fetch_blob, parse_feed

from google.transit import gtfs_realtime_pb2

LOCAL_TZ = ZoneInfo("America/New_York")

# ---------------------------------------------------------------------------
# Edge Config helpers
EDGE_CONFIG_ID = os.environ.get("EDGE_CONFIG_ID")
VERCEL_TOKEN = os.environ.get("VERCEL_TOKEN")
EDGE_CONFIG_API = (
    f"https://api.vercel.com/v1/edge-config/{EDGE_CONFIG_ID}/items" if EDGE_CONFIG_ID else None
)

logger = logging.getLogger("cata-cron")
logger.setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# Feed → departures map (stopId -> list[Departure])

def parse_departures(feed: "gtfs_realtime_pb2.FeedMessage") -> Dict[str, List[dict]]:
    """Convert GTFS-RT FeedMessage into map keyed by stop_id."""

    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    per_stop: Dict[str, List[dict]] = {}

    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue

        tu = entity.trip_update
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
                "time": datetime.fromtimestamp(predicted_ms / 1000, LOCAL_TZ).isoformat(),
                "status": status,
            }

            per_stop.setdefault(stop_id, []).append(dep)

    # Sort and cap 10
    for stop_id, deps in per_stop.items():
        deps.sort(key=lambda d: d["time"])
        per_stop[stop_id] = deps[:10]

    return per_stop


# ---------------------------------------------------------------------------
# Edge Config interaction

def upsert(items: List[Tuple[str, dict]]) -> None:
    """PATCH items into Edge Config (same shape as TypeScript helper)."""

    if not EDGE_CONFIG_API or not VERCEL_TOKEN:
        logger.warning(
            "Missing EDGE_CONFIG_ID or VERCEL_TOKEN – skipping Edge Config update"
        )
        return

    payload = [
        {
            "operation": "upsert",
            "key": key,
            "value": value,
        }
        for key, value in items
    ]

    res = requests.patch(
        EDGE_CONFIG_API,
        headers={
            "Authorization": f"Bearer {VERCEL_TOKEN}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=10,
    )

    if not res.ok:
        logger.error("Edge Config update failed: %s %s", res.status_code, res.text)
        res.raise_for_status()

    logger.info("✓ Edge Config updated (%d items)", len(items))


# ---------------------------------------------------------------------------
# Vercel function entrypoint

def handler(request):  # type: ignore[valid-type]
    """Vercel Serverless Function entry (runs via scheduled cron)."""

    try:
        logger.info("Fetching CATA feed via gtfs_departures helpers")
        blob = fetch_blob(
            "http://realtime.catabus.com/InfoPoint/GTFS-Realtime.ashx?&Type=TripUpdate"
        )
        feed = parse_feed(blob)
        departures_map = parse_departures(feed)

        items = [
            (
                f"stop:{stop_id}",
                {"updatedAt": datetime.utcnow().isoformat() + "Z", "departures": deps},
            )
            for stop_id, deps in departures_map.items()
        ]

        logger.info("Prepared %d items for upsert", len(items))
        if items:
            upsert(items)

        return {
            "success": True,
            "stopsProcessed": len(items),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Cron job failed: %s", exc)
        return {
            "success": False,
            "error": str(exc),
        } 