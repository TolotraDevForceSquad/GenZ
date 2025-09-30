import AuthForm from "@/components/AuthForm";
import { useLocation } from "wouter";
import { useState } from "react";

interface AuthPageProps {
  mode: 'login' | 'register';
  onLogin?: (data: any) => void;
}

export default function AuthPage({ mode, onLogin }: AuthPageProps) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const handleSubmit = async (data: any) => {
  //   setLoading(true);
  //   setError(null);
  //   console.log('Auth submitted:', data);

  //   try {
  //     // Appel API réel pour l'authentification
  //     const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
  //     const response = await fetch(endpoint, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(data),
  //     });

  //     const result = await response.json();

  //     if (!response.ok) {
  //       throw new Error(result.error || 'Erreur d\'authentification');
  //     }

  //     if (result.success) {
  //       // Stocker l'utilisateur dans le state/localStorage si nécessaire
  //       if (onLogin) {
  //         onLogin(result.user);
  //       }

  //       // Rediriger vers la page indiquée par le serveur
  //       if (result.redirectTo) {
  //         console.log('Redirection vers:', result.redirectTo);
  //         setLocation(result.redirectTo);
  //       } else {
  //         // Fallback vers le dashboard
  //         setLocation('/dashboard');
  //       }
  //     }
  //   } catch (error: any) {
  //     console.error('Auth error:', error);
  //     setError(error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    console.log('Auth submitted:', data);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur d\'authentification');
      }

      if (result) {
        if (mode === 'register') {
          // Après l'inscription, rediriger vers login
          setLocation('/login');
          return; // on stoppe ici pour ne pas exécuter le reste
        }

        // Mode login
        if (onLogin) onLogin(result.user);
        setLocation(result.redirectTo || '/dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode={mode}
      onSubmit={handleSubmit}
      onToggleMode={() => setLocation(mode === 'login' ? '/register' : '/login')}
      loading={loading}
      error={error}
    />
  );
  
}