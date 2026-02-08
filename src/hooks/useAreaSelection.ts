import { useState, useCallback, useMemo } from 'react';
import { PANAMA_ZONES, getZoneById } from '@/config/panamaZones';
import type { LeadZone } from '@/types/lead';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function useAreaSelection() {
  const [selectedZone, setSelectedZone] = useState<LeadZone | null>(null);
  const [customBounds, setCustomBounds] = useState<Bounds | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle' | null>(null);

  // Select a predefined zone
  const selectZone = useCallback((zoneId: string) => {
    const zone = getZoneById(zoneId);
    if (zone) {
      setSelectedZone(zone);
      setCustomBounds(null);
      setIsDrawing(false);
      setDrawMode(null);
    }
  }, []);

  // Clear zone selection
  const clearZone = useCallback(() => {
    setSelectedZone(null);
    setCustomBounds(null);
  }, []);

  // Start drawing a custom area
  const startDraw = useCallback((mode: 'polygon' | 'rectangle') => {
    setIsDrawing(true);
    setDrawMode(mode);
    setSelectedZone(null);
  }, []);

  // Finish drawing with computed bounds
  const finishDraw = useCallback((bounds: Bounds) => {
    setCustomBounds(bounds);
    setIsDrawing(false);
    setDrawMode(null);
    setSelectedZone(null);
  }, []);

  // Cancel drawing
  const cancelDraw = useCallback(() => {
    setIsDrawing(false);
    setDrawMode(null);
  }, []);

  // Get the currently active bounds (zone or custom)
  const getActiveBounds = useCallback((): Bounds | null => {
    if (selectedZone) return selectedZone.bounds;
    if (customBounds) return customBounds;
    return null;
  }, [selectedZone, customBounds]);

  // All available zones
  const zones = useMemo(() => PANAMA_ZONES, []);

  // Name of the active zone (if any)
  const activeZoneName = useMemo(() => {
    if (selectedZone) return selectedZone.name;
    if (customBounds) return 'Custom Area';
    return null;
  }, [selectedZone, customBounds]);

  return {
    // State
    selectedZone,
    customBounds,
    isDrawing,
    drawMode,
    zones,
    activeZoneName,

    // Actions
    selectZone,
    clearZone,
    startDraw,
    finishDraw,
    cancelDraw,
    getActiveBounds,
  };
}
