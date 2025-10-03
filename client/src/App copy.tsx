// client/src/App.tsx - Version simplifiée : utilise user.id directement comme token (pas de localStorage pour token)
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth, AuthProvider } from "./hooks/use-auth";

// Pages
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";

// Components
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/components/Dashboard";
import ProfilePage from "@/components/ProfilePage";
import MapView from "@/components/MapView";
import AdminDashboard from "@/components/AdminDashboard";
import EmergencyContacts from "@/components/EmergencyContacts";
import LibDash from "./components/LibDash";
import React from "react"; // Ajouté pour React.CSSProperties

function AuthenticatedApp() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Données mock pour les alertes (remplace par API en prod)
  const alertsData = [
    {
      id: '1',
      reason: 'Agression',
      description: 'Tentative d\'agression à Analakely, individu s\'est enfui vers Andohalo.',
      location: 'Analakely, Antananarivo',
      coordinates: { lat: -18.8792, lng: 47.5079 },
      status: 'pending' as const,
      urgency: 'high' as const,
      timestamp: 'Il y a 15 minutes',
      author: { name: 'Naina Razafy', hasCIN: true }
    },
    {
      id: '2',
      reason: 'Vol',
      description: 'Vol de sac signalé près du marché d\'Andravoahangy.',
      location: 'Marché Andravoahangy, Antananarivo',
      coordinates: { lat: -18.8636, lng: 47.5159 },
      status: 'confirmed' as const,
      urgency: 'medium' as const,
      timestamp: 'Il y a 1 heure',
      author: { name: 'Hery Andriana', hasCIN: false }
    },
    {
      id: '3',
      reason: 'Harcèlement',
      description: 'Harcèlement signalé avenue de l\'Indépendance.',
      location: 'Avenue de l\'Indépendance, Antananarivo',
      coordinates: { lat: -18.9047, lng: 47.5216 },
      status: 'fake' as const,
      urgency: 'low' as const,
      timestamp: 'Il y a 3 heures',
      author: { name: 'Miora Rakoto', hasCIN: false }
    }
  ];

  // Fonction de login : utilise les données complètes de l'API (assure-toi que AuthPage passe {user, token})
  const handleLogin = (data: any) => {
    console.log('handleLogin called with:', data);

    if (!data) {
      console.error('Données utilisateur manquantes dans handleLogin');
      return;
    }

    let userData = data;
    if (data.user) {
      userData = data.user;
    }

    // Utilise les données complètes avec fallback pour construction manuelle si nécessaire
    const userToLogin: any = {
      ...userData,
      id: userData.id || `usr_${Date.now()}`,
      name: userData.name || userData.phone || 'Utilisateur',
      phone: userData.phone,
      isAdmin: userData.isAdmin || false,
      token: data.token || userData.id || userData.token, // Token = id ou depuis loginData
    };

    login(userToLogin);

    // Redirection intelligente
    if (userToLogin.isAdmin) {
      setLocation('/admin');
    } else {
      setLocation('/dashboard');
    }
  };

  const handleLogout = () => {
    // Efface le user du localStorage (assume que useAuth stocke sous 'user')
    localStorage.removeItem('user'); // Ajuste la clé si différente (ex. 'authUser')
    queryClient.clear();
    logout();
    setLocation('/');
    console.log('🔓 Déconnexion réussie');
  };

  const navigateToLogin = () => {
    setLocation('/login');
  };

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={() => <LandingPage onLogin={navigateToLogin} />} />
        <Route path="/login" component={() => <AuthPage mode="login" onLogin={handleLogin} />} />
        <Route path="/register" component={() => <AuthPage mode="register" onLogin={handleLogin} />} />
        <Route component={() => <LandingPage onLogin={navigateToLogin} />} />
      </Switch>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  // Token = user.id (disponible via useAuth, persistant via localStorage dans le hook)
  const authToken = user?.id || '';

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-zinc-900"> {/* Fond principal sombre */}
        <AppSidebar user={user!} onLogout={handleLogout} />
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Nouveau design du header : sombre, border néon */}
          {/* <header className="flex items-center justify-between p-4 border-b border-yellow-400/30 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 sticky top-0 z-10">
            <SidebarTrigger 
              data-testid="button-sidebar-toggle" 
              className="text-yellow-400 hover:text-white transition-colors" 
            />
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                Connecté en tant que <span className="font-medium text-white">{user?.name}</span>
                {user?.isAdmin && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-400 text-zinc-900 font-bold border-none">
                    ADMIN
                  </Badge>
                )}
              </span>
            </div>
          </header> */}

          <header className="flex items-center justify-between p-4 border-b border-yellow-400/30 bg-gray-950/90 backdrop-blur supports-[backdrop-filter]:bg-gray-950/80 sticky top-0 z-10">

            {/* Bouton Sidebar (Gauche) */}
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="text-yellow-400 hover:text-white transition-colors h-6 w-6 md:h-7 md:w-7" // Taille augmentée
            />

            {/* Section Utilisateur (Droite - Optimisée pour le responsive) */}
            <div className="flex items-center gap-3">

              {/* Conteneur d'information utilisateur avec style plat et glow discret */}
              <span className="flex items-center text-sm text-gray-400 p-2 rounded-lg bg-gray-900 border border-yellow-400/20 shadow-inner shadow-gray-800/50">

                {/* Texte de contexte : Masqué sur les petits écrans (sm:inline) */}
                <span className="hidden sm:inline mr-1 text-gray-400">Connecté en tant que</span>

                {/* Nom de l'utilisateur : Toujours visible, en surbrillance */}
                <span className="font-semibold text-white truncate max-w-[100px] sm:max-w-none">
                  {user?.name}
                </span>

                {/* Badge ADMIN : Design High Contrast Gold */}
                {user?.isAdmin && (
                  <Badge
                    variant="secondary"
                    // Classe ajustée pour un badge plus petit (h-5, text-xs) et plus lisible
                    className="ml-2 h-5 text-xs bg-yellow-400 text-gray-950 font-extrabold border-none"
                  >
                    ADMIN
                  </Badge>
                )}
              </span>
              {/* Vous pouvez ajouter ici un bouton d'avatar ou de notification si besoin, en respectant le gap-3 */}
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-zinc-900">
            <Switch>
              {/* Page d'accueil = on choisit quoi afficher */}
              <Route path="/">
                {user?.isAdmin ? <AdminDashboard /> : <Dashboard />}
              </Route>

              {/* Dashboard normal → accessible à tout le monde */}
              <Route path="/dashboard">
                <Dashboard />
              </Route>

              {/* Dashboard admin → protégé */}
              <Route path="/admin">
                {user?.isAdmin ? (
                  <AdminDashboard
                    onUserAction={(userId, action) => console.log('User action:', userId, action)}
                    onAlertAction={(alertId, action) => console.log('Alert action:', alertId, action)}
                  />
                ) : (
                  <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">ACCÈS REFUSÉ</h1>
                    <p className="text-zinc-400">
                      Vous n'avez pas les permissions pour accéder à cette page.
                    </p>
                    <Button
                      onClick={() => setLocation('/dashboard')}
                      className="mt-6 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-bold transition"
                    >
                      Retour au tableau de bord
                    </Button>
                  </div>
                )}
              </Route>

              {/* Autres pages */}
              <Route path="/profile">
                <ProfilePage token={authToken} />
              </Route>
              <Route path="/map">
                <MapView
                  alerts={alertsData}
                  onAlertClick={(alert) => console.log('Alert clicked:', alert)}
                  centerLocation={{ lat: -18.8792, lng: 47.5079 }}
                />
              </Route>
              <Route path="/emergency">
                <EmergencyContacts />
              </Route>
              <Route path="/liberation">
                <LibDash />
              </Route>

              {/* Not found */}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route component={AuthenticatedApp} />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-zinc-900 text-white"> {/* Fond d'application */}
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}