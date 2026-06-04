import { Source, Layer } from 'react-map-gl/maplibre'

export function ParcelBoundaryLayer({ boundary }: { boundary?: { lat: number; lng: number }[] }) {
  if (!boundary || boundary.length < 3) return null
  const ring = boundary.map((p) => [p.lng, p.lat])
  ring.push(ring[0])
  const data = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} } as const
  return (
    <Source id="parcel" type="geojson" data={data as any}>
      <Layer id="parcel-fill" type="fill" paint={{ 'fill-color': '#f59e0b', 'fill-opacity': 0.12 }} />
      <Layer id="parcel-line" type="line" paint={{ 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [2, 1] }} />
    </Source>
  )
}
