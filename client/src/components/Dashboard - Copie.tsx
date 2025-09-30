import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, AlertTriangle, Shield, Clock } from "lucide-react";
import AlertCard from "./AlertCard";
import SOSForm from "./SOSForm";
import type { Alert } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [showSOSForm, setShowSOSForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  // Fetch alerts from API
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    staleTime: 1000 * 60, // 1 minute
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (alertData: any) => apiRequest('POST', '/api/alerts', alertData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      setShowSOSForm(false);
    },
  });

  // Update alert status mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: string }) => 
      apiRequest('PATCH', `/api/alerts/${alertId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    },
  });

  // Validate alert mutation
  const validateAlertMutation = useMutation({
    mutationFn: ({ alertId, isConfirmed }: { alertId: string; isConfirmed: boolean }) => {
      return apiRequest('PATCH', `/api/alerts/${alertId}/validate`, { isConfirmed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    },
  });

  const handleValidation = (alertId: string, validation: 'confirm' | 'reject' | 'resolved', comment?: string) => {
    if (validation === 'resolved') {
      updateAlertMutation.mutate({
        alertId,
        status: 'resolved'
      });
    } else {
      validateAlertMutation.mutate({
        alertId,
        isConfirmed: validation === 'confirm'
      });
    }
  };

  const handleCreateAlert = (alertData: any) => {
    // Transform the form data to match API schema - authorId will be added by server
    const newAlert = {
      reason: alertData.reason || 'Autre',
      description: alertData.description,
      location: alertData.location,
      urgency: alertData.urgency || 'medium',
      // Don't send media as file object - convert to string or null
      media: alertData.media ? alertData.media.name : null,
    };
    
    createAlertMutation.mutate(newAlert);
  };

  const stats = {
    total: alerts.length,
    pending: alerts.filter((a: Alert) => a.status === 'pending').length,
    confirmed: alerts.filter((a: Alert) => a.status === 'confirmed').length,
    fake: alerts.filter((a: Alert) => a.status === 'fake').length
  };

  const filteredAlerts = alerts.filter((alert: Alert) => {
    return activeTab === 'all' || alert.status === activeTab;
  });

  // Helper function to format timestamp
  const formatTimestamp = (date: Date | string | null) => {
    if (!date) return 'Date inconnue';
    const alertDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - alertDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      return alertDate.toLocaleDateString('fr-FR');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des alertes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Alertes SOS</h1>
          <p className="text-muted-foreground">
            Valider les alertes de la communauté
          </p>
        </div>
        <Button 
          onClick={() => setShowSOSForm(true)}
          className="gap-2"
          data-testid="button-create-alert"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Alerte
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total alertes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.fake}</p>
                <p className="text-xs text-muted-foreground">Fausses alertes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" data-testid="filter-all">Toutes</TabsTrigger>
          <TabsTrigger value="pending" data-testid="filter-pending">En attente</TabsTrigger>
          <TabsTrigger value="confirmed" data-testid="filter-confirmed">Confirmées</TabsTrigger>
          <TabsTrigger value="fake" data-testid="filter-fake">Fausses</TabsTrigger>
          <TabsTrigger value="resolved" data-testid="filter-resolved">Résolues</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-4">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert: Alert) => {
                // Transform alert data to match AlertCard expectations
                const transformedAlert = {
                  id: alert.id,
                  reason: alert.reason,
                  description: alert.description,
                  location: alert.location,
                  status: alert.status as 'pending' | 'confirmed' | 'fake' | 'resolved',
                  urgency: alert.urgency as 'low' | 'medium' | 'high',
                  timestamp: formatTimestamp(alert.createdAt),
                  author: {
                    id: alert.authorId,
                    name: alert.authorId === 'usr_naina_001' ? 'Naina Razafy' : 
                          alert.authorId === 'usr_hery_002' ? 'Hery Andriana' : 'Miora Rakoto',
                    avatar: alert.authorId === 'usr_naina_001' ? 
                      'https://images.unsplash.com/photo-1494790108755-2616b169db2c?w=32&h=32&fit=crop&crop=face' : undefined,
                    hasCIN: alert.authorId === 'usr_naina_001'
                  },
                  validations: {
                    confirmed: parseInt(alert.confirmedCount || '0'),
                    rejected: parseInt(alert.rejectedCount || '0')
                  },
                  media: alert.media || undefined
                };

                return (
                  <AlertCard
                    key={alert.id}
                    alert={transformedAlert}
                    onValidate={handleValidation}
                    onViewDetails={(id) => console.log('View details:', id)}
                    currentUserId="usr_admin_001"
                    showActions={true}
                  />
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune alerte</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' 
                      ? "Aucune alerte n'a encore été créée."
                      : `Aucune alerte ${activeTab === 'pending' ? 'en attente' : 
                          activeTab === 'confirmed' ? 'confirmée' : 
                          activeTab === 'fake' ? 'fausse' : 'résolue'}.`
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* SOS Form Dialog */}
      <Dialog open={showSOSForm} onOpenChange={setShowSOSForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle alerte SOS</DialogTitle>
          </DialogHeader>
          <SOSForm 
            onSubmit={handleCreateAlert}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}