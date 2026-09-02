// ---------------------------------------------------------------
// Map configuration.
//
// Leaflet itself is vendored into the bundle (npm dependency), but the
// tiles are fetched from a remote server at runtime — this is the one
// part of the app that talks to the network. Point the two variables
// below at your own tile server to make it self-hosted again.
//
// The default is OpenStreetMap, whose tile usage policy requires the
// attribution below to stay visible and forbids heavy automated use:
// https://operations.osmfoundation.org/policies/tiles/
// ---------------------------------------------------------------

export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAX_ZOOM = 18;

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Default view. Centred on Iran at a zoom that frames the country; the
 * bounds keep panning within the region rather than letting a shopper
 * wander to the other side of the planet looking for their street.
 */
export const IRAN_CENTER: LatLon = { lat: 32.4279, lon: 53.688 };
export const IRAN_ZOOM = 5;

/** Generous box around Iran and its immediate neighbours. */
export const REGION_BOUNDS: [[number, number], [number, number]] = [
  [22.0, 38.0],
  [42.5, 68.0],
];

export function isValidLat(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLon(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidLatLon(value: Partial<LatLon> | null): value is LatLon {
  if (!value) return false;
  return (
    typeof value.lat === "number" &&
    typeof value.lon === "number" &&
    isValidLat(value.lat) &&
    isValidLon(value.lon)
  );
}

/** Six decimals is ~11 cm — far more precision than an address needs. */
export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function formatLatLon(value: LatLon): string {
  return `${value.lat.toFixed(6)}, ${value.lon.toFixed(6)}`;
}
