import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Shield, Users } from "lucide-react";
import { useState } from "react";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'police' | 'gendarmerie' | 'emergency';
  province: string;
  area?: string;
}

const emergencyContacts: EmergencyContact[] = [
  // Numéros nationaux d'urgence
  { id: 'nat1', name: 'Police Urgence', phone: '017', type: 'emergency', province: 'National' },
  { id: 'nat2', name: 'Urgence Générale', phone: '117', type: 'emergency', province: 'National' },
  { id: 'nat3', name: 'Urgence Mobile', phone: '119', type: 'emergency', province: 'National' },
  
  // ANTANANARIVO
  { id: 'tana1', name: 'Gendarmerie Aéroport Ivato', phone: '+261 34 14 005 53', type: 'gendarmerie', province: 'Antananarivo', area: 'Ivato' },
  { id: 'tana2', name: 'Brigade Ambohidratrimo', phone: '+261 34 05 700 78', type: 'gendarmerie', province: 'Antananarivo', area: 'Ambohidratrimo' },
  { id: 'tana3', name: 'Brigade Andoharanofotsy', phone: '+261 34 05 700 84', type: 'gendarmerie', province: 'Antananarivo', area: 'Andoharanofotsy' },
  { id: 'tana4', name: 'Brigade Betongolo', phone: '+261 34 14 006 50', type: 'gendarmerie', province: 'Antananarivo', area: 'Betongolo' },
  { id: 'tana5', name: 'Brigade Fenoarivo', phone: '+261 34 14 009 56', type: 'gendarmerie', province: 'Antananarivo', area: 'Fenoarivo' },
  { id: 'tana6', name: 'Brigade Itaosy', phone: '+261 34 14 009 55', type: 'gendarmerie', province: 'Antananarivo', area: 'Itaosy' },
  { id: 'tana7', name: 'Brigade Sabotsy Namehana', phone: '+261 34 14 009 52', type: 'gendarmerie', province: 'Antananarivo', area: 'Sabotsy Namehana' },
  { id: 'tana8', name: 'État-Major Groupement', phone: '+261 20 22 223 02', type: 'gendarmerie', province: 'Antananarivo' },
  { id: 'tana9', name: 'Police Centrale', phone: '+261 20 22 227 36', type: 'police', province: 'Antananarivo' },
  { id: 'tana10', name: 'Commissariat Antanimora', phone: '+261 20 22 409 74', type: 'police', province: 'Antananarivo', area: 'Antanimora' },
  { id: 'tana11', name: 'Brigade Criminelle', phone: '+261 20 22 204 66', type: 'police', province: 'Antananarivo' },
  { id: 'tana12', name: 'Commissariat Tsaralalàna', phone: '+261 20 22 227 35', type: 'police', province: 'Antananarivo', area: 'Tsaralalàna' },
  { id: 'tana13', name: 'Sécurité Publique Anosy', phone: '+261 20 22 284 33', type: 'police', province: 'Antananarivo', area: 'Anosy' },
  { id: 'tana14', name: 'Unité Spéciale Aéroport', phone: '+261 20 22 444 27', type: 'police', province: 'Antananarivo', area: 'Aéroport Ivato' },
  { id: 'tana15', name: 'Bureau Accidents Route', phone: '+261 34 05 517 24', type: 'police', province: 'Antananarivo' },
  
  // FIANARANTSOA
  { id: 'fian1', name: 'Gendarmerie Tsaramandroso', phone: '+261 20 75 510 06', type: 'gendarmerie', province: 'Fianarantsoa', area: 'Tsaramandroso' },
  
  // TOAMASINA
  { id: 'toam1', name: 'Gendarmerie Sainte-Marie', phone: '+261 34 71 171 07', type: 'gendarmerie', province: 'Toamasina', area: 'Sainte-Marie' },
  
  // MAHAJANGA
  { id: 'maja1', name: 'Service Sécurité', phone: '+261 228 72', type: 'police', province: 'Mahajanga' },
  
  // ANTSIRANANA
  { id: 'ants1', name: 'Service Sécurité', phone: '+261 227 00', type: 'police', province: 'Antsiranana' },
  
  // TOLIARA
  { id: 'toli1', name: 'Service Sécurité', phone: '+261 414 59', type: 'police', province: 'Toliara' },
  { id: 'toli2', name: 'Commissariat Fort-Dauphin', phone: '+261 34 05 526 97', type: 'police', province: 'Toliara', area: 'Fort-Dauphin' },
  
  // CONTACTS NATIONAUX
  { id: 'hq1', name: 'QG Gendarmerie Nationale', phone: '+261 34 14 005 15', type: 'gendarmerie', province: 'National' }
];

const provinces = ['National', 'Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Antsiranana', 'Toliara'];

export default function EmergencyContacts() {
  const [selectedProvince, setSelectedProvince] = useState('National');

  const filteredContacts = emergencyContacts.filter(contact => 
    selectedProvince === 'National' ? contact.province === 'National' : contact.province === selectedProvince
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'gendarmerie': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'police': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <Phone className="w-4 h-4" />;
      case 'gendarmerie': return <Shield className="w-4 h-4" />;
      case 'police': return <Users className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'emergency': return 'Urgence';
      case 'gendarmerie': return 'Gendarmerie';
      case 'police': return 'Police';
      default: return 'Contact';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-4">
          <Phone className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Contacts d'Urgence</h1>
            <p className="text-muted-foreground">Police et Gendarmerie par province</p>
          </div>
        </div>

        {/* Sélecteur de province */}
        <div className="flex flex-wrap gap-2">
          {provinces.map(province => (
            <Button
              key={province}
              variant={selectedProvince === province ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedProvince(province)}
              data-testid={`button-province-${province.toLowerCase()}`}
            >
              <MapPin className="w-3 h-3 mr-1" />
              {province}
            </Button>
          ))}
        </div>
      </div>

      {/* Liste des contacts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredContacts.map(contact => (
          <Card key={contact.id} className="hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(contact.type)}>
                    {getTypeIcon(contact.type)}
                    <span className="ml-1">{getTypeText(contact.type)}</span>
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg">{contact.name}</CardTitle>
              {contact.area && (
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {contact.area}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-semibold">{contact.phone}</span>
                  <Button
                    size="sm"
                    onClick={() => window.open(`tel:${contact.phone}`, '_self')}
                    data-testid={`button-call-${contact.id}`}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Appeler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucun contact disponible pour cette province.
        </div>
      )}
    </div>
  );
}