import { calculateDistanceKm, type LatLng } from './distance';

export type DeliveryZone = {
  id: string;
  name: string;
  zoneType: 'radius' | 'polygon';
  priority: number;
  deliveryFee: number;
  minimumOrderValue: number;
  center?: LatLng;
  radiusKm?: number;
  polygon?: LatLng[];
};

export function geoJsonPolygonToLatLngs(geoJson: { coordinates: number[][][] }): LatLng[] {
  const ring = geoJson.coordinates[0] ?? [];
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function matchDeliveryZone(point: LatLng, zones: DeliveryZone[]) {
  const matches = zones.filter((zone) => {
    if (zone.zoneType === 'radius' && zone.center && zone.radiusKm) {
      return calculateDistanceKm(point, zone.center) <= zone.radiusKm;
    }
    if (zone.zoneType === 'polygon' && zone.polygon) {
      return isPointInPolygon(point, zone.polygon);
    }
    return false;
  });

  return matches.sort((a, b) => a.priority - b.priority || a.deliveryFee - b.deliveryFee)[0] ?? null;
}
