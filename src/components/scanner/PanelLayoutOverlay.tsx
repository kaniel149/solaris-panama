/**
 * PanelLayoutOverlay.tsx
 *
 * Renders a deterministic solar-panel tessellation on the MapLibre map as
 * GeoJSON fill + line layers, matching the ScannerMap layer pattern exactly.
 *
 * Algorithm (ported from Bustan panel-layout.ts, no @turf/area dependency):
 *  1. Project the roof polygon ring to a local metric space centred on the
 *     polygon centroid using an equirectangular approximation.
 *  2. Shrink the ring by `edgeSetbackM` (centroid-shrink heuristic).
 *  3. Sweep a regular grid; keep every panel whose 4 corners + centre fall
 *     inside both the inset and the original projected rings (ray-cast PIP).
 *  4. Unproject each panel rectangle back to [lng, lat] and emit a GeoJSON
 *     FeatureCollection for MapLibre.
 *
 * Usage: place inside the <Map> component in ScannerMap.tsx, after the
 * existing <Source> blocks. Pass the roof polygon as a GeoJSON.Polygon in
 * [lng, lat] order (same CRS as everything else in the scanner).
 */

import { useMemo, useState, useCallback } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Eye, EyeOff } from 'lucide-react';

// ─── Panel defaults (580 W LONGi Hi-MO X6 landscape) ────────────────────────
const PANEL_W_M = 1.762;   // long axis (landscape horizontal)
const PANEL_H_M = 1.134;   // short axis
const WATTAGE_W  = 580;
const EDGE_SETBACK_M = 0.5;
const COL_GAP_M = 0.02;
const ROW_GAP_M = 0.02;

// Minimum roof area (m²) below which we skip tessellation entirely.
const MIN_ROOF_AREA_M2 = 30;

// ─── Geo math helpers ────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180;

function makeProjection(centLng: number, centLat: number) {
  const mPerDegLat =
    111_132.954 -
    559.822 * Math.cos(2 * toRad(centLat)) +
    1.175 * Math.cos(4 * toRad(centLat));
  const mPerDegLng = mPerDegLat * Math.cos(toRad(centLat));

  const project = ([lng, lat]: [number, number]): [number, number] => [
    (lng - centLng) * mPerDegLng,
    (lat - centLat) * mPerDegLat,
  ];

  const unproject = ([x, y]: [number, number]): [number, number] => [
    centLng + x / mPerDegLng,
    centLat + y / mPerDegLat,
  ];

  return { project, unproject };
}

function ringCentroid(ring: [number, number][]): [number, number] {
  const verts =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  let sx = 0, sy = 0;
  for (const [x, y] of verts) { sx += x; sy += y; }
  return [sx / verts.length, sy / verts.length];
}

/** Jordan curve theorem ray-cast. True if [px,py] is strictly inside ring. */
function pointInRing(ring: [number, number][], px: number, py: number): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const cross =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (cross) inside = !inside;
  }
  return inside;
}

function panelFitsInRing(
  ring: [number, number][],
  cx: number, cy: number,
  hw: number, hh: number,
): boolean {
  const checks: [number, number][] = [
    [cx - hw, cy - hh], [cx + hw, cy - hh],
    [cx + hw, cy + hh], [cx - hw, cy + hh],
    [cx, cy],
  ];
  return checks.every(([x, y]) => pointInRing(ring, x, y));
}

function insetRing(ring: [number, number][], setback: number): [number, number][] {
  if (setback <= 0) return ring;
  const [cx, cy] = ringCentroid(ring);
  return ring.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-9) return [x, y] as [number, number];
    const scale = Math.max(0, dist - setback) / dist;
    return [cx + dx * scale, cy + dy * scale] as [number, number];
  });
}

/** Planar shoelace area in projected m² (approximate for small polygons). */
function ringAreaM2(ring: [number, number][]): number {
  let area = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += ring[i][0] * ring[j][1];
    area -= ring[j][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}

// ─── Core tessellation ───────────────────────────────────────────────────────

interface TessellationResult {
  count: number;
  capacityKwp: number;
  fc: GeoJSON.FeatureCollection;
}

function computePanelLayout(
  polygon: GeoJSON.Polygon,
): TessellationResult | null {
  const outerRingLngLat = polygon.coordinates[0] as [number, number][];
  if (!outerRingLngLat || outerRingLngLat.length < 3) return null;

  const [centLng, centLat] = ringCentroid(outerRingLngLat);
  const { project, unproject } = makeProjection(centLng, centLat);

  const outerRingM = outerRingLngLat.map(project) as [number, number][];

  // Quick area guard: skip tiny / degenerate polygons
  const approxArea = ringAreaM2(outerRingM);
  if (approxArea < MIN_ROOF_AREA_M2) return null;

  const insetRingM = insetRing(outerRingM, EDGE_SETBACK_M);

  const xs = insetRingM.map(([x]) => x);
  const ys = insetRingM.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const stepX = PANEL_W_M + COL_GAP_M;
  const stepY = PANEL_H_M + ROW_GAP_M;
  const hw = PANEL_W_M / 2;
  const hh = PANEL_H_M / 2;

  const features: GeoJSON.Feature[] = [];

  let row = 0;
  for (let cy = minY + hh; cy + hh <= maxY + 1e-9; cy += stepY, row++) {
    let col = 0;
    for (let cx = minX + hw; cx + hw <= maxX + 1e-9; cx += stepX, col++) {
      if (
        panelFitsInRing(insetRingM, cx, cy, hw, hh) &&
        panelFitsInRing(outerRingM, cx, cy, hw, hh)
      ) {
        const corners: [number, number][] = [
          [cx - hw, cy - hh], [cx + hw, cy - hh],
          [cx + hw, cy + hh], [cx - hw, cy + hh],
          [cx - hw, cy - hh],
        ];
        const ring = corners.map(unproject);
        features.push({
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
          properties: { id: `r${row}c${col}` },
        });
      }
    }
  }

  if (features.length === 0) return null;

  return {
    count: features.length,
    capacityKwp: parseFloat(((features.length * WATTAGE_W) / 1000).toFixed(2)),
    fc: { type: 'FeatureCollection', features },
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PanelLayoutOverlayProps {
  /**
   * GeoJSON Polygon of the selected roof in [lng, lat] order.
   * Sourced from the drawn roof polygon or the detected candidate roofGeom.
   * Pass null / undefined when no roof is selected — overlay hides itself.
   */
  roofPolygon: GeoJSON.Polygon | null | undefined;
  /** Whether the panel grid is currently shown. Controlled by parent via usePanelLayout. */
  visible?: boolean;
}

/**
 * Drop inside <Map> after the existing <Source> blocks in ScannerMap.tsx.
 *
 * Renders:
 *  - Blue semi-transparent panel fill (GeoJSON fill layer)
 *  - Cyan outline per panel (GeoJSON line layer)
 *
 * Handles degenerate polygons (< 30 m², < 3 vertices) gracefully — simply
 * renders nothing without throwing.
 */
export function PanelLayoutOverlay({ roofPolygon, visible = true }: PanelLayoutOverlayProps) {
  const result = useMemo<TessellationResult | null>(() => {
    if (!roofPolygon) return null;
    try {
      return computePanelLayout(roofPolygon);
    } catch {
      return null;
    }
  }, [roofPolygon]);

  if (!result) return null;

  const displayData = visible
    ? result.fc
    : { type: 'FeatureCollection' as const, features: [] };

  return (
    <Source id="panel-layout" type="geojson" data={displayData}>
      <Layer
        id="panel-layout-fill"
        type="fill"
        paint={{
          'fill-color': '#3B82F6',
          'fill-opacity': 0.55,
        }}
      />
      <Layer
        id="panel-layout-line"
        type="line"
        paint={{
          'line-color': '#00ffcc',
          'line-width': 0.8,
          'line-opacity': 0.7,
        }}
      />
    </Source>
  );
}

/**
 * Floating info / toggle badge for the panel layout.
 * Render this in the overlay layer of RoofScannerPage (absolute positioned),
 * passing the same `roofPolygon` that you pass to PanelLayoutOverlay.
 *
 * Position suggestion: `absolute bottom-20 left-1/2 -translate-x-1/2 z-20`
 */
export function PanelLayoutBadge({
  roofPolygon,
  visible,
  onToggle,
}: {
  roofPolygon: GeoJSON.Polygon | null | undefined;
  visible: boolean;
  onToggle: () => void;
}) {
  const result = useMemo<TessellationResult | null>(() => {
    if (!roofPolygon) return null;
    try {
      return computePanelLayout(roofPolygon);
    } catch {
      return null;
    }
  }, [roofPolygon]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="panel-badge"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-[#3B82F6]/30"
      >
        <Grid3X3 className="w-4 h-4 text-[#3B82F6]" />
        <span className="text-xs font-semibold text-[#f0f0f5]">
          {result.count} paneles · {result.capacityKwp.toLocaleString('es-PA')} kWp
        </span>
        <button
          onClick={onToggle}
          className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
          title={visible ? 'Ocultar paneles' : 'Mostrar paneles'}
        >
          {visible
            ? <EyeOff className="w-3.5 h-3.5 text-[#8888a0]" />
            : <Eye className="w-3.5 h-3.5 text-[#8888a0]" />
          }
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Self-contained hook that manages visibility state and exposes both the
 * overlay component and the badge so ScannerMap / RoofScannerPage can
 * render them independently.
 */
export function usePanelLayout(roofPolygon: GeoJSON.Polygon | null | undefined) {
  const [visible, setVisible] = useState(true);
  const toggle = useCallback(() => setVisible((v) => !v), []);
  return { visible, toggle, roofPolygon };
}
