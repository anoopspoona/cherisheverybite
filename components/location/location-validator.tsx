'use client';

import { useRef, useState, useTransition } from 'react';
import { StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api';
import { validateAndSaveAddress } from '@/app/account/addresses/actions';

const libraries: ('places')[] = ['places'];

type SavedResult = { ok: boolean; message: string; distance?: number; serviceable?: boolean };

export function LocationValidator() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const [result, setResult] = useState<SavedResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey ?? '', libraries });

  if (!apiKey) return <div className="border border-line bg-ivory p-6">Google Maps key is required.</div>;
  if (!isLoaded) return <div className="border border-line bg-ivory p-6 text-muted">Loading address search...</div>;

  function onPlacesChanged() {
    const place = searchBoxRef.current?.getPlaces()?.[0];
    const location = place?.geometry?.location;
    if (!place || !location) {
      setResult({ ok: false, message: 'Choose a valid address.' });
      return;
    }

    startTransition(async () => {
      const response = await validateAndSaveAddress({
        fullAddress: place.formatted_address ?? place.name ?? '',
        latitude: location.lat(),
        longitude: location.lng(),
        googlePlaceId: place.place_id
      });
      const address = response.address as { distance_from_kitchen_km?: number; is_serviceable?: boolean } | undefined;
      const next = {
        ok: response.ok,
        message: response.message,
        distance: address?.distance_from_kitchen_km,
        serviceable: address?.is_serviceable
      };
      setResult(next);
      window.localStorage.setItem('cherish_location_status', JSON.stringify(next));
    });
  }

  return (
    <div className="border border-line bg-ivory p-6">
      <p className="editorial-label text-accentRed">Delivery Check</p>
      <h2 className="mt-3 font-serif text-4xl">Find your Cherish zone</h2>
      <p className="mt-3 leading-7 text-charcoal">Checkout unlocks only when your address is inside an active delivery zone.</p>
      <StandaloneSearchBox onLoad={(box) => (searchBoxRef.current = box)} onPlacesChanged={onPlacesChanged}>
        <input aria-label="Search address" placeholder="Enter apartment, area or landmark" className="mt-6 h-14 w-full border border-line bg-cream px-5 text-charcoal outline-none focus:border-forest" />
      </StandaloneSearchBox>
      {isPending ? <p className="mt-4 text-sm text-muted">Checking serviceability...</p> : null}
      {result ? (
        <div className={`mt-5 border p-5 ${result.serviceable ? 'border-forest/30 bg-forest/5 text-forest' : 'border-accentRed/30 bg-accentRed/5 text-accentRed'}`}>
          <p className="font-serif text-2xl">{result.message}</p>
          {result.distance !== undefined ? <p className="mt-2 text-sm">Distance from kitchen: {result.distance} km</p> : null}
        </div>
      ) : null}
    </div>
  );
}
