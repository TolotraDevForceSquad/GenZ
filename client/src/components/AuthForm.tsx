// client/src/components/AuthForm.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Phone, User, Lock, Mail, MapPin } from "lucide-react";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

type Location = {
  localisation: string;
  latitude: number;
  longitude: number;
  region: string;
};

const searchLocations = (query: string, locations: Location[]): Location[] => {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return locations.filter(location => 
    location.localisation.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
};

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: any) => void;
  onToggleMode: () => void;
  loading: boolean;
  error?: string | null;
}

export default function AuthForm({ mode, onSubmit, onToggleMode, loading, error }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    neighborhood: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    region: ''
  });
  const [suggestions, setSuggestions] = useState<Location[]>([]);

  // Charger les données de localisation
  useEffect(() => {
    const loadAllLocations = async () => {
      try {
        const madagascarData = await import(`./types/madagascars.json`);
        setAllLocations(madagascarData.default || madagascarData);
      } catch (error) {
        console.error('Erreur lors du chargement des données de localisation:', error);
        setAllLocations([]);
      }
    };

    loadAllLocations();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`${mode} form submitted:`, formData);
    
    if (!onSubmit) {
      console.error('onSubmit function is undefined');
      return;
    }
    
    // Validation des champs requis
    if (!formData.phone || !formData.password) {
      console.error('Phone or password is missing');
      return;
    }
    
    // Préparer les données selon le mode
    let submitData;
    
    if (mode === 'login') {
      // Pour le login: seulement phone et password
      submitData = { 
        phone: formData.phone, 
        password: formData.password 
      };
    } else {
      // Pour l'inscription: tous les champs avec valeurs par défaut si besoin
      submitData = {
        name: formData.name || `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        email: formData.email || '',
        phone: formData.phone,
        password: formData.password,
        neighborhood: formData.neighborhood || 'Non spécifié',
        latitude: formData.latitude,
        longitude: formData.longitude,
        region: formData.region || ''
      };
    }
    
    onSubmit(submitData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNeighborhoodChange = (value: string) => {
    handleChange('neighborhood', value);
    const newSuggestions = searchLocations(value, allLocations);
    setSuggestions(newSuggestions);
  };

  const selectLocation = (location: Location) => {
    setFormData(prev => ({
      ...prev,
      neighborhood: location.localisation,
      latitude: location.latitude,
      longitude: location.longitude,
      region: location.region
    }));
    setSuggestions([]);
  };

  const handleNeighborhoodBlur = () => {
    setTimeout(() => setSuggestions([]), 200);
  };

  return (
    // Fond noir profond
    <div className="min-h-screen flex items-center justify-center px-4 py-8 lg:py-16 bg-gray-950">
      {/* Carte: Fond sombre avec bordure/ombre dorée */}
      <Card className="w-full max-w-xl bg-gray-900 border-gray-800 text-white shadow-2xl transition duration-300">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {/* Logo avec glow */}
            {/* <div className={`p-1 rounded-lg bg-gradient-to-br from-yellow-400/80 to-amber-600/80 ${neonGoldShadow}`}>
              <img src={genZLogo} alt="Gasy Hub" className="w-16 h-16 rounded-lg border-2 border-gray-950" />
            </div> */}
          </div>
          <CardTitle className="text-3xl font-extrabold text-white">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {mode === 'login' 
              ? 'Connectez-vous à Gasy Hub' 
              : 'Rejoignez la communauté Gasy Hub'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* CHAMPS D'INSCRIPTION UNIQUEMENT (Horizontal sur Web) */}
            {mode === 'register' && (
              <>
                {/* Ligne 1: Nom complet & Email */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  
                  {/* Nom complet (optionnel) */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-yellow-400">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Votre nom complet"
                        className="pl-10 bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        data-testid="input-name"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Optionnel</p>
                  </div>

                  {/* Email (optionnel) */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-yellow-400">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        className="pl-10 bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Optionnel</p>
                  </div>
                </div>

                {/* Ligne 2: Prénom et Nom (Grid 2 colonnes sur toutes tailles) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-yellow-400">Prénom</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Prénom"
                      className="bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-yellow-400">Nom</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Nom"
                      className="bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </div>
                </div>

                {/* Quartier (Full width pour les suggestions) */}
                <div className="space-y-2 relative">
                  <Label htmlFor="neighborhood" className="text-yellow-400">Quartier/Localité</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="neighborhood"
                      type="text"
                      autoComplete="off"
                      placeholder="Recherchez votre quartier/localité"
                      className="pl-10 bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                      value={formData.neighborhood}
                      onChange={(e) => handleNeighborhoodChange(e.target.value)}
                      onBlur={handleNeighborhoodBlur}
                      data-testid="input-neighborhood"
                    />
                  </div>
                  {suggestions.length > 0 && formData.neighborhood && (
                    <ul className="absolute z-50 w-full bg-gray-700 border border-yellow-400/50 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                      {suggestions.map((location) => (
                        <li
                          key={location.localisation}
                          onClick={() => selectLocation(location)}
                          className="p-3 cursor-pointer hover:bg-yellow-400 hover:text-black text-sm border-b border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium text-white hover:text-black">{location.localisation}</div>
                          <div className="text-xs text-gray-400 hover:text-black">
                            {location.region} • Lat: {location.latitude}, Lng: {location.longitude}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-gray-500">
                    Recherchez votre quartier/localité dans Madagascar ({suggestions.length} résultats)
                  </p>
                </div>
              </>
            )}

            {/* CHAMPS COMMUNS: Téléphone et Mot de passe (Stacked pour la clarté) */}
            
            {/* Téléphone (requis) */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-yellow-400">
                Numéro de téléphone <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+261 32 12 34 567"
                  className="pl-10 bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  data-testid="input-phone"
                  required
                />
              </div>
            </div>

            {/* Mot de passe (requis) */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-yellow-400">
                Mot de passe <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white focus:border-yellow-400"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  data-testid="input-password"
                  required
                  minLength={4}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500 hover:text-yellow-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500 hover:text-yellow-400" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Minimum 4 caractères
              </p>
            </div>

            {/* Affichage d'erreur (Rouge pour l'urgence) */}
            {error && (
              <div className="text-sm text-red-400 bg-red-900/40 border border-red-400/50 p-3 rounded-md" data-testid="text-error">
                {error}
              </div>
            )}

            {/* Bouton de soumission (Bouton principal Jaune Doré) */}
            <Button 
              type="submit" 
              className={`w-full h-12 text-base font-bold bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg ${loading ? 'opacity-80' : ''}`} 
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? 'Chargement...' : (mode === 'login' ? 'SE CONNECTER' : 'CRÉER LE COMPTE')}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-400">
              {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
            </span>
            <Button 
              variant="ghost" 
              className="ml-2 h-auto p-0 text-sm text-yellow-400 hover:text-yellow-300 hover:bg-transparent"
              onClick={onToggleMode}
              data-testid="button-toggle-mode"
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}