// client/src/components/AuthForm.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Eye, EyeOff, Phone, User, Lock, Mail, MapPin } from "lucide-react";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: any) => void;
  onToggleMode: () => void;
  loading: boolean;
  error?: string | null;
}

export default function AuthForm({ mode, onSubmit, onToggleMode, loading, error }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    neighborhood: ''
  });

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
        neighborhood: formData.neighborhood || 'Non spécifié'
      };
    }
    
    onSubmit(submitData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={genZLogo} alt="Gasy Iray" className="w-16 h-16 rounded-lg" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Connectez-vous à Gasy Iray' 
              : 'Rejoignez Gasy Iray'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Nom complet (optionnel) */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Votre nom complet"
                      className="pl-10"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      data-testid="input-name"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Optionnel - sera généré automatiquement si vide</p>
                </div>

                {/* Prénom et Nom (optionnels) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Prénom"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Nom"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </div>
                </div>

                {/* Email (optionnel) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Optionnel</p>
                </div>

                {/* Quartier (optionnel) */}
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Quartier</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="neighborhood"
                      type="text"
                      placeholder="Votre quartier"
                      className="pl-10"
                      value={formData.neighborhood}
                      onChange={(e) => handleChange('neighborhood', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Optionnel</p>
                </div>
              </>
            )}

            {/* Téléphone (requis) */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Numéro de téléphone <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+261 32 12 34 567"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  data-testid="input-phone"
                  required
                />
              </div>
            </div>

            {/* Mot de passe (requis) */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
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
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 4 caractères
              </p>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : 'Créer le compte')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
            </span>
            <Button 
              variant="ghost" 
              className="ml-2 h-auto p-0 text-sm"
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