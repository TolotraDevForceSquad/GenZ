// types/map.ts
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapAlert {
  id: string;
  reason: string;
  description: string;
  location: string;
  coordinates: Coordinates;
  status: 'pending' | 'confirmed' | 'fake' | 'resolved';
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
  author: {
    name: string;
    hasCIN: boolean;
  };
  media?: string[];
}

export interface MapViewProps {
  alerts?: MapAlert[];
  onAlertClick?: (alert: MapAlert) => void;
  centerLocation?: Coordinates;
  userLocation?: Coordinates;
  onLocationUpdate?: (coords: Coordinates) => void;
}