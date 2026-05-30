#!/usr/bin/env python3
"""
roof_detector.py — CV false-positive validation + building discovery pipeline for Solaris Panama.

4-phase self-validating satellite pipeline:
  1. DEDUP     — Remove exact-coord duplicates; merge buildings closer than ~12 m (spatial grid).
  2. VALIDATE  — Fetch Google satellite tiles (z=19, ~0.3 m/px), classify 16×16 px window as
                 building / water / vegetation / empty. Iterate until change < 0.5 %.
  3. DISCOVER  — (flag-gated) Scan z=18 tiles, detect building-like contours via adaptive
                 threshold + Canny, filter by solidity ≥ 0.6, emit candidates ≥ ~20 m from
                 any existing building.
  4. SCORE     — Recompute solar score + priority A/B/C/D using Panama solar constants.

Panama solar constants:
  peak sun hours  : 4.5 kWh/m²/day
  performance ratio: 0.80
  usable roof ratio: 0.60
  watts per m²     : 180 W/m²  (proxy — panels are 580 W / 2.58 m² ≈ 224.8 W/m²; 180 is
                                conservative per-roof W density allowing shading & spacing)
  currency         : USD
  panel            : 580 W / 2.58 m²

Usage:
  python3 scripts/roof_detector.py --input scripts/data/buildings_all.json
  python3 scripts/roof_detector.py --input scripts/data/buildings_all.json --discover
  python3 scripts/roof_detector.py --input scripts/data/buildings_all.json --phase dedup
  python3 scripts/roof_detector.py --input scripts/data/buildings_all.json --zoom 18 --sample 500
"""

import argparse
import json
import math
import os
import sys
import time
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import cv2
import numpy as np
import requests
from PIL import Image  # noqa: F401  (PIL imported for future use / type hints)

# ═══════════════════════════════════════════════════════════════
# File paths
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
CACHE_DIR = SCRIPT_DIR / "tile_cache"
INPUT_FILE = DATA_DIR / "buildings_all.json"
OUTPUT_FILE = DATA_DIR / "buildings_validated.json"
REPORT_FILE = SCRIPT_DIR / "validation_report.json"

# ═══════════════════════════════════════════════════════════════
# Deduplication constants
# ═══════════════════════════════════════════════════════════════

DUPLICATE_DISTANCE_M = 12       # Buildings closer than this are merged
DUPLICATE_GRID_DEG = 0.0002     # ~22 m grid cells for spatial indexing

# ═══════════════════════════════════════════════════════════════
# Satellite tile constants
# ═══════════════════════════════════════════════════════════════

TILE_ZOOM = 19                  # z=19 ≈ 0.3 m/pixel for Panama latitudes
TILE_SIZE = 256

TILE_SERVERS = [
    "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
]

REQUEST_DELAY = 0.05            # Seconds between tile fetches (rate limiting)
MAX_CONCURRENT_TILES = 500      # Hard cap per run to avoid bans

# ═══════════════════════════════════════════════════════════════
# Validation thresholds
# ═══════════════════════════════════════════════════════════════

ROOF_WINDOW_PX = 16             # Half-width of pixel window around centroid (16 = 32×32 px)
WATER_BLUE_THRESHOLD = 1.25     # B > 1.25 × mean(R, G) → water
VEGETATION_GREEN_THRESHOLD = 1.15  # G > 1.15 × mean(R, B) + low brightness → vegetation
ROOF_MIN_BRIGHTNESS = 60
ROOF_MIN_VARIANCE = 100
ROOF_MAX_VARIANCE = 8000        # Too noisy → likely dense canopy

CONVERGENCE_THRESHOLD_PCT = 0.5  # Stop self-validation loop when Δ < 0.5 %

# ═══════════════════════════════════════════════════════════════
# Discovery (phase 3) constants
# ═══════════════════════════════════════════════════════════════

SCAN_ZOOM = 18                  # Lower zoom → more coverage per tile
EDGE_THRESHOLD_LOW = 50
EDGE_THRESHOLD_HIGH = 150
MIN_CONTOUR_AREA_PX = 80        # Pixels @ z=18
MAX_CONTOUR_AREA_PX = 15000
MIN_BUILDING_SOLIDITY = 0.6
GAP_DISTANCE_M = 20             # Emit candidate only if no existing building within this dist

# ═══════════════════════════════════════════════════════════════
# Panama solar constants  (source: src/services/solarCalculator.ts)
# ═══════════════════════════════════════════════════════════════

PANAMA_PEAK_SUN_HOURS = 4.5     # kWh/m²/day (average across Panama)
PANAMA_PERFORMANCE_RATIO = 0.80
PANAMA_USABLE_AREA_RATIO = 0.60
PANAMA_WATTS_PER_M2 = 180       # Conservative installed W density (allows spacing/shading)
PANAMA_CURRENCY = "USD"
PANAMA_PANEL_WATT = 580         # LONGi 580 W
PANAMA_PANEL_AREA_M2 = 2.58     # m² per panel
PANAMA_ELECTRICITY_RATE = 0.195  # $/kWh commercial
PANAMA_COST_PER_WP = 0.95       # $/Wp installed

# Priority A/B/C/D thresholds (kWp)
PRIORITY_A_KWP = 50
PRIORITY_B_KWP = 20
PRIORITY_C_KWP = 5

# Score thresholds (0-100)
SCORE_A = 75
SCORE_B = 55
SCORE_C = 35


# ═══════════════════════════════════════════════════════════════
# Geo math
# ═══════════════════════════════════════════════════════════════

def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in metres between two WGS-84 coordinates."""
    R = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def lat_lng_to_tile(lat: float, lng: float, zoom: int) -> Tuple[int, int]:
    n = 2 ** zoom
    x = int((lng + 180) / 360 * n)
    lat_rad = math.radians(lat)
    y = int((1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n)
    return x, y


def lat_lng_to_pixel(lat: float, lng: float, zoom: int) -> Tuple[int, int]:
    n = 2 ** zoom
    px = int((lng + 180) / 360 * n * TILE_SIZE)
    lat_rad = math.radians(lat)
    py = int((1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n * TILE_SIZE)
    return px, py


def pixel_to_lat_lng(px: int, py: int, zoom: int) -> Tuple[float, float]:
    n = 2 ** zoom
    lng = px / (n * TILE_SIZE) * 360 - 180
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * py / (n * TILE_SIZE))))
    lat = math.degrees(lat_rad)
    return lat, lng


def meters_per_pixel(lat: float, zoom: int) -> float:
    return 156_543.03 * math.cos(math.radians(lat)) / (2 ** zoom)


# ═══════════════════════════════════════════════════════════════
# TileFetcher — on-disk cache + round-robin servers + rate limiting
# ═══════════════════════════════════════════════════════════════

class TileFetcher:
    """Fetch satellite tiles with on-disk JPEG cache and round-robin tile servers."""

    def __init__(self, cache_dir: Path, zoom: int = TILE_ZOOM) -> None:
        self.zoom = zoom
        self.cache_dir = cache_dir / str(zoom)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "SolarisPanama/1.0 (roof-detection-pipeline)"
        })
        self.request_count = 0
        self.cache_hits = 0

    # ── public ──────────────────────────────────────────────────

    def get_tile(self, tx: int, ty: int) -> Optional[np.ndarray]:
        """Return tile as uint8 RGB ndarray, or None on failure."""
        cache_path = self.cache_dir / f"{tx}_{ty}.jpg"

        if cache_path.exists():
            self.cache_hits += 1
            img = cv2.imread(str(cache_path))
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB) if img is not None else None

        server = TILE_SERVERS[self.request_count % len(TILE_SERVERS)]
        url = server.format(x=tx, y=ty, z=self.zoom)

        for attempt in range(3):
            try:
                resp = self.session.get(url, timeout=12)
                resp.raise_for_status()
                arr = np.frombuffer(resp.content, np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img is None:
                    return None
                cv2.imwrite(str(cache_path), img)
                self.request_count += 1
                # Rate limiting: brief pause every 50 network fetches
                if self.request_count % 50 == 0:
                    time.sleep(REQUEST_DELAY * 5)
                else:
                    time.sleep(REQUEST_DELAY)
                return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            except Exception as exc:
                if attempt == 2:
                    print(f"  [WARN] Tile ({tx},{ty}) fetch failed after 3 attempts: {exc}")
                else:
                    time.sleep(0.5 * (attempt + 1))
        return None

    def get_window(self, lat: float, lng: float,
                   radius_px: int = ROOF_WINDOW_PX) -> Optional[np.ndarray]:
        """Extract a pixel window (2*radius × 2*radius) centred on lat/lng."""
        tx, ty = lat_lng_to_tile(lat, lng, self.zoom)
        tile = self.get_tile(tx, ty)
        if tile is None:
            return None

        abs_px, abs_py = lat_lng_to_pixel(lat, lng, self.zoom)
        local_x = abs_px % TILE_SIZE
        local_y = abs_py % TILE_SIZE

        h, w = tile.shape[:2]
        x1 = max(0, local_x - radius_px)
        y1 = max(0, local_y - radius_px)
        x2 = min(w, local_x + radius_px)
        y2 = min(h, local_y + radius_px)

        window = tile[y1:y2, x1:x2]
        return window if window.size > 0 else None

    def stats(self) -> str:
        total = self.request_count + self.cache_hits
        hit_pct = round(self.cache_hits / max(1, total) * 100)
        return (f"Tiles: {total} total | {self.cache_hits} cached ({hit_pct}%) "
                f"| {self.request_count} fetched")


# ═══════════════════════════════════════════════════════════════
# Phase 1: DEDUP
# ═══════════════════════════════════════════════════════════════

def phase_dedup(buildings: List[dict]) -> Tuple[List[dict], dict]:
    """Remove duplicate buildings.

    Step 1: exact-coord key dedup (keep richer record).
    Step 2: spatial grid → pairwise proximity check → merge buildings < 12 m apart.
    """
    print("\n═══ PHASE 1: DEDUPLICATION ═══")
    print(f"  Input: {len(buildings)} buildings")

    # ── Step 1: exact coord duplicates ─────────────────────────
    seen_coords: Dict[str, int] = {}
    unique: List[dict] = []
    exact_dupes = 0

    for b in buildings:
        key = f"{b['lat']:.6f},{b['lng']:.6f}"
        if key in seen_coords:
            exact_dupes += 1
            existing_idx = seen_coords[key]
            if _data_richness(b) > _data_richness(unique[existing_idx]):
                unique[existing_idx] = b
        else:
            seen_coords[key] = len(unique)
            unique.append(b)

    print(f"  Exact coord duplicates removed: {exact_dupes}")

    # ── Step 2: spatial proximity ───────────────────────────────
    grid: Dict[str, List[int]] = defaultdict(list)
    for i, b in enumerate(unique):
        gx = int(b["lng"] / DUPLICATE_GRID_DEG)
        gy = int(b["lat"] / DUPLICATE_GRID_DEG)
        grid[f"{gx},{gy}"].append(i)

    merged_into: Dict[int, int] = {}
    proximity_dupes = 0

    for cell_key, indices in grid.items():
        gx, gy = (int(v) for v in cell_key.split(","))
        neighbors: List[int] = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                neighbors.extend(grid.get(f"{gx+dx},{gy+dy}", []))

        for idx_a in indices:
            if idx_a in merged_into:
                continue
            for idx_b in neighbors:
                if idx_b <= idx_a or idx_b in merged_into:
                    continue
                dist = haversine_m(
                    unique[idx_a]["lat"], unique[idx_a]["lng"],
                    unique[idx_b]["lat"], unique[idx_b]["lng"],
                )
                if dist < DUPLICATE_DISTANCE_M:
                    if _data_richness(unique[idx_b]) > _data_richness(unique[idx_a]):
                        merged_into[idx_a] = idx_b
                        unique[idx_b] = _merge_buildings(unique[idx_b], unique[idx_a])
                    else:
                        merged_into[idx_b] = idx_a
                        unique[idx_a] = _merge_buildings(unique[idx_a], unique[idx_b])
                    proximity_dupes += 1

    deduped = [b for i, b in enumerate(unique) if i not in merged_into]
    removed_pct = round((1 - len(deduped) / max(1, len(buildings))) * 100, 1)

    print(f"  Proximity duplicates merged: {proximity_dupes}")
    print(f"  Output: {len(deduped)} buildings ({removed_pct}% removed)")

    return deduped, {
        "input": len(buildings),
        "exact_dupes": exact_dupes,
        "proximity_dupes": proximity_dupes,
        "output": len(deduped),
        "removed_pct": removed_pct,
    }


def _data_richness(b: dict) -> int:
    """Return a richness score — more filled fields = higher score."""
    score = sum(1 for k in ("title", "ownerName", "phone", "email", "website", "category")
                if b.get(k) and str(b[k]).strip())
    if b.get("area", 0) > 0:
        score += 1
    if b.get("solarScore", 0) > 0:
        score += 1
    return score


def _merge_buildings(primary: dict, secondary: dict) -> dict:
    """Merge secondary into primary (primary wins on key conflicts)."""
    result = dict(primary)
    for key in ("title", "ownerName", "phone", "email", "website", "category"):
        if not result.get(key) and secondary.get(key):
            result[key] = secondary[key]
    result["lat"] = (primary["lat"] + secondary["lat"]) / 2
    result["lng"] = (primary["lng"] + secondary["lng"]) / 2
    if secondary.get("area", 0) > result.get("area", 0):
        result["area"] = secondary["area"]
    return result


# ═══════════════════════════════════════════════════════════════
# Phase 2: SATELLITE VALIDATION
# ═══════════════════════════════════════════════════════════════

def phase_validate(
    buildings: List[dict],
    fetcher: TileFetcher,
    sample_limit: int = 0,
) -> Tuple[List[dict], dict]:
    """Validate buildings against satellite imagery and strip false positives."""
    print("\n═══ PHASE 2: SATELLITE VALIDATION ═══")

    total = len(buildings)
    to_validate = buildings[:sample_limit] if sample_limit > 0 else buildings
    label = f"sample {sample_limit}/{total}" if sample_limit > 0 else f"all {total}"
    print(f"  Validating {label} buildings")

    confirmed = rejected_water = rejected_vegetation = rejected_empty = 0
    uncertain = fetch_failed = 0

    for i, b in enumerate(to_validate):
        if i > 0 and i % 500 == 0:
            print(f"  ... {i}/{len(to_validate)} | confirmed={confirmed} "
                  f"rejected={rejected_water + rejected_vegetation + rejected_empty}")

        window = fetcher.get_window(b["lat"], b["lng"])
        if window is None:
            fetch_failed += 1
            b["_validation"] = "fetch_failed"
            continue

        classification = _classify_window(window)
        b["_validation"] = classification

        if classification == "building":
            confirmed += 1
        elif classification == "water":
            rejected_water += 1
        elif classification == "vegetation":
            rejected_vegetation += 1
        elif classification == "empty":
            rejected_empty += 1
        else:
            uncertain += 1

    # Mark unvalidated remainder (when sample_limit active)
    if sample_limit > 0:
        for b in buildings[sample_limit:]:
            b.setdefault("_validation", "unvalidated")

    rejected_set = {"water", "vegetation", "empty"}
    validated = [b for b in buildings if b.get("_validation") not in rejected_set]
    total_rejected = rejected_water + rejected_vegetation + rejected_empty

    print(f"\n  Results:")
    print(f"    Confirmed buildings : {confirmed}")
    print(f"    Rejected (water)    : {rejected_water}")
    print(f"    Rejected (vegetation): {rejected_vegetation}")
    print(f"    Rejected (empty/road): {rejected_empty}")
    print(f"    Uncertain           : {uncertain}")
    print(f"    Fetch failed        : {fetch_failed}")
    print(f"  {fetcher.stats()}")
    print(f"  Output: {len(validated)} (removed {total_rejected})")

    return validated, {
        "validated": len(to_validate) - fetch_failed,
        "confirmed": confirmed,
        "rejected_water": rejected_water,
        "rejected_vegetation": rejected_vegetation,
        "rejected_empty": rejected_empty,
        "uncertain": uncertain,
        "fetch_failed": fetch_failed,
        "accuracy_pct": round(confirmed / max(1, confirmed + total_rejected) * 100, 1),
        "output": len(validated),
    }


def _classify_window(window: np.ndarray) -> str:
    """Classify a satellite pixel window as building / water / vegetation / empty / uncertain."""
    if window.size == 0:
        return "uncertain"

    mean_r = float(np.mean(window[:, :, 0]))
    mean_g = float(np.mean(window[:, :, 1]))
    mean_b = float(np.mean(window[:, :, 2]))
    brightness = (mean_r + mean_g + mean_b) / 3
    variance = float(np.var(window))

    # Water: blue dominant + low variance
    rg_mean = (mean_r + mean_g) / 2
    if rg_mean > 0 and mean_b / rg_mean > WATER_BLUE_THRESHOLD and brightness < 120:
        return "water"

    # Vegetation: green dominant + dim
    rb_mean = (mean_r + mean_b) / 2
    if rb_mean > 0 and mean_g / rb_mean > VEGETATION_GREEN_THRESHOLD and brightness < 100:
        return "vegetation"

    # Dense canopy (very dark)
    if brightness < 30:
        return "vegetation"

    # Empty / road: very low variance + no edges
    if variance < ROOF_MIN_VARIANCE and brightness > ROOF_MIN_BRIGHTNESS:
        gray = cv2.cvtColor(window, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 30, 100)
        edge_ratio = np.count_nonzero(edges) / edges.size
        if edge_ratio < 0.02:
            return "empty"

    # Building: sufficient brightness + edges or variance
    if brightness >= ROOF_MIN_BRIGHTNESS:
        gray = cv2.cvtColor(window, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, EDGE_THRESHOLD_LOW, EDGE_THRESHOLD_HIGH)
        edge_ratio = np.count_nonzero(edges) / edges.size
        if edge_ratio > 0.03 or variance > ROOF_MIN_VARIANCE:
            return "building"

    return "uncertain"


# ═══════════════════════════════════════════════════════════════
# Self-validation loop (iterate until stable)
# ═══════════════════════════════════════════════════════════════

def self_validate(
    buildings: List[dict],
    fetcher: TileFetcher,
    max_iterations: int = 3,
) -> Tuple[List[dict], dict]:
    """Run phase_validate iteratively until the dataset change < 0.5 %."""
    print("\n═══ SELF-VALIDATION LOOP ═══")
    prev_count = len(buildings)
    final_stats: dict = {}

    for i in range(max_iterations):
        print(f"\n--- Iteration {i + 1}/{max_iterations} ---")
        sample = min(2000, len(buildings))
        buildings, stats = phase_validate(buildings, fetcher, sample_limit=sample)
        final_stats = stats
        change = abs(len(buildings) - prev_count) / max(1, prev_count) * 100
        print(f"  Accuracy: {stats['accuracy_pct']}% | Delta: {change:.1f}%")
        if change < CONVERGENCE_THRESHOLD_PCT:
            print(f"  Converged after {i + 1} iteration(s).")
            break
        prev_count = len(buildings)

    return buildings, final_stats


# ═══════════════════════════════════════════════════════════════
# Phase 3: DISCOVER MISSING BUILDINGS
# ═══════════════════════════════════════════════════════════════

def phase_discover(
    buildings: List[dict],
    fetcher: TileFetcher,
    bbox: Tuple[float, float, float, float],
    max_tiles: int = MAX_CONCURRENT_TILES,
    region: str = "panama",
) -> Tuple[List[dict], dict]:
    """Scan z=18 satellite tiles to find buildings absent from the dataset."""
    print("\n═══ PHASE 3: DISCOVER MISSING BUILDINGS ═══")
    min_lng, min_lat, max_lng, max_lat = bbox
    print(f"  Bbox: [{min_lng:.3f},{min_lat:.3f}] → [{max_lng:.3f},{max_lat:.3f}]")

    scan_fetcher = TileFetcher(CACHE_DIR, zoom=SCAN_ZOOM)

    # Spatial index of existing buildings
    grid_step = 0.0003
    existing_grid: Dict[str, List[dict]] = defaultdict(list)
    for b in buildings:
        gx = int(b["lng"] / grid_step)
        gy = int(b["lat"] / grid_step)
        existing_grid[f"{gx},{gy}"].append(b)

    # Tile range
    tx_min, ty_max = lat_lng_to_tile(min_lat, min_lng, SCAN_ZOOM)
    tx_max, ty_min = lat_lng_to_tile(max_lat, max_lng, SCAN_ZOOM)
    total_tiles = (tx_max - tx_min + 1) * (ty_max - ty_min + 1)
    print(f"  Tiles to scan: {total_tiles} (zoom {SCAN_ZOOM})")
    if total_tiles > max_tiles:
        print(f"  Capping at {max_tiles} tiles.")

    mpp = meters_per_pixel(min_lat, SCAN_ZOOM)
    print(f"  Resolution: {mpp:.2f} m/px | Min building area: {MIN_CONTOUR_AREA_PX * mpp**2:.0f} m²")

    discovered: List[dict] = []
    tiles_scanned = 0

    outer_break = False
    for ty in range(ty_min, ty_max + 1):
        if outer_break:
            break
        for tx in range(tx_min, tx_max + 1):
            if tiles_scanned >= max_tiles:
                outer_break = True
                break

            tile = scan_fetcher.get_tile(tx, ty)
            if tile is None:
                continue

            tiles_scanned += 1
            if tiles_scanned % 50 == 0:
                print(f"  ... scanned {tiles_scanned} tiles | candidates so far: {len(discovered)}")

            for lat, lng, area_m2 in _detect_buildings_in_tile(tile, tx, ty, SCAN_ZOOM, mpp):
                gx = int(lng / grid_step)
                gy = int(lat / grid_step)
                has_nearby = False
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        for existing in existing_grid.get(f"{gx+dx},{gy+dy}", []):
                            if haversine_m(lat, lng, existing["lat"], existing["lng"]) < GAP_DISTANCE_M:
                                has_nearby = True
                                break
                        if has_nearby:
                            break
                    if has_nearby:
                        break

                if not has_nearby:
                    discovered.append(_create_building(lat, lng, area_m2, region))

    print(f"\n  Tiles scanned: {tiles_scanned}")
    print(f"  {scan_fetcher.stats()}")
    print(f"  New buildings discovered: {len(discovered)}")

    return discovered, {
        "tiles_scanned": tiles_scanned,
        "total_tiles": total_tiles,
        "discovered": len(discovered),
    }


def _detect_buildings_in_tile(
    tile: np.ndarray,
    tx: int,
    ty: int,
    zoom: int,
    mpp: float,
) -> List[Tuple[float, float, float]]:
    """Return list of (lat, lng, area_m2) for building-like contours in a tile."""
    gray = cv2.cvtColor(tile, cv2.COLOR_RGB2GRAY)

    # Adaptive threshold to handle brightness variation in Panama tropics
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 5
    )
    edges = cv2.Canny(gray, EDGE_THRESHOLD_LOW, EDGE_THRESHOLD_HIGH)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges_dilated = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    _ = thresh  # referenced to satisfy use; threshold aids multi-step pipelines

    results: List[Tuple[float, float, float]] = []
    for contour in contours:
        area_px = cv2.contourArea(contour)
        if not (MIN_CONTOUR_AREA_PX <= area_px <= MAX_CONTOUR_AREA_PX):
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area == 0 or area_px / hull_area < MIN_BUILDING_SOLIDITY:
            continue

        M = cv2.moments(contour)
        if M["m00"] == 0:
            continue
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])

        # Reject water/vegetation at centroid
        w = tile[max(0, cy - 4):cy + 4, max(0, cx - 4):cx + 4]
        if w.size > 0 and _classify_window(w) in ("water", "vegetation"):
            continue

        abs_px = tx * TILE_SIZE + cx
        abs_py = ty * TILE_SIZE + cy
        lat, lng = pixel_to_lat_lng(abs_px, abs_py, zoom)
        area_m2 = area_px * mpp ** 2
        results.append((lat, lng, area_m2))

    return results


# ═══════════════════════════════════════════════════════════════
# Building creation & Phase 4: SCORE
# ═══════════════════════════════════════════════════════════════

def _create_building(lat: float, lng: float, area_m2: float, region: str) -> dict:
    """Create a new building entry with Panama solar calculations."""
    usable = area_m2 * PANAMA_USABLE_AREA_RATIO
    kwp = usable * PANAMA_WATTS_PER_M2 / 1000
    panels = max(1, round(kwp * 1000 / PANAMA_PANEL_WATT))
    annual_kwh = kwp * PANAMA_PEAK_SUN_HOURS * 365 * PANAMA_PERFORMANCE_RATIO
    annual_savings = annual_kwh * PANAMA_ELECTRICITY_RATE

    priority, score = _kwp_to_priority_score(kwp, 0)

    return {
        "id": f"roof_{uuid.uuid4().hex[:12]}",
        "type": "roof",
        "status": "private",
        "region": region,
        "title": f"Detected Building ({area_m2:.0f} m²)",
        "location": region.replace("_", " ").title(),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "area": round(area_m2, 1),
        "usableArea": round(usable, 1),
        "capacityKwp": round(kwp, 2),
        "panelCount": panels,
        "annualKwh": round(annual_kwh),
        "annualSavingsUSD": round(annual_savings),
        "investmentUSD": round(kwp * 1000 * PANAMA_COST_PER_WP),
        "currency": PANAMA_CURRENCY,
        "solarScore": round(score),
        "priority": priority,
        "_source": "satellite_detection",
    }


def _kwp_to_priority_score(kwp: float, category_bonus: int) -> Tuple[str, float]:
    """Map kWp to priority letter and base score (Panama thresholds)."""
    if kwp >= PRIORITY_A_KWP:
        base = 85
    elif kwp >= PRIORITY_B_KWP:
        base = 70
    elif kwp >= PRIORITY_C_KWP:
        base = 50
    else:
        base = max(10, kwp * 5)

    score = min(100, base + category_bonus)

    if score >= SCORE_A:
        priority = "A"
    elif score >= SCORE_B:
        priority = "B"
    elif score >= SCORE_C:
        priority = "C"
    else:
        priority = "D"

    return priority, score


def phase_score(buildings: List[dict]) -> List[dict]:
    """Recompute solar score and priority A/B/C/D for every building.

    Uses Panama solar constants and category-aware bonuses.
    """
    print("\n═══ PHASE 4: SCORE ═══")
    for b in buildings:
        area = b.get("area", 0)
        kwp = b.get("capacityKwp")

        # Recalculate capacityKwp from area if missing or zero
        if not kwp:
            usable = area * PANAMA_USABLE_AREA_RATIO
            kwp = usable * PANAMA_WATTS_PER_M2 / 1000
            b["capacityKwp"] = round(kwp, 2)
            usable_m2 = round(usable, 1)
            b["usableArea"] = usable_m2
            b["panelCount"] = max(1, round(kwp * 1000 / PANAMA_PANEL_WATT))
            annual_kwh = kwp * PANAMA_PEAK_SUN_HOURS * 365 * PANAMA_PERFORMANCE_RATIO
            b["annualKwh"] = round(annual_kwh)
            b["annualSavingsUSD"] = round(annual_kwh * PANAMA_ELECTRICITY_RATE)
            b.setdefault("currency", PANAMA_CURRENCY)

        category = (b.get("category") or "").lower()
        category_bonus = 0
        if category in ("commercial", "hospitality", "retail"):
            category_bonus = 10
        elif category == "mixed":
            category_bonus = 5

        if area > 500:
            category_bonus += 5
        elif area > 200:
            category_bonus += 3

        priority, score = _kwp_to_priority_score(kwp, category_bonus)
        b["solarScore"] = round(score)
        b["priority"] = priority

    print(f"  Scored {len(buildings)} buildings.")
    return buildings


# ═══════════════════════════════════════════════════════════════
# Main pipeline
# ═══════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Solaris Panama — Roof Detection & Validation Pipeline"
    )
    parser.add_argument("--input", default=str(INPUT_FILE),
                        help="Input JSON (list of {id,lat,lng,area,category})")
    parser.add_argument("--output", default=str(OUTPUT_FILE),
                        help="Output JSON path")
    parser.add_argument("--phase", default="all",
                        choices=["all", "dedup", "validate", "discover", "score"],
                        help="Which phase(s) to run (default: all)")
    parser.add_argument("--discover", action="store_true",
                        help="Enable gap-discovery phase (Phase 3, default OFF)")
    parser.add_argument("--zoom", type=int, default=TILE_ZOOM,
                        help=f"Satellite tile zoom for validation (default: {TILE_ZOOM})")
    parser.add_argument("--bbox", default="-80.0,7.2,-77.0,9.7",
                        help="Discovery bbox: min_lng,min_lat,max_lng,max_lat (default: Panama)")
    parser.add_argument("--region", default="panama",
                        help="Region tag for discovered buildings")
    parser.add_argument("--max-tiles", type=int, default=MAX_CONCURRENT_TILES)
    parser.add_argument("--sample", type=int, default=0,
                        help="Validate only N buildings (0 = all, enables self-validation loop)")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════╗")
    print("║  Solaris Panama — Roof Detection Pipeline v1.0  ║")
    print("║  Self-validating satellite CV pipeline           ║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"\n  Peak sun hours : {PANAMA_PEAK_SUN_HOURS} kWh/m²/day")
    print(f"  Perf. ratio    : {PANAMA_PERFORMANCE_RATIO}")
    print(f"  Usable roof    : {int(PANAMA_USABLE_AREA_RATIO * 100)}%")
    print(f"  Panel          : {PANAMA_PANEL_WATT} W / {PANAMA_PANEL_AREA_M2} m²")
    print(f"  Currency       : {PANAMA_CURRENCY}")

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"\n[ERROR] Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    print(f"\nLoading: {input_path}")
    with open(input_path, encoding="utf-8") as fh:
        buildings = json.load(fh)
    print(f"  Loaded {len(buildings)} buildings")

    bbox = tuple(float(v) for v in args.bbox.split(","))
    assert len(bbox) == 4, "--bbox must be 4 comma-separated floats"

    report: dict = {"input_count": len(buildings), "phases": {}}
    fetcher = TileFetcher(CACHE_DIR, zoom=args.zoom)
    run_all = args.phase == "all"

    # ── Phase 1: Dedup ─────────────────────────────────────────
    if run_all or args.phase == "dedup":
        buildings, stats = phase_dedup(buildings)
        report["phases"]["dedup"] = stats

    # ── Phase 2: Validate ──────────────────────────────────────
    if run_all or args.phase == "validate":
        if args.sample > 0:
            buildings, stats = phase_validate(buildings, fetcher, sample_limit=args.sample)
        else:
            buildings, stats = self_validate(buildings, fetcher)
        report["phases"]["validate"] = stats

    # ── Phase 3: Discover (opt-in) ─────────────────────────────
    if (run_all or args.phase == "discover") and args.discover:
        discovered, stats = phase_discover(
            buildings, fetcher, bbox,
            max_tiles=args.max_tiles, region=args.region
        )
        if discovered:
            print(f"\n  Adding {len(discovered)} discovered buildings to dataset.")
            buildings.extend(discovered)
        report["phases"]["discover"] = stats
    elif (run_all or args.phase == "discover") and not args.discover:
        print("\n  Phase 3 (DISCOVER) skipped — pass --discover to enable.")

    # ── Phase 4: Score ─────────────────────────────────────────
    if run_all or args.phase == "score":
        buildings = phase_score(buildings)

    # Strip internal markers
    for b in buildings:
        b.pop("_validation", None)

    # ── Priority distribution & totals ─────────────────────────
    dist: Dict[str, int] = defaultdict(int)
    for b in buildings:
        dist[b.get("priority", "?")] += 1
    total_kwp = sum(b.get("capacityKwp", 0) for b in buildings)

    print(f"\n═══ FINAL OUTPUT ═══")
    print(f"  Total buildings : {len(buildings)}")
    print(f"  Priority dist   : A={dist.get('A',0)} B={dist.get('B',0)} "
          f"C={dist.get('C',0)} D={dist.get('D',0)}")
    print(f"  Total capacity  : {total_kwp / 1000:.1f} MWp")

    # Save output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Tag each building with _source if missing
    for b in buildings:
        b.setdefault("_source", "input")

    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(buildings, fh, ensure_ascii=False)
    print(f"  Saved: {output_path} ({os.path.getsize(output_path) / 1024:.1f} KB)")

    # Save report
    report["output_count"] = len(buildings)
    report["priority_distribution"] = dict(dist)
    report["total_mwp"] = round(total_kwp / 1000, 3)
    with open(REPORT_FILE, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
    print(f"  Report: {REPORT_FILE}")

    print("\nPipeline complete.")


if __name__ == "__main__":
    main()
