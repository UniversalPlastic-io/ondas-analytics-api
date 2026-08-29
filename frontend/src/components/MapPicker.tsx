import { Box } from '@mui/material';
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngLiteral } from 'leaflet';
import L from 'leaflet';
import { useMemo } from 'react';

// Fix default marker icons for Vite bundling.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
});

function ClickHandler(props: { onPick: (p: LatLngLiteral) => void }) {
  useMapEvents({
    click(e) {
      props.onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function MapPicker(props: {
  center: { lat: number; lon: number };
  radiusKm?: number;
  onPick: (loc: { lat: number; lon: number }) => void;
  height?: number;
}) {
  const position = useMemo<LatLngLiteral>(() => ({ lat: props.center.lat, lng: props.center.lon }), [props.center]);

  return (
    <Box
      sx={{
        height: props.height ?? 220,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.10)',
        bgcolor: 'rgba(255,255,255,0.03)',
      }}
    >
      <MapContainer
        center={position}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler
          onPick={(p) => {
            props.onPick({ lat: p.lat, lon: p.lng });
          }}
        />
        <Marker position={position} />
        {typeof props.radiusKm === 'number' && props.radiusKm > 0 ? (
          <Circle
            center={position}
            radius={props.radiusKm * 1000}
            pathOptions={{ color: '#4ea1ff', weight: 2, fillColor: '#4ea1ff', fillOpacity: 0.12 }}
          />
        ) : null}
      </MapContainer>
    </Box>
  );
}

