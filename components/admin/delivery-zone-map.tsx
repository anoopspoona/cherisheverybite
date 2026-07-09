'use client';

import { GoogleMap, Polygon, useJsApiLoader } from '@react-google-maps/api';

type Zone = {
  id: string;
  name: string;
  polygon_geojson: { coordinates?: number[][][] } | null;
};

function polygonPath(zone: Zone) {
  const ring = zone.polygon_geojson?.coordinates?.[0] ?? [];
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

export function DeliveryZoneMap({ zones }: { zones: Zone[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey ?? '' });

  if (!apiKey) {
    return (
      <div className="grid min-h-[28rem] place-items-center border border-line bg-ivory p-8 text-center">
        <div>
          <p className="editorial-label text-accentRed">Google Maps</p>
          <h2 className="mt-3 font-serif text-4xl">API key required</h2>
          <p className="mt-4 max-w-xl text-charcoal">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view and edit delivery polygons on the map.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="grid min-h-[28rem] place-items-center border border-line bg-ivory text-muted">Loading Google Map…</div>;
  }

  return (
    <GoogleMap
      mapContainerClassName="min-h-[28rem] w-full border border-line"
      center={{ lat: 8.5241, lng: 76.9366 }}
      zoom={11}
      options={{ disableDefaultUI: true, zoomControl: true, mapTypeControl: false, streetViewControl: false }}
    >
      {zones.map((zone) => {
        const path = polygonPath(zone);
        return path.length > 0 ? (
          <Polygon
            key={zone.id}
            paths={path}
            options={{ fillOpacity: 0.18, strokeWeight: 2, clickable: false }}
          />
        ) : null;
      })}
    </GoogleMap>
  );
}
