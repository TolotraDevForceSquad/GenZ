// MapView.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { MapPin, Filter, Navigation, AlertTriangle, Shield, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interfaces
interface MapAlert {
  id: string | number;
  status: 'pending' | 'confirmed' | 'fake' | 'resolved';
  urgency: 'low' | 'medium' | 'high';
  reason: string;
  location: string;
  description: string;
  timestamp: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  author: {
    name: string;
    hasCIN: boolean;
  };
}

interface MapViewProps {
  alerts?: MapAlert[];
  onAlertClick?: (alert: MapAlert) => void;
  centerLocation?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void;
  onAlertCreate?: (coords: { lat: number; lng: number }) => void;
}

// Fix for default markers in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different statuses
const createCustomIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 2C10.477 2 6 6.477 6 12c0 8 10 18 10 18s10-10 10-18c0-5.523-4.477-10-10-10z"/>
        <circle fill="#ffffff" cx="16" cy="12" r="4"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const icons = {
  pending: createCustomIcon('#f59e0b'),
  confirmed: createCustomIcon('#10b981'),
  fake: createCustomIcon('#6b7280'),
  resolved: createCustomIcon('#3b82f6'),
};

interface MapEventsProps {
  onAlertCreate?: (coords: { lat: number; lng: number }) => void;
}

function MapEvents({ onAlertCreate }: MapEventsProps) {
  useMapEvents({
    click: (e) => {
      if (onAlertCreate) {
        onAlertCreate({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapCenterUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);

  return null;
}

export default function MapView({ 
  alerts = [], 
  onAlertClick, 
  centerLocation = { lat: -18.8792, lng: 47.5079 }, // Antananarivo par défaut
  userLocation,
  onLocationUpdate,
  onAlertCreate
}: MapViewProps) {
  const [selectedAlert, setSelectedAlert] = useState<MapAlert | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [mapCenter, setMapCenter] = useState(centerLocation);

  // Debug: Afficher les alerts reçues
  useEffect(() => {
    console.log('Alerts reçues dans MapView:', alerts);
    console.log('Nombre d\'alertes:', alerts.length);
    alerts.forEach((alert, index) => {
      console.log(`Alerte ${index}:`, alert);
    });
  }, [alerts]);

  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesUrgency = filterUrgency === 'all' || alert.urgency === filterUrgency;
    return matchesStatus && matchesUrgency;
  });

  console.log('Alertes filtrées:', filteredAlerts.length);

  const handleCenterToUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(newCoords);
          onLocationUpdate?.(newCoords);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Impossible d\'accéder à votre position');
        }
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'fake': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'resolved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmée';
      case 'fake': return 'Fausse';
      case 'resolved': return 'Résolue';
      default: return 'En validation';
    }
  };

  // Données de test temporaires - À supprimer une fois que vos données fonctionnent
  const testAlerts: MapAlert[] = [
    {
      id: 1,
      status: 'confirmed',
      urgency: 'high',
      reason: 'Test d\'alerte',
      location: 'Antananarivo',
      description: 'Ceci est une alerte de test pour vérifier l\'affichage',
      timestamp: new Date().toLocaleString(),
      coordinates: { lat: -18.8792, lng: 47.5079 },
      author: { name: 'Test User', hasCIN: true }
    },
    {
      id: 2,
      status: 'pending',
      urgency: 'medium',
      reason: 'Alerte en validation',
      location: 'Antsirabe',
      description: 'Alerte en cours de vérification',
      timestamp: new Date().toLocaleString(),
      coordinates: { lat: -19.8667, lng: 47.0333 },
      author: { name: 'Utilisateur Test', hasCIN: false }
    }
  ];

  // Utilisez testAlerts temporairement pour tester, puis remplacez par filteredAlerts
  const alertsToDisplay = filteredAlerts;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Carte d'insécurité</h1>
          <p className="text-muted-foreground">
            Visualisez les alertes de sécurité en temps réel sur la carte interactive
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filters Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtres
              </CardTitle>
              <CardDescription>
                Filtrez les alertes par statut et urgence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En validation</SelectItem>
                    <SelectItem value="confirmed">Confirmées</SelectItem>
                    <SelectItem value="fake">Fausses alertes</SelectItem>
                    <SelectItem value="resolved">Résolues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Urgence</label>
                <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                  <SelectTrigger data-testid="select-urgency-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="high">Urgent</SelectItem>
                    <SelectItem value="medium">Modéré</SelectItem>
                    <SelectItem value="low">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="text-sm font-medium">Légende</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">En validation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Confirmée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-sm">Fausse alerte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Résolue</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {alertsToDisplay.length} alerte(s) affichée(s)
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleCenterToUser}
                    data-testid="button-center-map"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Centrer sur ma position
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map and Alert Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Container */}
            <Card>
              <CardContent className="p-0">
                <div className="h-96 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <MapCenterUpdater center={mapCenter} />
                    <MapEvents onAlertCreate={onAlertCreate} />
                    
                    {alertsToDisplay.map((alert) => (
                      <Marker
                        key={alert.id}
                        position={[alert.coordinates.lat, alert.coordinates.lng]}
                        icon={icons[alert.status]}
                        eventHandlers={{
                          click: () => setSelectedAlert(alert),
                        }}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <h4 className="font-semibold">{alert.reason}</h4>
                            <p className="text-sm text-muted-foreground">{alert.location}</p>
                            <Badge className={`mt-2 ${getStatusColor(alert.status)}`}>
                              {getStatusText(alert.status)}
                            </Badge>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            {/* Alert Details */}
            {selectedAlert && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Détails de l'alerte
                      </CardTitle>
                      <CardDescription>
                        Informations complètes sur l'incident signalé
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(selectedAlert.status)}>
                        {getStatusText(selectedAlert.status)}
                      </Badge>
                      <Badge className={getUrgencyColor(selectedAlert.urgency)}>
                        {selectedAlert.urgency === 'high' ? 'Urgent' :
                         selectedAlert.urgency === 'medium' ? 'Modéré' : 'Info'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-base mb-1">{selectedAlert.reason}</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedAlert.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedAlert.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{selectedAlert.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Signalé par:</span>
                    <span className="font-medium">{selectedAlert.author.name}</span>
                    {selectedAlert.author.hasCIN && (
                      <Shield className="w-4 h-4 text-green-400" />
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline"
                      onClick={() => onAlertClick?.(selectedAlert)}
                      data-testid="button-view-full-alert"
                    >
                      Voir l'alerte complète
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setMapCenter(selectedAlert.coordinates)}
                      data-testid="button-navigate"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Naviguer vers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}