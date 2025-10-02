import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, MapPin, AlertTriangle } from "lucide-react";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

interface LandingHeroProps {
  onLogin?: () => void;
  onRegister?: () => void;
}

export default function LandingHero({ onLogin, onRegister }: LandingHeroProps) {
  // Définition de l'ombre néon jaune doré pour réutilisation
  const neonGoldShadow = "shadow-[0_0_15px_rgba(251,191,36,0.5)]";

  return (
    // Conteneur principal: Fond noir très profond (maximise le contraste)
    <div className="min-h-screen bg-gray-950 transition duration-500">
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
        
        {/* Section Hero */}
        <div className="text-center mb-16 md:mb-24">
          
          {/* Logo avec Glow Jaune Doré */}
          
          
          {/* Titre Principal avec Dégradé Jaune Doré */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-white">
            {/* <span className="block text-gray-100">Sécurité Communautaire</span> */}
            <span className="block text-gray-100">Gasy Miray Hina</span>
            {/* Dégradé Golden Yellow pour l'effet lumineux */}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Gasy Hub</span>
          </h1>
          
          {/* Sous-titre */}
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Plateforme de sécurité collaborative. <b>Signalez immédiatement</b>, validez les alertes et sécurisez votre quartier en temps réel.
          </p>
          
          {/* Boutons CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Bouton Principal: Jaune Doré avec texte Noir (HAUTE VISIBILITÉ) */}
            <Button
              onClick={onRegister}
              size="lg"
              className={`text-base h-12 px-8 font-bold bg-yellow-400 hover:bg-yellow-500 text-black ${neonGoldShadow} shadow-yellow-400/50 transition transform hover:-translate-y-0.5`}
            >
              Créer un compte Gratuit
            </Button>
            {/* Bouton Secondaire: Dark avec bordure Jaune Doré */}
            <Button
              onClick={onLogin}
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 font-semibold bg-gray-900 hover:bg-gray-800 border-yellow-400 text-yellow-400 hover:text-white transition"
            >
              J'ai déjà un compte
            </Button>
          </div>
        </div>

        {/* Section Fonctionnalités (Responsive Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-24">
          
          {/* Carte 1: Utilisateurs Vérifiés (Vert Émeraude) */}
          <Card className={`transition duration-300 p-4 bg-gray-900 border-gray-800 shadow-xl hover:shadow-2xl hover:${neonGoldShadow} hover:border-yellow-400/50`}>
            <CardContent className="p-4 md:p-6 text-center">
              <Shield className="w-10 h-10 md:w-12 md:h-12 text-emerald-400 mx-auto mb-4 bg-emerald-500/20 p-2 rounded-xl" />
              <h3 className="text-lg font-bold mb-2 text-white">Vérification CIN</h3>
              <p className="text-sm text-gray-300">
                Validation d'identité pour assurer la fiabilité des signalements.
              </p>
            </CardContent>
          </Card>
          
          {/* Carte 2: Communauté (Jaune Doré - Couleur principale) */}
          <Card className={`transition duration-300 p-4 bg-gray-900 border-gray-800 shadow-xl hover:shadow-2xl hover:${neonGoldShadow} hover:border-yellow-400/50`}>
            <CardContent className="p-4 md:p-6 text-center">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 mx-auto mb-4 bg-yellow-500/20 p-2 rounded-xl" />
              <h3 className="text-lg font-bold mb-2 text-white">Communauté</h3>
              <p className="text-sm text-gray-300">
                Rejoignez une communauté engagée pour la sécurité de tous.
              </p>
            </CardContent>
          </Card>
          
          {/* Carte 3: Géolocalisation (Orange Ambre) */}
          <Card className={`transition duration-300 p-4 bg-gray-900 border-gray-800 shadow-xl hover:shadow-2xl hover:${neonGoldShadow} hover:border-yellow-400/50`}>
            <CardContent className="p-4 md:p-6 text-center">
              <MapPin className="w-10 h-10 md:w-12 md:h-12 text-orange-400 mx-auto mb-4 bg-orange-500/20 p-2 rounded-xl" />
              <h3 className="text-lg font-bold mb-2 text-white">Carte en Temps Réel</h3>
              <p className="text-sm text-gray-300">
                Visualisation interactive des alertes et des zones d'insécurité.
              </p>
            </CardContent>
          </Card>
          
          {/* Carte 4: Alertes SOS (Rouge Rose) */}
          <Card className={`transition duration-300 p-4 bg-gray-900 border-gray-800 shadow-xl hover:shadow-2xl hover:${neonGoldShadow} hover:border-yellow-400/50`}>
            <CardContent className="p-4 md:p-6 text-center">
              <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-rose-400 mx-auto mb-4 bg-rose-500/20 p-2 rounded-xl" />
              <h3 className="text-lg font-bold mb-2 text-white">Alertes SOS</h3>
              <p className="text-sm text-gray-300">
                Signalement ultra-rapide avec validation pour les utilisateurs vérifiés.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section Final
        <div className={`text-center p-8 md:p-12 bg-gray-900 rounded-2xl border border-yellow-400/50 shadow-[0_0_20px_rgba(251,191,36,0.6)]`}>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white">
            Prêt à devenir un acteur de la sécurité ?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
            Rejoignez-nous et contribuez à faire de votre quartier un endroit plus sûr. Votre participation fait la différence.
          </p>
          <Button
            onClick={onRegister}
            size="xl"
            className="h-14 px-10 text-xl font-bold bg-yellow-400 hover:bg-yellow-500 text-black shadow-xl shadow-yellow-400/50 transition transform hover:-translate-y-1"
          >
            S'inscrire Maintenant
          </Button>
        </div> */}
      </div>
    </div>
  );
}