import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  AlertTriangle, 
  Shield, 
  Ban, 
  UserCheck, 
  Search, 
  MoreHorizontal,
  Trash2,
  UserX,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminDashboardProps {
  onUserAction?: (userId: string, action: string) => void;
  onAlertAction?: (alertId: string, action: string) => void;
}

export default function AdminDashboard({ onUserAction, onAlertAction }: AdminDashboardProps) {
  const [searchUsers, setSearchUsers] = useState('');
  const [searchAlerts, setSearchAlerts] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.map((u: any) => ({ ...u, status: 'active' })));
        }

        const alertsRes = await fetch('/api/alerts?limit=1000');
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const verifiedUsers = users.filter((u: any) => u.hasCIN).length;
    const suspendedUsers = 0;
    const totalAlerts = alerts.length;
    const pendingAlerts = alerts.filter((a: any) => a.status === 'pending').length;
    const confirmedAlerts = alerts.filter((a: any) => a.status === 'confirmed').length;
    const fakeAlerts = alerts.filter((a: any) => a.status === 'fake').length;
    return {
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalAlerts,
      pendingAlerts,
      confirmedAlerts,
      fakeAlerts
    };
  }, [users, alerts]);

  const filteredUsers = useMemo(() => 
    users.filter((user: any) => {
      const matchesSearch = user.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
                           user.phone?.includes(searchUsers);
      const matchesFilter = userFilter === 'all' || 
                           (userFilter === 'verified' && user.hasCIN) ||
                           (userFilter === 'unverified' && !user.hasCIN) ||
                           (userFilter === 'suspended' && user.status === 'suspended') ||
                           (userFilter === 'active' && user.status === 'active');
      return matchesSearch && matchesFilter;
    }), [users, searchUsers, userFilter]
  );

  const filteredAlerts = useMemo(() => 
    alerts.filter((alert: any) => {
      const matchesSearch = alert.reason.toLowerCase().includes(searchAlerts.toLowerCase()) ||
                           alert.location.toLowerCase().includes(searchAlerts.toLowerCase()) ||
                           alert.author.name.toLowerCase().includes(searchAlerts.toLowerCase());
      const matchesFilter = alertFilter === 'all' || alert.status === alertFilter;
      return matchesSearch && matchesFilter;
    }), [alerts, searchAlerts, alertFilter]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Actif</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Suspendu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">En attente</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmée</Badge>;
      case 'fake':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Fausse</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground">
            Console d'administration pour gérer les utilisateurs et les alertes
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Utilisateurs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.verifiedUsers}</p>
              <p className="text-xs text-muted-foreground">Vérifiés</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Ban className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.suspendedUsers}</p>
              <p className="text-xs text-muted-foreground">Suspendus</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              <p className="text-xs text-muted-foreground">Total alertes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.pendingAlerts}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.confirmedAlerts}</p>
              <p className="text-xs text-muted-foreground">Confirmées</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.fakeAlerts}</p>
              <p className="text-xs text-muted-foreground">Fausses</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Gestion des utilisateurs</TabsTrigger>
            <TabsTrigger value="alerts">Gestion des alertes</TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Utilisateurs</CardTitle>
                    <CardDescription>Gérez les comptes utilisateurs et leurs permissions</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        className="pl-10 w-full sm:w-64"
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        data-testid="input-search-users"
                      />
                    </div>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-full sm:w-48" data-testid="select-user-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les utilisateurs</SelectItem>
                        <SelectItem value="active">Actifs</SelectItem>
                        <SelectItem value="suspended">Suspendus</SelectItem>
                        <SelectItem value="verified">Vérifiés</SelectItem>
                        <SelectItem value="unverified">Non vérifiés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Activité</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{user.name}</span>
                                  {user.hasCIN && (
                                    <Shield className="w-4 h-4 text-green-400" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Inscrit le {new Date(user.joinedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{user.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{user.alertsCount} alertes</p>
                              <p className="text-muted-foreground">{user.validationsCount} validations</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => onUserAction?.(user.id, 'edit')}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onUserAction?.(user.id, user.status === 'suspended' ? 'activate' : 'suspend')}
                                >
                                  {user.status === 'suspended' ? (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Réactiver
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Suspendre
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => onUserAction?.(user.id, 'delete')}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Management */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Alertes</CardTitle>
                    <CardDescription>Modérez et gérez les alertes de la plateforme</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher une alerte..."
                        className="pl-10 w-full sm:w-64"
                        value={searchAlerts}
                        onChange={(e) => setSearchAlerts(e.target.value)}
                        data-testid="input-search-alerts"
                      />
                    </div>
                    <Select value={alertFilter} onValueChange={setAlertFilter}>
                      <SelectTrigger className="w-full sm:w-48" data-testid="select-alert-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les alertes</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="confirmed">Confirmées</SelectItem>
                        <SelectItem value="fake">Fausses alertes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alerte</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead>Localisation</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Validations</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.map((alert: any) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{alert.reason}</p>
                              <p className="text-sm text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{alert.author.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{alert.location}</span>
                          </TableCell>
                          <TableCell>
                            {getAlertStatusBadge(alert.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-green-400">+{alert.confirmedCount}</p>
                              <p className="text-red-400">-{alert.rejectedCount}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-alert-actions-${alert.id}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => onAlertAction?.(alert.id, 'confirm')}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Forcer confirmation
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onAlertAction?.(alert.id, 'fake')}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Marquer fausse
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => onAlertAction?.(alert.id, 'delete')}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}