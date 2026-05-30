#!/usr/bin/env python3
"""
enrich_owners.py — Batch owner-finding for Solaris Panama building dataset.

Two-phase enrichment pipeline:
  Phase 1 (optional Overture cross-ref): if --overture <path.geojson> is supplied,
    build a 0.0003° spatial grid and match each building to the nearest Overture
    entry within ~20 m; seed ownerName + category. Skipped cleanly if not provided.

  Phase 2 (Google Places Nearby Search): for Grade A/B buildings WITHOUT an owner,
    query the Google Places Nearby Search API within ~30 m; extract business name,
    phone, website, type; map types to Panama industry categories; compute a
    0–1 confidence score per owner.

    Reads GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY) from environment.
    If absent, Phase 2 is skipped with a clear message — does NOT crash.

I/O:
  Reads and writes buildings_validated.json in place (enriches ownerName, phone,
  website, category, owner_confidence fields). Prints before/after counts.

Usage:
  python3 scripts/enrich_owners.py
  python3 scripts/enrich_owners.py --input scripts/data/buildings_validated.json
  python3 scripts/enrich_owners.py --overture scripts/data/overture_buildings.geojson
  python3 scripts/enrich_owners.py --max-queries 200
"""

import argparse
import json
import math
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

# ═══════════════════════════════════════════════════════════════
# File paths
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
DEFAULT_BUILDINGS_FILE = DATA_DIR / "buildings_validated.json"

# ═══════════════════════════════════════════════════════════════
# Config
# ═══════════════════════════════════════════════════════════════

OVERTURE_MATCH_DISTANCE_M = 20   # Max haversine distance for an Overture match
PLACES_RADIUS_M = 30             # Google Places Nearby Search radius (metres)
PLACES_RATE_LIMIT_S = 0.1        # Seconds between API calls
PLACES_MAX_RETRIES = 3
PLACES_RETRY_BACKOFF_S = 1.5

# Accept both env var names (Maps Platform uses GOOGLE_MAPS_API_KEY,
# some setups use GOOGLE_PLACES_API_KEY)
_GOOGLE_MAPS_KEY = (
    os.environ.get("GOOGLE_MAPS_API_KEY")
    or os.environ.get("GOOGLE_PLACES_API_KEY")
    or ""
)

OVERTURE_GRID_STEP = 0.0003      # ~33 m grid cells

# Google Places type → Panama industry category mapping
PLACES_TYPE_MAP: Dict[str, str] = {
    "lodging": "hospitality",
    "hotel": "hospitality",
    "motel": "hospitality",
    "restaurant": "restaurant",
    "food": "restaurant",
    "bar": "restaurant",
    "cafe": "restaurant",
    "store": "retail",
    "shopping_mall": "retail",
    "supermarket": "retail",
    "convenience_store": "retail",
    "school": "education",
    "university": "education",
    "hospital": "health",
    "pharmacy": "health",
    "gym": "commercial",
    "bank": "commercial",
    "gas_station": "commercial",
    "car_wash": "commercial",
    "factory": "industrial",
    "warehouse": "industrial",
    "church": "institutional",
    "mosque": "institutional",
    "government": "institutional",
}


# ═══════════════════════════════════════════════════════════════
# Geo helpers
# ═══════════════════════════════════════════════════════════════

def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ═══════════════════════════════════════════════════════════════
# Phase 1: Overture cross-reference
# ═══════════════════════════════════════════════════════════════

def load_overture_grid(path: Path) -> Dict[str, list]:
    """Load Overture GeoJSON and index features by 0.0003° grid.

    Returns {} if the file doesn't exist or is empty.
    """
    if not path.exists():
        print(f"  [INFO] Overture file not found: {path} — skipping Phase 1.")
        return {}

    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    features = data.get("features", [])
    if not features:
        print("  [INFO] Overture file contains no features — skipping Phase 1.")
        return {}

    print(f"  Overture: {len(features)} features")
    grid: Dict[str, list] = defaultdict(list)
    named = 0

    for feat in features:
        props = feat.get("properties", {})
        lat = lng = None

        # Try explicit lat/lng on properties first
        lat = props.get("lat") or props.get("latitude")
        lng = props.get("lng") or props.get("longitude")

        if lat is None or lng is None:
            geom = feat.get("geometry", {})
            gtype = geom.get("type", "")
            if gtype == "Point":
                lng, lat = geom["coordinates"]
            elif gtype in ("Polygon", "MultiPolygon"):
                coords = (
                    geom["coordinates"][0]
                    if gtype == "Polygon"
                    else geom["coordinates"][0][0]
                )
                if coords:
                    lng = sum(c[0] for c in coords) / len(coords)
                    lat = sum(c[1] for c in coords) / len(coords)

        if lat is None or lng is None:
            continue

        # Normalise names — Overture schema uses "names.primary"
        name = (props.get("names.primary")
                or props.get("name")
                or props.get("names", {}).get("primary") if isinstance(props.get("names"), dict) else None)
        if name:
            named += 1

        entry = {
            "lat": float(lat),
            "lng": float(lng),
            "name": name,
            "class": props.get("class"),
            "subtype": props.get("subtype"),
            "height": props.get("height"),
            "floors": props.get("num_floors"),
        }

        gx = int(float(lng) / OVERTURE_GRID_STEP)
        gy = int(float(lat) / OVERTURE_GRID_STEP)
        grid[f"{gx},{gy}"].append(entry)

    print(f"  Indexed: {sum(len(v) for v in grid.values())} features | named: {named}")
    return grid


def phase_overture(buildings: List[dict], overture_grid: Dict[str, list]) -> List[dict]:
    """Match buildings to the nearest Overture entry within OVERTURE_MATCH_DISTANCE_M."""
    if not overture_grid:
        return buildings

    print("\n=== Phase 1: Overture Cross-Reference ===")
    matched = names_added = categories_added = 0

    for b in buildings:
        gx = int(b["lng"] / OVERTURE_GRID_STEP)
        gy = int(b["lat"] / OVERTURE_GRID_STEP)
        best_dist = OVERTURE_MATCH_DISTANCE_M
        best: Optional[dict] = None

        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                for ov in overture_grid.get(f"{gx+dx},{gy+dy}", []):
                    d = haversine_m(b["lat"], b["lng"], ov["lat"], ov["lng"])
                    if d < best_dist:
                        best_dist = d
                        best = ov

        if best is None:
            continue

        matched += 1
        confidence_sources = 1  # matched = 1 source

        if best["name"] and not b.get("ownerName"):
            b["ownerName"] = best["name"]
            b["title"] = best["name"]
            names_added += 1
            confidence_sources += 1

        cat_value = best.get("subtype") or best.get("class")
        if cat_value and not b.get("category"):
            b["category"] = cat_value
            categories_added += 1

        b["owner_confidence"] = _combine_confidence(b.get("owner_confidence", 0.0), confidence_sources, 2)

    print(f"  Matched     : {matched}")
    print(f"  Names added : {names_added}")
    print(f"  Categories  : {categories_added}")
    return buildings


# ═══════════════════════════════════════════════════════════════
# Phase 2: Google Places
# ═══════════════════════════════════════════════════════════════

def phase_google_places(buildings: List[dict], max_queries: int) -> List[dict]:
    """Query Google Places Nearby Search for Grade A/B buildings lacking an owner."""
    if not _GOOGLE_MAPS_KEY:
        print("\n=== Phase 2: Google Places (SKIPPED) ===")
        print("  Set GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY env var to enable.")
        return buildings

    targets = [
        b for b in buildings
        if b.get("priority") in ("A", "B") and not b.get("ownerName")
    ]
    to_process = targets[:max_queries]

    print(f"\n=== Phase 2: Google Places Enrichment ===")
    print(f"  Grade A/B without owner : {len(targets)}")
    print(f"  Will query              : {len(to_process)} (max-queries={max_queries})")

    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    enriched = errors = 0

    for i, b in enumerate(to_process):
        if i > 0 and i % 50 == 0:
            print(f"  ... {i}/{len(to_process)} | enriched={enriched}")

        # ── Nearby Search ─────────────────────────────────────
        place = _places_nearby(session, b["lat"], b["lng"])
        if place is None:
            errors += 1
            if errors > 20:
                print("  [WARN] Too many consecutive errors — stopping Phase 2.")
                break
            time.sleep(PLACES_RATE_LIMIT_S)
            continue

        errors = 0  # reset on success
        name = place.get("name")
        if not name:
            time.sleep(PLACES_RATE_LIMIT_S)
            continue

        b["ownerName"] = name
        b["title"] = name
        confidence_sources = 1

        # ── Place Details (phone / website / types) ────────────
        place_id = place.get("place_id")
        if place_id:
            detail = _places_detail(session, place_id)
            if detail:
                phone = detail.get("formatted_phone_number")
                if phone:
                    b["phone"] = phone
                    confidence_sources += 1
                website = detail.get("website")
                if website:
                    b["website"] = website
                    confidence_sources += 1
                # Map types → category
                if not b.get("category"):
                    for t in detail.get("types", []):
                        if t in PLACES_TYPE_MAP:
                            b["category"] = PLACES_TYPE_MAP[t]
                            break
                # Distance-based confidence factor
                dist = haversine_m(b["lat"], b["lng"],
                                   place.get("geometry", {}).get("location", {}).get("lat", b["lat"]),
                                   place.get("geometry", {}).get("location", {}).get("lng", b["lng"]))
                if dist < 10:
                    confidence_sources += 1

        b["owner_confidence"] = _combine_confidence(
            b.get("owner_confidence", 0.0), confidence_sources, max_sources=4
        )
        enriched += 1
        time.sleep(PLACES_RATE_LIMIT_S)

    print(f"  Enriched : {enriched}")
    print(f"  Errors   : {errors}")
    return buildings


def _places_nearby(
    session: requests.Session, lat: float, lng: float
) -> Optional[dict]:
    """Call Places Nearby Search, return the closest result dict or None."""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": PLACES_RADIUS_M,
        "key": _GOOGLE_MAPS_KEY,
    }
    for attempt in range(PLACES_MAX_RETRIES):
        try:
            resp = session.get(url, params=params, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            return results[0] if results else None
        except Exception as exc:
            if attempt == PLACES_MAX_RETRIES - 1:
                print(f"  [WARN] Nearby Search failed: {exc}")
                return None
            time.sleep(PLACES_RETRY_BACKOFF_S * (attempt + 1))
    return None


def _places_detail(
    session: requests.Session, place_id: str
) -> Optional[dict]:
    """Fetch Place Details for phone, website, types."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number,website,types,geometry",
        "key": _GOOGLE_MAPS_KEY,
    }
    for attempt in range(PLACES_MAX_RETRIES):
        try:
            resp = session.get(url, params=params, timeout=12)
            resp.raise_for_status()
            return resp.json().get("result", {})
        except Exception as exc:
            if attempt == PLACES_MAX_RETRIES - 1:
                print(f"  [WARN] Place Details failed ({place_id[:20]}): {exc}")
                return None
            time.sleep(PLACES_RETRY_BACKOFF_S * (attempt + 1))
    return None


# ═══════════════════════════════════════════════════════════════
# Confidence helpers
# ═══════════════════════════════════════════════════════════════

def _combine_confidence(existing: float, new_sources: int, max_sources: int) -> float:
    """Combine existing confidence with new source signals into a 0–1 score."""
    added = min(1.0, new_sources / max_sources)
    combined = max(existing, added)
    return round(combined, 3)


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Solaris Panama — Batch Owner Enrichment Pipeline"
    )
    parser.add_argument("--input", default=str(DEFAULT_BUILDINGS_FILE),
                        help="Path to buildings_validated.json (in-place update)")
    parser.add_argument("--overture", default="",
                        help="Path to Overture buildings GeoJSON (optional)")
    parser.add_argument("--max-queries", type=int, default=500,
                        help="Max Google Places queries (default: 500)")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════╗")
    print("║  Solaris Panama — Owner Enrichment Pipeline v1.0║")
    print("╚══════════════════════════════════════════════════╝")

    buildings_path = Path(args.input)
    if not buildings_path.exists():
        print(f"\n[ERROR] Input file not found: {buildings_path}", file=sys.stderr)
        sys.exit(1)

    print(f"\nLoading: {buildings_path}")
    with open(buildings_path, encoding="utf-8") as fh:
        buildings = json.load(fh)
    print(f"  {len(buildings)} buildings loaded")

    before_owners = sum(1 for b in buildings if b.get("ownerName"))
    before_phones = sum(1 for b in buildings if b.get("phone"))
    before_websites = sum(1 for b in buildings if b.get("website"))
    before_categories = sum(1 for b in buildings if b.get("category"))

    # ── Phase 1: Overture ──────────────────────────────────────
    if args.overture:
        overture_path = Path(args.overture)
        grid = load_overture_grid(overture_path)
        buildings = phase_overture(buildings, grid)
    else:
        print("\n=== Phase 1: Overture Cross-Reference (SKIPPED — no --overture path) ===")

    # ── Phase 2: Google Places ─────────────────────────────────
    buildings = phase_google_places(buildings, max_queries=args.max_queries)

    # ── Summary ────────────────────────────────────────────────
    after_owners = sum(1 for b in buildings if b.get("ownerName"))
    after_phones = sum(1 for b in buildings if b.get("phone"))
    after_websites = sum(1 for b in buildings if b.get("website"))
    after_categories = sum(1 for b in buildings if b.get("category"))

    print(f"\n=== Results ===")
    print(f"  Owners     : {before_owners} → {after_owners} (+{after_owners - before_owners})")
    print(f"  Phones     : {before_phones} → {after_phones} (+{after_phones - before_phones})")
    print(f"  Websites   : {before_websites} → {after_websites} (+{after_websites - before_websites})")
    print(f"  Categories : {before_categories} → {after_categories} (+{after_categories - before_categories})")

    # Confidence distribution
    confidences = [b.get("owner_confidence", 0) for b in buildings if b.get("ownerName")]
    if confidences:
        avg_conf = sum(confidences) / len(confidences)
        high_conf = sum(1 for c in confidences if c >= 0.75)
        print(f"\n  Owner confidence: avg={avg_conf:.2f} | high (>=0.75): {high_conf}/{len(confidences)}")

    # ── Save in place ──────────────────────────────────────────
    with open(buildings_path, "w", encoding="utf-8") as fh:
        json.dump(buildings, fh, ensure_ascii=False)

    size_kb = os.path.getsize(buildings_path) / 1024
    print(f"\n  Saved: {buildings_path} ({size_kb:.1f} KB)")
    print("\nEnrichment complete.")


if __name__ == "__main__":
    main()
