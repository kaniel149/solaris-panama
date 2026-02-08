// Type declarations for react-map-gl
// The library ships its own types but uses subpath exports that TypeScript
// module resolution may not resolve correctly with bundler mode.

declare module 'react-map-gl/maplibre' {
  import type { CSSProperties, ReactNode, Ref } from 'react';

  export interface ViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
    padding?: { top: number; bottom: number; left: number; right: number };
  }

  export interface MapRef {
    getMap(): any;
    getCenter(): { lng: number; lat: number };
    getZoom(): number;
    getBounds(): any;
    flyTo(options: any): void;
  }

  export interface MapProps {
    ref?: Ref<MapRef>;
    mapStyle?: string;
    style?: CSSProperties;
    longitude?: number;
    latitude?: number;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    onMove?: (evt: { viewState: ViewState }) => void;
    onMoveEnd?: (evt: any) => void;
    onClick?: (evt: any) => void;
    onMouseEnter?: (evt: any) => void;
    onMouseLeave?: (evt: any) => void;
    interactiveLayerIds?: string[];
    attributionControl?: boolean;
    reuseMaps?: boolean;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface SourceProps {
    id: string;
    type: 'geojson' | 'vector' | 'raster' | 'image' | 'video';
    data?: any;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface LayerProps {
    id: string;
    type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap' | 'fill-extrusion' | 'raster' | 'background';
    source?: string;
    paint?: Record<string, any>;
    layout?: Record<string, any>;
    filter?: any[];
    minzoom?: number;
    maxzoom?: number;
    [key: string]: any;
  }

  export interface NavigationControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCompass?: boolean;
    showZoom?: boolean;
    visualizePitch?: boolean;
  }

  export interface GeolocateControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    trackUserLocation?: boolean;
    showAccuracyCircle?: boolean;
    showUserHeading?: boolean;
    showUserLocation?: boolean;
  }

  export default function Map(props: MapProps): JSX.Element;
  export function Source(props: SourceProps): JSX.Element;
  export function Layer(props: LayerProps): JSX.Element;
  export function NavigationControl(props: NavigationControlProps): JSX.Element;
  export function GeolocateControl(props: GeolocateControlProps): JSX.Element;
}
