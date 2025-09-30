import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { AlertTriangle, MapPin, Camera, Send, Search } from "lucide-react";
import { searchLocations } from "./types/locationsData"; // ✅ AJOUT: Import de la fonction de recherche

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  district: string;
}

interface SOSFormProps {
  onSubmit?: (data: any) => void;
  onClose?: () => void;
  loading?: boolean;
}

export default function SOSForm({ onSubmit, onClose, loading }: SOSFormProps) {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    location: '',
    latitude: '',
    longitude: '', // ✅ AJOUT: Champs pour lat/lng
    media: null as File | null,
    urgency: 'medium'
  });
  const [locationQuery, setLocationQuery] = useState(''); // ✅ AJOUT: État pour la recherche de localisation
  const [locationSuggestions, setLocationSuggestions] = useState<Location[]>([]); // ✅ AJOUT: Suggestions
  const [showSuggestions, setShowSuggestions] = useState(false); // ✅ AJOUT: Affichage des suggestions

  // ✅ AJOUT: Gestion de la recherche de localisation
  const handleLocationSearch = (query: string) => {
    setLocationQuery(query);
    if (query.length >= 2) {
      const suggestions = searchLocations(query, 10);
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // ✅ AJOUT: Sélection d'une suggestion
  const handleLocationSelect = (location: Location) => {
    setFormData(prev => ({
      ...prev,
      location: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString()
    }));
    setLocationQuery(location.name);
    setShowSuggestions(false);
  };

  // ✅ AJOUT: Masquer les suggestions sur clic extérieur (simplifié)
  const handleLocationInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SOS form submitted:', formData);
    onSubmit?.(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, media: file }));
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <div>
            <CardTitle className="text-xl">Signaler une alerte SOS</CardTitle>
            <CardDescription>
              Décrivez la situation pour alerter la communauté
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Type d'incident</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger data-testid="select-reason">
                <SelectValue placeholder="Sélectionnez le type d'incident" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agression">Agression</SelectItem>
                <SelectItem value="vol">Vol/Cambriolage</SelectItem>
                <SelectItem value="harcelement">Harcèlement</SelectItem>
                <SelectItem value="accident">Accident</SelectItem>
                <SelectItem value="urgence_medicale">Urgence médicale</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description détaillée</Label>
            <Textarea
              id="description"
              placeholder="Décrivez ce qui s'est passé..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              data-testid="input-description"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localisation</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                type="text"
                placeholder="Recherchez un quartier ou lieu à Antananarivo..."
                className="pl-10"
                value={locationQuery || formData.location}
                onChange={(e) => {
                  const query = e.target.value;
                  handleLocationSearch(query);
                  if (!showSuggestions) {
                    setFormData(prev => ({ ...prev, location: '' })); // Reset si nouvelle recherche
                  }
                }}
                onFocus={() => locationQuery.length >= 2 && setShowSuggestions(true)}
                onBlur={handleLocationInputBlur}
                data-testid="input-location"
                required
              />
              {/* ✅ AJOUT: Dropdown des suggestions */}
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-gray-700 cursor-pointer text-sm text-gray-300 border-b border-gray-700 last:border-b-0"
                      onClick={() => handleLocationSelect(suggestion)}
                    >
                      <div className="font-medium">{suggestion.name}</div>
                      <div className="text-xs text-gray-500">{suggestion.district}</div>
                    </div>
                  ))}
                </div>
              )}
              {showSuggestions && locationSuggestions.length === 0 && locationQuery.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-3 text-sm text-gray-400">
                  Aucune localisation trouvée pour "{locationQuery}"
                </div>
              )}
            </div>
            {formData.location && !showSuggestions && (
              <p className="text-xs text-muted-foreground mt-1">
                Localisation sélectionnée: {formData.location}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Niveau d'urgence</Label>
            <Select 
              value={formData.urgency} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
            >
              <SelectTrigger data-testid="select-urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible - Information préventive</SelectItem>
                <SelectItem value="medium">Moyen - Attention requise</SelectItem>
                <SelectItem value="high">Élevé - Danger immédiat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Photo/Vidéo (optionnel)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="media"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="flex-1"
                data-testid="input-media"
              />
              <Button type="button" variant="outline" size="icon">
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            {formData.media && (
              <p className="text-sm text-muted-foreground">
                Fichier sélectionné: {formData.media.name}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loading}
              data-testid="button-submit-sos"
            >
              {loading ? 'Envoi...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Signaler
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}