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
  Phone
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
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={genZLogo} alt="Gasy Iray" className="w-8 h-8 rounded-md" />
          <div>
            <h2 className="text-lg font-bold">Gasy Iray</h2>
            <p className="text-xs text-sidebar-foreground/70">Plateforme de Sécurité</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => setLocation(item.url)}
                    data-active={isActive(item.url)}
                    className="data-[active=true]:bg-sidebar-accent"
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => setLocation(item.url)}
                      data-active={isActive(item.url)}
                      className="data-[active=true]:bg-sidebar-accent"
                      data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  {user.hasCIN && (
                    <Shield className="w-3 h-3 text-green-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={user.hasCIN 
                      ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" 
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
                    }
                  >
                    {user.hasCIN ? 'Vérifié' : 'En attente'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 h-8"
                onClick={() => setLocation('/profile')}
                data-testid="button-sidebar-profile"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 h-8"
                onClick={onLogout}
                data-testid="button-sidebar-logout"
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