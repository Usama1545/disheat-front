// GoogleMap.types.ts

export type LatLng = {
  lat: number;
  lng: number;
};

export interface GoogleMapProps {
  latLng: LatLng | null;
  onLocationUpdate?: (location: LatLng) => void;
  height?: number;
}
