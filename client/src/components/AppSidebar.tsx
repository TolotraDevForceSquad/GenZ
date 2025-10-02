import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  AlertTriangle, 
  MapPin, 
  User, 
  Shield, 
  LogOut,
  Settings,
  Phone,
  Unlock
} from "lucide-react";
import { useLocation } from "wouter";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

interface AppSidebarProps {
  user?: {
    name: string;
    avatar?: string;
    hasCIN: boolean;
    isAdmin?: boolean;
  };
  onLogout?: () => void;
}

export default function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  const mainItems = [
    {
      title: "Alertes",
      url: "/dashboard",
      icon: AlertTriangle,
    },
    {
      title: "Carte",
      url: "/map",
      icon: MapPin,
    },
    {
      title: "Contacts Urgence",
      url: "/emergency",
      icon: Phone,
    },
    {
      title: "Mon Profil",
      url: "/profile",
      icon: User,
    },
    {
      title: "SOS Liberation",
      url: "/liberation",
      icon: Unlock,
    }
  ];

  const adminItems = user?.isAdmin ? [
    {
      title: "Administration",
      url: "/admin",
      icon: Shield,
    },
  ] : [];

  const isActive = (path: string) => location === path;

  return (
    <Sidebar className="bg-zinc-900 border-r border-zinc-800 text-white">
      <SidebarHeader className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          {/* <img src={genZLogo} alt="Gasy Iray" className="w-8 h-8 rounded-full border-2 border-red-400 p-0.5" /> */}
          <div>
            <h2 className="text-lg font-extrabold text-red-400">Gasy Hub</h2>
            <p className="text-xs text-zinc-400 font-mono">SECURE PLATFORM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 space-y-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-zinc-500 font-semibold p-2">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => setLocation(item.url)}
                    data-active={isActive(item.url)}
                    className="w-full justify-start gap-3 text-white hover:bg-zinc-800 transition-colors duration-200 
                               data-[active=true]:bg-red-400 data-[active=true]:text-zinc-900 
                               data-[active=true]:font-bold group"
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="w-5 h-5 group-data-[active=true]:text-zinc-900 text-red-400 group-hover:text-red-300 group-data-[active=true]:group-hover:text-zinc-900" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-zinc-500 font-semibold p-2">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => setLocation(item.url)}
                      data-active={isActive(item.url)}
                      className="w-full justify-start gap-3 text-white hover:bg-zinc-800 transition-colors duration-200 
                                 data-[active=true]:bg-red-400 data-[active=true]:text-zinc-900 
                                 data-[active=true]:font-bold group"
                      data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <item.icon className="w-5 h-5 group-data-[active=true]:text-zinc-900 text-red-400 group-hover:text-red-300 group-data-[active=true]:group-hover:text-zinc-900" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-800 p-4">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-red-400 p-0.5">
                <AvatarImage src={user.avatar || "http://localhost:5005/uploads/icon-user.png"} alt={user.name} />
                <AvatarFallback className="bg-zinc-700 text-red-400 font-bold">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                  {user.hasCIN && (
                    <Shield className="w-3.5 h-3.5 text-green-400 fill-green-400/20 flex-shrink-0" title="Vérifié CIN" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge 
                    className={user.hasCIN 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium" 
                      : "bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium"
                    }
                  >
                    {user.hasCIN ? 'ID. Vérifiée' : 'Non Vérifiée'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 border-t border-zinc-800 pt-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 h-8 bg-zinc-800/50 hover:bg-zinc-800 text-white hover:text-red-400 transition"
                onClick={() => setLocation('/profile')}
                data-testid="button-sidebar-profile"
                title="Paramètres du Profil"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 h-8 bg-zinc-800/50 hover:bg-zinc-800 text-white hover:text-red-500 transition"
                onClick={onLogout}
                data-testid="button-sidebar-logout"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}