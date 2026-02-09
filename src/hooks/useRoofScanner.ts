import { useState, useCallback, useMemo } from 'react';
import { fetchBuildingsInBounds } from '@/services/overpassService';
import { classifyBuilding, type SuitabilityResult } from '@/services/roofClassifier';
import { scanRoof, type RoofScanResult } from '@/services/roofScannerService';

// ===== Types =====

export interface DiscoveredBuilding {
  id: number;
  osmId: number;
  coordinates: Array<{ lat: number; lon: number }>;
  center: { lat: number; lng: number };
  area: number;
  buildingType: string;
  name: string;
  suitability: SuitabilityResult;
  analyzed: boolean;
  solarAnalysis?: RoofScanResult;
}

export interface ScannerFilters {
  minArea: number;
  minScore: number;
}

export interface ScannerStats {
  total: number;
  suitable: number;
  excellent: number;
  avgScore: number;
  totalKwpPotential: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ===== Constants =====

const PANEL_WATT = 580;
const PANEL_AREA_M2 = 2.58;
const USABLE_ROOF_RATIO = 0.6;

const DEFAULT_FILTERS: ScannerFilters = {
  minArea: 200,
  minScore: 0,
};

// ===== Hook =====

export function useRoofScanner() {
  const [buildings, setBuildings] = useState<DiscoveredBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filters, setFiltersState] = useState<ScannerFilters>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);

  // Scan viewport for buildings
  const scanViewport = useCallback(async (bounds: MapBounds) => {
    setIsScanning(true);
    setError(null);

    try {
      const osmBuildings = await fetchBuildingsInBounds(bounds);

      const discovered: DiscoveredBuilding[] = osmBuildings.map((b, idx) => {
        const suitability = classifyBuilding(b);
        return {
          id: idx + Date.now(), // unique ID
          osmId: b.id,
          coordinates: b.coordinates,
          center: { lat: b.center.lat, lng: b.center.lon },
          area: b.area,
          buildingType: b.tags?.building || 'yes',
          name: b.tags?.name || b.tags?.['addr:street'] || `Building ${b.id}`,
          suitability,
          analyzed: false,
        };
      });

      setBuildings((prev) => {
        // Merge with existing, avoid duplicates by osmId
        const existingOsmIds = new Set(prev.map((b) => b.osmId));
        const newBuildings = discovered.filter((b) => !existingOsmIds.has(b.osmId));
        return [...prev, ...newBuildings];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan buildings';
      setError(message);
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Select a building
  const selectBuilding = useCallback((id: number | null) => {
    setSelectedBuildingId(id);
  }, []);

  // Analyze a building with solar scan
  const analyzeBuilding = useCallback(async (building: DiscoveredBuilding) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await scanRoof({
        latitude: building.center.lat,
        longitude: building.center.lng,
        roofAreaM2: building.area,
      });

      setBuildings((prev) =>
        prev.map((b) =>
          b.id === building.id
            ? { ...b, analyzed: true, solarAnalysis: result }
            : b
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze building';
      setError(message);
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Clear all buildings
  const clearBuildings = useCallback(() => {
    setBuildings([]);
    setSelectedBuildingId(null);
    setError(null);
  }, []);

  // Update filters
  const setFilters = useCallback((partial: Partial<ScannerFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Filtered buildings
  const filteredBuildings = useMemo(() => {
    return buildings.filter(
      (b) =>
        b.area >= filters.minArea &&
        b.suitability.score >= filters.minScore
    );
  }, [buildings, filters]);

  // Stats
  const stats = useMemo((): ScannerStats => {
    if (filteredBuildings.length === 0) {
      return { total: 0, suitable: 0, excellent: 0, avgScore: 0, totalKwpPotential: 0 };
    }

    const suitable = filteredBuildings.filter((b) => b.suitability.score >= 55).length;
    const excellent = filteredBuildings.filter((b) => b.suitability.score >= 75).length;
    const avgScore =
      filteredBuildings.reduce((sum, b) => sum + b.suitability.score, 0) /
      filteredBuildings.length;

    const totalKwpPotential = filteredBuildings.reduce((sum, b) => {
      if (b.solarAnalysis) {
        return sum + b.solarAnalysis.maxSystemSizeKwp;
      }
      // Estimate from area
      const usable = b.area * USABLE_ROOF_RATIO;
      const panels = Math.floor(usable / PANEL_AREA_M2);
      return sum + (panels * PANEL_WATT) / 1000;
    }, 0);

    return {
      total: filteredBuildings.length,
      suitable,
      excellent,
      avgScore: Math.round(avgScore),
      totalKwpPotential: Math.round(totalKwpPotential),
    };
  }, [filteredBuildings]);

  // Convert buildings to GeoJSON for the map
  const buildingsGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = filteredBuildings.map((b) => {
      // Convert [{lat, lon}] to GeoJSON ring [[lng, lat], ...]
      const ring = b.coordinates.map((c) => [c.lon, c.lat] as [number, number]);
      // Close the ring if not already closed
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] ||
          ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push([...ring[0]] as [number, number]);
      }

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
        properties: {
          id: b.id,
          score: b.suitability.score,
          area: b.area,
          name: b.name,
          type: b.buildingType,
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [filteredBuildings]);

  // Selected building object
  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  return {
    // State
    buildings: filteredBuildings,
    allBuildings: buildings,
    selectedBuilding,
    selectedBuildingId,
    isScanning,
    isAnalyzing,
    filters,
    error,
    stats,
    buildingsGeoJSON,

    // Actions
    scanViewport,
    selectBuilding,
    analyzeBuilding,
    clearBuildings,
    setFilters,
  };
}
