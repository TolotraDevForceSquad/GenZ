// MapView.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo } from "react";
import { MapPin, Filter, Navigation, AlertTriangle, Shield, Clock, Send, X, Camera, Map, ThumbsUp, MessageCircle, Eye, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Alert } from '@shared/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Fix for default markers in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different statuses, adaptés au thème sombre
const createCustomIcon = (color: string, count?: number) => {
  const svgContent = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 2C10.477 2 6 6.477 6 12c0 8 10 18 10 18s10-10 10-18c0-5.523-4.477-10-10-10z"/>
      <circle fill="#ffffff" cx="16" cy="12" r="4"/>
      ${count ? `<text x="16" y="14" font-size="12" fill="${color}" text-anchor="middle" dy=".3em">${count}</text>` : ''}
    </svg>
  `;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgContent)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const icons = {
  pending: createCustomIcon('#f59e0b'),
  confirmed: createCustomIcon('#10b981'),
  fake: createCustomIcon('#ef4444'),
  resolved: createCustomIcon('#3b82f6'),
};

interface MapViewProps {
  onAlertClick?: (alert: Alert) => void;
  centerLocation?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
    hasCIN?: boolean;
  };
}

interface GroupedAlerts {
  key: string;
  position: [number, number];
  alerts: Alert[];
  icon: L.Icon<L.DivIcon>;
}

function MapEvents({ onAlertCreate, setCreateDialogOpen, setCreateCoords }: any) {
  useMapEvents({
    click: (e) => {
      if (onAlertCreate) {
        onAlertCreate({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        setCreateCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setCreateDialogOpen(true);
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
  onAlertClick, 
  centerLocation = { lat: -18.8792, lng: 47.5079 }, // Antananarivo par défaut
  userLocation,
  onLocationUpdate,
  currentUser
}: MapViewProps) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'fake' | 'resolved'>('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [mapCenter, setMapCenter] = useState(centerLocation);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedAlerts | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false); // État pour le mobile

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createCoords, setCreateCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Create alert form state (adapté au SOSForm)
  const [createForm, setCreateForm] = useState({
    reason: '',
    description: '',
    location: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
  });
  const [creating, setCreating] = useState(false);

  // View alert details
  const [alertComments, setAlertComments] = useState<any[]>([]);
  const [viewingAlert, setViewingAlert] = useState<Alert | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  // Utiliser React Query pour fetch alerts
  const { data: alerts = [], isLoading, error: fetchError } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/alerts?limit=50');
      if (!response.ok) throw new Error('Erreur de chargement des alertes');
      return response.json();
    },
  });

  useEffect(() => {
    if (fetchError) setError('Erreur lors du chargement des alertes');
  }, [fetchError]);

  // Déplacer getStatusColor avant useMemo pour éviter l'erreur de référence
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'fake': return 'bg-red-500';
      case 'resolved': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  // Grouper les alertes par coordonnées pour gérer les doublons
  const groupedAlerts: GroupedAlerts[] = useMemo(() => {
    const groups: { [key: string]: Alert[] } = {};
    alerts.forEach((alert: Alert) => {
      const key = `${alert.latitude.toFixed(4)},${alert.longitude.toFixed(4)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(alert);
    });

    return Object.entries(groups).map(([key, alertList]) => {
      const [lat, lng] = key.split(',').map(Number);
      const count = alertList.length;
      const status = alertList[0]?.status || 'pending'; // Statut dominant pour l'icône
      const color = getStatusColor(status).replace('bg-', '#'); // Extraire la couleur pour l'icône
      const icon = count > 1 ? createCustomIcon(color, count) : icons[status as keyof typeof icons];
      return { key, position: [lat, lng], alerts: alertList, icon };
    });
  }, [alerts]);

  const filteredGroups = useMemo(() => {
    return groupedAlerts.filter(group => {
      const firstAlert = group.alerts[0];
      const matchesStatus = filterStatus === 'all' || firstAlert.status === filterStatus;
      const matchesUrgency = filterUrgency === 'all' || firstAlert.urgency === filterUrgency;
      return matchesStatus && matchesUrgency;
    });
  }, [groupedAlerts, filterStatus, filterUrgency]);

  const filteredAlertsCount = useMemo(() => filteredGroups.reduce((acc, group) => acc + group.alerts.length, 0), [filteredGroups]);

  const handleCenterToUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMapCenter(newCoords);
          onLocationUpdate?.(newCoords);
        },
        (error) => {
          console.error('Erreur lors de la géolocalisation:', error);
          alert('Impossible d\'accéder à votre position');
        }
      );
    }
    // Fermer la sidebar après l'action sur mobile
    if (isFilterSidebarOpen) {
      setIsFilterSidebarOpen(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      default: return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
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
  
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'fake': return 'bg-red-500';
      case 'resolved': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  // Mutation pour créer une alerte (adaptée au code fourni)
  const createAlertMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!currentUser?.id) throw new Error('Utilisateur non authentifié');
      const response = await fetch('/api/alerts', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Erreur lors de la création de l\'alerte');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setCreateDialogOpen(false);
      setCreateForm({ reason: '', description: '', location: '', urgency: 'medium' });
      setCreateCoords(null);
    },
    onError: (err) => {
      console.error('Erreur création alerte:', err);
      alert('Erreur lors de la création de l\'alerte');
    },
  });

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCoords || !currentUser?.id) return alert('Utilisateur non authentifié ou coordonnées manquantes');
    setCreating(true);
    const formData = new FormData();
    formData.append('reason', createForm.reason || 'Autre');
    formData.append('description', createForm.description || 'Pas de description');
    formData.append('location', createForm.location || 'Lieu non précisé');
    formData.append('urgency', createForm.urgency);
    formData.append('authorId', currentUser.id);
    formData.append('latitude', createCoords.lat.toString());
    formData.append('longitude', createCoords.lng.toString());
    createAlertMutation.mutate(formData);
    setCreating(false);
  };

  const handleMarkerClick = (group: GroupedAlerts) => {
    setSelectedGroup(group);
    setCurrentIndex(0);
    onAlertClick?.(group.alerts[0]);
    // Déplacer la carte sur l'alerte sélectionnée sur mobile
    setMapCenter({ lat: group.position[0], lng: group.position[1] });
  };

  const handleNextAlert = () => {
    if (selectedGroup && currentIndex < selectedGroup.alerts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      onAlertClick?.(selectedGroup.alerts[currentIndex + 1]);
    }
  };

  const handlePrevAlert = () => {
    if (selectedGroup && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      onAlertClick?.(selectedGroup.alerts[currentIndex - 1]);
    }
  };

  const currentAlert = selectedGroup ? selectedGroup.alerts[currentIndex] : null;

  const handleViewFullAlert = async (alert: Alert) => {
    setViewingAlert(alert);
    setLoadingComments(true);
    try {
      const response = await apiRequest('GET', `/api/alerts/${alert.id}/comments`);
      if (response.ok) setAlertComments(await response.json());
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
    } finally {
      setLoadingComments(false);
      setViewDialogOpen(true);
    }
    onAlertClick?.(alert);
  };

  const handleCloseView = () => {
    setViewDialogOpen(false);
    setViewingAlert(null);
    setAlertComments([]);
  };

  const handleNavigateTo = (alert: Alert) => {
    // Utiliser window.open pour ouvrir Google Maps avec les coordonnées
    const url = userLocation 
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${alert.latitude},${alert.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCloseDetails = () => {
    setSelectedGroup(null);
    setCurrentIndex(0);
  };

  // Afficher les chargements et erreurs
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#161313] flex items-center justify-center text-white p-4">
        <p className="text-lg">Chargement des alertes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#161313] flex items-center justify-center text-white p-4">
        <div className="text-red-500 text-lg">Erreur: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161313] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header (Mise en page centrée et plus compacte sur mobile) */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2 mx-auto">
            <Map className="w-6 h-6 sm:w-8 sm:h-8" />
            Carte d'insécurité
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Visualisez les alertes de sécurité en temps réel sur la carte interactive
          </p>
        </div>
        
        {/* Bouton pour ouvrir les filtres sur mobile */}
        <div className="lg:hidden flex justify-between items-center">
          <Button 
            variant="outline" 
            className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
            onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {isFilterSidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'}
          </Button>
          <p className="text-sm text-gray-400">
            {filteredAlertsCount} alerte(s) affichée(s)
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filters Sidebar - Conditionnel sur mobile */}
          <Card 
            className={`bg-[#201d1d] border-gray-800 shadow-xl fixed lg:static top-0 left-0 w-full h-full lg:h-auto lg:w-auto z-50 lg:z-auto overflow-y-auto transform transition-transform duration-300 ease-in-out ${
              isFilterSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } lg:col-span-1`}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Filter className="w-5 h-5" />
                  Filtres
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Filtrez les alertes par statut et urgence
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-white"
                onClick={() => setIsFilterSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Statut</Label>
                <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value as any); setSelectedGroup(null); }}>
                  <SelectTrigger className="bg-[#201d1d] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#201d1d] border-gray-700">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En validation</SelectItem>
                    <SelectItem value="confirmed">Confirmées</SelectItem>
                    <SelectItem value="fake">Fausses alertes</SelectItem>
                    <SelectItem value="resolved">Résolues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Urgence</Label>
                <Select value={filterUrgency} onValueChange={(value) => { setFilterUrgency(value as any); setSelectedGroup(null); }}>
                  <SelectTrigger className="bg-[#201d1d] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#201d1d] border-gray-700">
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="high">Urgent</SelectItem>
                    <SelectItem value="medium">Modéré</SelectItem>
                    <SelectItem value="low">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-white">Légende</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>En validation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Confirmée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Fausse alerte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Résolue</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700 text-center space-y-2">
                <p className="text-sm text-gray-400">
                  {filteredAlertsCount} alerte(s) affichée(s)
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                  onClick={handleCenterToUser}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Centrer sur ma position
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Cache le contenu principal lorsque la sidebar est ouverte sur mobile */}
          <div className={`${isFilterSidebarOpen ? 'hidden' : 'block'} lg:block lg:col-span-2 space-y-6`}>

            {/* Map Container - Hauteur ajustée pour mobile */}
            <Card className="bg-[#201d1d] border-gray-800 shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="h-[60vh] sm:h-96 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <MapCenterUpdater center={mapCenter} />
                    <MapEvents 
                      onAlertCreate={undefined} 
                      setCreateDialogOpen={setCreateDialogOpen}
                      setCreateCoords={setCreateCoords}
                    />
                    
                    {/* User Location Marker (Optionnel, non inclus dans la logique initiale mais bonne pratique) */}
                    {userLocation && (
                       <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={createCustomIcon('#3b82f6', 1)} // Icône bleue pour l'utilisateur
                      >
                        <Popup>Ma position</Popup>
                      </Marker>
                    )}

                    {filteredGroups.map((group) => (
                      <Marker
                        key={group.key}
                        position={group.position}
                        icon={group.icon}
                        eventHandlers={{
                          click: () => handleMarkerClick(group),
                        }}
                      >
                        <Popup className="bg-[#201d1d] text-white border-gray-800">
                          <div className="p-2 min-w-[200px]">
                            {group.alerts.length > 1 ? (
                              <>
                                <h4 className="font-semibold">Groupe d'alertes ({group.alerts.length})</h4>
                                <ul className="text-sm space-y-1 mt-1">
                                  {group.alerts.slice(0, 3).map((alert) => (
                                    <li key={alert.id} className="flex justify-between items-center">
                                      <span>{alert.reason}</span>
                                      <Badge variant="secondary" className={getUrgencyColor(alert.urgency)}>
                                        {alert.urgency === 'high' ? 'Urgent' : alert.urgency === 'medium' ? 'Modéré' : 'Info'}
                                      </Badge>
                                    </li>
                                  ))}
                                  {group.alerts.length > 3 && <li className="text-xs text-gray-400">... et {group.alerts.length - 3} de plus</li>}
                                </ul>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="mt-2 p-0 h-auto text-yellow-500 hover:text-yellow-600"
                                  onClick={() => handleMarkerClick(group)}
                                >
                                  Voir les détails
                                </Button>
                              </>
                            ) : (
                              <>
                                <h4 className="font-semibold">{group.alerts[0].reason}</h4>
                                <p className="text-sm text-gray-300">{group.alerts[0].location}</p>
                                <Badge className={`${getStatusColorClass(group.alerts[0].status)} text-white mt-1`}>
                                  {getStatusText(group.alerts[0].status)}
                                </Badge>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="mt-2 p-0 h-auto text-yellow-500 hover:text-yellow-600"
                                  onClick={() => handleMarkerClick(group)}
                                >
                                  Voir les détails
                                </Button>
                              </>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            {/* Alert Details - Style "Post" de carte plus visible */}
            {selectedGroup && (
              <Card className="bg-[#201d1d] border-gray-800 shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Détails de l'alerte
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm">
                        {selectedGroup.alerts.length > 1 ? 
                         `Alerte ${currentIndex + 1} sur ${selectedGroup.alerts.length} au même endroit` : 
                         `Informations complètes sur l'incident signalé`}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleCloseDetails}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-white pt-0">
                  {/* Contenu principal de l'alerte */}
                  <div className="border-b border-gray-700 pb-3 space-y-2">
                    <h4 className="font-bold text-xl mb-1">{currentAlert!.reason}</h4>
                    <p className="text-sm text-gray-300">{currentAlert!.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                       <Badge className={`${getStatusColorClass(currentAlert!.status)} text-white`}>
                         {getStatusText(currentAlert!.status)}
                       </Badge>
                       <Badge className={getUrgencyColor(currentAlert!.urgency)}>
                         {currentAlert!.urgency === 'high' ? 'Urgent' : currentAlert!.urgency === 'medium' ? 'Modéré' : 'Information'}
                       </Badge>
                    </div>
                  </div>

                  {/* Infos de l'alerte */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4 text-yellow-500" />
                      <span>**Lieu:** {currentAlert!.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span>**Signalé le:** {new Date(currentAlert!.createdAt).toLocaleString('fr-FR')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="font-medium">**Par:** {currentAlert!.author?.name || 'Utilisateur inconnu'}</span>
                      {currentAlert!.author?.hasCIN && <Shield className="w-4 h-4 text-blue-400" />}
                    </div>
                  </div>

                  {/* Navigation pour alertes multiples (plus de 1) */}
                  {selectedGroup.alerts.length > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePrevAlert}
                        disabled={currentIndex === 0}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Précédent
                      </Button>
                      <span className="text-sm text-gray-400">
                        {currentIndex + 1} / {selectedGroup.alerts.length}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleNextAlert}
                        disabled={currentIndex === selectedGroup.alerts.length - 1}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                      >
                        Suivant
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Boutons d'action (regroupés et adaptés au mobile) */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-700">
                    <Button 
                      variant="default"
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                      onClick={() => handleViewFullAlert(currentAlert!)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir alerte complète
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                      onClick={() => handleNavigateTo(currentAlert!)}
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

      {/* Create Alert Dialog - Aucun changement majeur dans la logique, juste le style */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-[#201d1d] border-gray-800 max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto" style={{ zIndex: 9999 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Créer une nouvelle alerte
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Signalez un incident de sécurité à cet emplacement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAlert} className="space-y-4 text-white">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-gray-300">Raison</Label>
              <select
                id="reason"
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                className="w-full bg-[#201d1d] border border-gray-700 text-white p-3 rounded focus:ring-yellow-500 focus:border-yellow-500"
                required
              >
                <option value="">Sélectionnez le type</option>
                <option value="agression">Agression</option>
                <option value="vol">Vol</option>
                <option value="harcelement">Harcèlement</option>
                <option value="accident">Accident</option>
                <option value="urgence_medicale">Urgence médicale</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Détails de l'incident..."
                className="bg-[#201d1d] border border-gray-700 text-white placeholder-gray-400 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-gray-300">Lieu précis</Label>
              <Input
                id="location"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                placeholder="Ex: Rue principale, quartier X"
                className="bg-[#201d1d] border border-gray-700 text-white placeholder-gray-400 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency" className="text-gray-300">Urgence</Label>
              <Select value={createForm.urgency} onValueChange={(value) => setCreateForm({ ...createForm, urgency: value as any })}>
                <SelectTrigger className="bg-[#201d1d] border-gray-700 text-white focus:ring-yellow-500 focus:border-yellow-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#201d1d] border-gray-700">
                  <SelectItem value="low">Information</SelectItem>
                  <SelectItem value="medium">Modéré</SelectItem>
                  <SelectItem value="high">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-yellow-500" />
              <span>Coordonnées: **{createCoords?.lat.toFixed(4)}, {createCoords?.lng.toFixed(4)}**</span>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto bg-gray-800 border-gray-700 hover:bg-gray-700">
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button type="submit" disabled={creating} className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-gray-900">
                <Send className="w-4 h-4 mr-2" />
                {creating ? 'Création...' : 'Créer l\'alerte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Full Alert Dialog - Design adapté aux commentaires */}
      <Dialog open={viewDialogOpen} onOpenChange={handleCloseView}>
        <DialogContent className="bg-[#201d1d] border-gray-800 max-w-sm sm:max-w-2xl max-h-[90vh] overflow-y-auto" style={{ zIndex: 9999 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {viewingAlert?.reason} - Détails complets
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Informations détaillées et commentaires
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-white">
            {viewingAlert && (
              <>
                {/* Section Alerte */}
                <div className="p-4 bg-gray-800 rounded-lg space-y-3">
                    <h3 className="font-bold text-lg">{viewingAlert.reason}</h3>
                    <p className="text-sm text-gray-300">{viewingAlert.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                       <Badge className={`${getStatusColorClass(viewingAlert.status)} text-white`}>
                         {getStatusText(viewingAlert.status)}
                       </Badge>
                       <Badge className={getUrgencyColor(viewingAlert.urgency)}>
                          {viewingAlert.urgency === 'high' ? 'Urgent' : viewingAlert.urgency === 'medium' ? 'Modéré' : 'Information'}
                       </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(viewingAlert.createdAt).toLocaleString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{viewingAlert.author?.name}</span>
                            {viewingAlert.author?.hasCIN && <Shield className="w-4 h-4 text-blue-400" />}
                        </div>
                    </div>
                </div>

                {/* Section Commentaires */}
                {loadingComments ? (
                  <p className="text-gray-400">Chargement des commentaires...</p>
                ) : (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                      <MessageCircle className="w-5 h-5 text-yellow-500" />
                      Commentaires ({alertComments.length})
                    </h4>
                    {alertComments.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {alertComments.map((comment: any) => (
                          <div key={comment.id} className="flex gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
                            <img
                              src={comment.user?.avatar || 'http://localhost:5005/uploads/icon-user.png'}
                              alt={comment.user?.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium text-sm">{comment.user?.name}</p>
                                <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString('fr-FR')}</p>
                              </div>
                              <p className="text-sm text-gray-300">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Soyez le premier à commenter cette alerte.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="default" onClick={handleCloseView} className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-gray-900">
              <X className="w-4 h-4 mr-2" />
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}