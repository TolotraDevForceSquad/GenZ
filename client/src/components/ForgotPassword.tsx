// client/src/components/ForgotPassword.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle } from "lucide-react";

export default function ForgotPassword() {
  const handleOpenMessenger = () => {
    // Ouvrir Messenger vers la page Facebook
    window.open('https://m.me/gasyhub2025', '_blank');
  };

  const handleBackToLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 lg:py-16 bg-gray-950">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800 text-white shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-yellow-400">
            Mot de passe oublié ?
          </CardTitle>
          <CardDescription className="text-gray-300 mt-2">
            Nous sommes là pour vous aider à récupérer votre compte
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Message principal */}
          <div className="text-center space-y-4">
            <p className="text-gray-300">
              Pour réinitialiser votre mot de passe, veuillez nous contacter directement sur Facebook.
            </p>
            
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <p className="text-sm text-blue-300 mb-3">
                Envoyez-nous un message sur notre page Facebook en cliquant sur le bouton ci-dessous :
              </p>
              
              {/* Bouton Messenger */}
              <Button
                onClick={handleOpenMessenger}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Ouvrir Messenger
              </Button>
            </div>

            <p className="text-xs text-gray-400">
              Ou visitez directement :{' '}
              <a 
                href="https://www.facebook.com/gasyhub2025" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 underline"
              >
                https://www.facebook.com/gasyhub2025
              </a>
            </p>
          </div>

          {/* Bouton retour */}
          <Button
            onClick={handleBackToLogin}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
          </Button>

          {/* Informations supplémentaires */}
          <div className="text-center text-xs text-gray-500 space-y-2">
            <p>Notre équipe vous répondra dans les plus brefs délais</p>
            <p>Heures de réponse : 8h - 18h (GMT+3)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}