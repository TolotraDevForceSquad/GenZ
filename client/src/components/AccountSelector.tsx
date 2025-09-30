import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown, User, ChevronRight } from "lucide-react";
import genZLogo from "@assets/genzlogo_1758921534790.jpeg";

interface AccountSelectorProps {
  onSelectAccount: (accountType: 'regular' | 'verified' | 'admin') => void;
}

export default function AccountSelector({ onSelectAccount }: AccountSelectorProps) {
  const accounts = [
    {
      type: 'regular' as const,
      title: 'Utilisateur Standard',
      description: 'Compte utilisateur normal avec accès aux fonctionnalités de base',
      user: {
        name: 'Hery Rasoamampianina',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b169db2c?w=64&h=64&fit=crop&crop=face',
        phone: '+261 34 12 345 67',
        hasCIN: false
      },
      features: [
        'Créer des alertes SOS',
        'Valider les alertes communautaires',
        'Consulter la carte d\'insécurité',
        'Gérer son profil'
      ],
      icon: User,
      iconColor: 'text-blue-500',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    {
      type: 'verified' as const,
      title: 'Utilisateur Vérifié',
      description: 'Compte avec CIN validé, alertes auto-confirmées',
      user: {
        name: 'Naina Rakotomalala',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
        phone: '+261 32 98 765 43',
        hasCIN: true
      },
      features: [
        'Toutes les fonctionnalités standard',
        'Alertes automatiquement confirmées',
        'Badge de vérification',
        'Priorité dans les validations'
      ],
      icon: Shield,
      iconColor: 'text-green-500',
      badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    {
      type: 'admin' as const,
      title: 'Administrateur',
      description: 'Accès complet à la gestion de la plateforme',
      user: {
        name: 'Miora Andriamampisoa',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face',
        phone: '+261 33 55 443 32',
        hasCIN: true,
        isAdmin: true
      },
      features: [
        'Toutes les fonctionnalités vérifiées',
        'Gestion des utilisateurs',
        'Modération des alertes',
        'Statistiques avancées'
      ],
      icon: Crown,
      iconColor: 'text-red-500',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src={genZLogo} alt="Gasy Iray" className="w-20 h-20 rounded-xl" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
            Demo Gasy Iray
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choisissez le type de compte pour accéder à la plateforme et découvrir les fonctionnalités
          </p>
        </div>

        {/* Account Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const Icon = account.icon;
            return (
              <Card 
                key={account.type} 
                className="hover-elevate cursor-pointer transition-all duration-200"
                onClick={() => onSelectAccount(account.type)}
                data-testid={`account-${account.type}`}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full bg-card-border flex items-center justify-center`}>
                      <Icon className={`w-8 h-8 ${account.iconColor}`} />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{account.title}</CardTitle>
                  <CardDescription className="text-sm">{account.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* User Preview */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={account.user.avatar} alt={account.user.name} />
                      <AvatarFallback>{account.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{account.user.name}</p>
                        {account.user.hasCIN && <Shield className="w-3 h-3 text-green-400" />}
                        {account.user.isAdmin && <Crown className="w-3 h-3 text-red-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{account.user.phone}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge className={account.badgeColor}>
                      {account.type === 'regular' && 'Standard'}
                      {account.type === 'verified' && 'Vérifié'}
                      {account.type === 'admin' && 'Administrateur'}
                    </Badge>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Fonctionnalités :</p>
                    <ul className="space-y-1">
                      {account.features.map((feature, index) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                          <ChevronRight className="w-3 h-3" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Access Button */}
                  <Button 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAccount(account.type);
                    }}
                  >
                    Accéder au compte
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Cette page de démonstration vous permet de tester les différents niveaux d'accès
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}