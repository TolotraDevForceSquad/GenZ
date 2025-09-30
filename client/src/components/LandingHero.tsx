import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, MapPin, AlertTriangle } from "lucide-react";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

interface LandingHeroProps {
  onLogin?: () => void;
  onRegister?: () => void;
}

export default function LandingHero({ onLogin, onRegister }: LandingHeroProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <img src={genZLogo} alt="Gasy Iray" className="w-24 h-24 rounded-xl" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
            Gasy Iray
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Plateforme communautaire de sécurité. Signalez, validez et restez informés des alertes dans votre zone.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = '/demo'}
              data-testid="button-demo-hero"
            >
              Accéder à la démo
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 h-auto backdrop-blur-sm"
              onClick={onLogin}
              data-testid="button-login-hero"
            >
              Connexion
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="hover-elevate">
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sécurité Vérifiée</h3>
              <p className="text-sm text-muted-foreground">
                Système de validation communautaire pour des alertes fiables
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Communauté Active</h3>
              <p className="text-sm text-muted-foreground">
                Rejoignez une communauté engagée pour la sécurité de tous
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate">
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Géolocalisation</h3>
              <p className="text-sm text-muted-foreground">
                Carte interactive des zones d'insécurité en temps réel
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Alertes SOS</h3>
              <p className="text-sm text-muted-foreground">
                Signalement rapide avec validation automatique pour les utilisateurs vérifiés
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à rejoindre la communauté ?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Commencez dès maintenant et contribuez à la sécurité de votre quartier
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 h-auto"
            onClick={() => window.location.href = '/demo'}
            data-testid="button-join-community"
          >
            Découvrir la démo
          </Button>
        </div>
      </div>
    </div>
  );
}