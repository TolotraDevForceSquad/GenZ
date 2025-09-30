// client/src/App.tsx
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

function AuthenticatedApp() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Real alerts data for map - would come from API in production
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

  // ✅ CORRECTION: Fonction de login avec redirection intelligente
  const handleLogin = (userData: any) => {
    console.log('handleLogin called with:', userData);
    
    if (!userData) {
      console.error('userData is undefined in handleLogin');
      return;
    }

    // Transformer les données du formulaire en objet User
    const user: any = {
      id: userData.id || `usr_${Date.now()}`,
      name: userData.name || userData.phone || 'Utilisateur',
      phone: userData.phone,
      isAdmin: userData.isAdmin || false
    };
    
    login(user);
    
    // ✅ CORRECTION: Rediriger vers admin si l'utilisateur est admin
    if (user.isAdmin) {
      setLocation('/admin');
    } else {
      setLocation('/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  const navigateToLogin = () => {
    setLocation('/login');
  };

  // Si pas connecté, afficher les pages publiques
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

  // ✅ CORRECTION: Vérifier si l'utilisateur est admin pour la sidebar
  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user!} onLogout={handleLogout} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Connecté en tant que <span className="font-medium">{user?.name}</span>
                {user?.isAdmin && (
                  <Badge variant="secondary" className="ml-2 bg-blue-500 text-white">
                    Admin
                  </Badge>
                )}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={user?.isAdmin ? AdminDashboard : Dashboard} />
              <Route path="/dashboard">
                {user?.isAdmin ? <AdminDashboard /> : <Dashboard />}
              </Route>
              <Route path="/profile">
                <ProfilePage 
                  user={user!}
                  onUpdateProfile={(data) => console.log('Update profile:', data)}
                  onUploadCIN={(file) => console.log('Upload CIN:', file.name)}
                  onUploadAvatar={(file) => console.log('Upload avatar:', file.name)}
                />
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
              <Route path="/admin">
                {user?.isAdmin ? (
                  <AdminDashboard 
                    onUserAction={(userId, action) => console.log('User action:', userId, action)}
                    onAlertAction={(alertId, action) => console.log('Alert action:', alertId, action)}
                  />
                ) : (
                  <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Accès refusé</h1>
                    <p className="text-muted-foreground">Vous n'avez pas les permissions pour accéder à cette page.</p>
                    <Button onClick={() => setLocation('/dashboard')} className="mt-4">
                      Retour au tableau de bord
                    </Button>
                  </div>
                )}
              </Route>
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
          <div className="min-h-screen bg-background text-foreground">
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}