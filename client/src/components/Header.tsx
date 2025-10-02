import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Settings, User } from "lucide-react";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

interface HeaderProps {
  user?: { name: string; avatar?: string };
  onLogout?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
}

export default function Header({ user, onLogout, onProfile, onSettings }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* <img src={genZLogo} alt="Gasy Iray" className="w-10 h-10 rounded-lg" /> */}
          <div>
            <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-sans)]">Gasy Hub</h1>
            <p className="text-sm text-muted-foreground">Plateforme de Sécurité</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="w-5 h-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">En ligne</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onProfile} data-testid="link-profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSettings} data-testid="link-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Paramètres</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" data-testid="button-login">Connexion</Button>
              <Button data-testid="button-register">Créer un compte</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}