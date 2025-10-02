
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Shield, MapPin, Camera, Send, Search, Calendar, UserCheck } from "lucide-react";
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
    personName: '',
    personDescription: '',
    arrestDescription: '',
    location: '',
    arrestDate: new Date().toISOString().split('T')[0], // Date du jour par défaut
    arrestedBy: '',
    validation: false,
    personImage: null as File | null,
    arrestVideo: null as File | null,
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

  const handlePersonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, personImage: file }));
  };

  const handleArrestVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, arrestVideo: file }));
  };

  const handleValidationChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, validation: checked }));
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-500" />
          <div>
            <CardTitle className="text-xl">Signaler une demande de libération</CardTitle>
            <CardDescription>
              Fournissez les détails pour aider à libérer la personne arrêtée
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personName">Nom de la personne</Label>
            <Input
              id="personName"
              placeholder="Nom complet de la personne arrêtée"
              value={formData.personName}
              onChange={(e) => setFormData(prev => ({ ...prev, personName: e.target.value }))}
              data-testid="input-personName"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personDescription">Description de la personne</Label>
            <Textarea
              id="personDescription"
              placeholder="Âge, apparence physique, vêtements portés..."
              value={formData.personDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, personDescription: e.target.value }))}
              data-testid="input-personDescription"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrestDescription">Description de l'arrestation</Label>
            <Textarea
              id="arrestDescription"
              placeholder="Circonstances de l'arrestation et demande de libération..."
              value={formData.arrestDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, arrestDescription: e.target.value }))}
              data-testid="input-arrestDescription"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localisation de l'arrestation</Label>
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
            <Label htmlFor="arrestDate">Date de l'arrestation</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="arrestDate"
                type="date"
                className="pl-10"
                value={formData.arrestDate}
                onChange={(e) => setFormData(prev => ({ ...prev, arrestDate: e.target.value }))}
                data-testid="input-arrestDate"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrestedBy">Emmené par</Label>
            <Input
              id="arrestedBy"
              placeholder="Ex: Police Nationale, Gendarmerie..."
              value={formData.arrestedBy}
              onChange={(e) => setFormData(prev => ({ ...prev, arrestedBy: e.target.value }))}
              data-testid="input-arrestedBy"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Checkbox
                id="validation"
                checked={formData.validation}
                onCheckedChange={handleValidationChange}
                data-testid="checkbox-validation"
              />
              <span>Marquer comme validé initialement</span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personImage">Photo de la personne (obligatoire)</Label>
            <Input
              id="personImage"
              type="file"
              accept="image/*"
              onChange={handlePersonImageChange}
              className="flex-1"
              data-testid="input-personImage"
              required
            />
            {formData.personImage && (
              <p className="text-sm text-muted-foreground">
                Fichier sélectionné: {formData.personImage.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrestVideo">Vidéo d'arrestation (optionnel)</Label>
            <Input
              id="arrestVideo"
              type="file"
              accept="video/*"
              onChange={handleArrestVideoChange}
              className="flex-1"
              data-testid="input-arrestVideo"
            />
            {formData.arrestVideo && (
              <p className="text-sm text-muted-foreground">
                Fichier sélectionné: {formData.arrestVideo.name}
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