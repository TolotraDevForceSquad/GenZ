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
  Clock,
  Eye,

  User,
  Mail,
  Phone,
  MapPin,
  Map,
  ShieldCheck,
  CreditCard,
  FileText,
  Calendar
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface AdminDashboardProps {
  onUserAction?: (userId: string, action: string) => void;
  onAlertAction?: (alertId: string, action: string) => void;
}

export default function AdminDashboard({ onUserAction, onAlertAction }: AdminDashboardProps) {
  const { user } = useAuth();
  const authToken = user?.id || '';
  const authHeaders = {
    'Authorization': `Bearer ${authToken}`,
  };

  const [searchUsers, setSearchUsers] = useState('');
  const [searchAlerts, setSearchAlerts] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: '' as 'userEdit' | 'userSuspend' | 'userActivate' | 'userDelete' | 'alertConfirm' | 'alertFake' | 'alertDelete' | 'userView',
    item: null as any,
    title: '',
    message: '',
  });
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    neighborhood: '',
    hasCIN: false,
    isAdmin: false,
    password: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const usersRes = await fetch('/api/admin/users', { headers: authHeaders });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.map((u: any) => ({ ...u, status: 'active' })));
      }

      const alertsRes = await fetch('/api/alerts?limit=1000', { headers: authHeaders });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: string, item: any) => {
    try {
      const url = `/api/admin/users/${item.id}`;
      let response;
      const baseHeaders = { ...authHeaders, 'Content-Type': 'application/json' };
      switch (action) {
        case 'edit':
          // Handled in modal
          return;
        case 'suspend':
          response = await fetch(url, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify({ status: 'suspended' }),
          });
          break;
        case 'activate':
          response = await fetch(url, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify({ status: 'active' }),
          });
          break;
        case 'delete':
          response = await fetch(url, { 
            method: 'DELETE',
            headers: baseHeaders,
          });
          break;
        default:
          return;
      }
      if (response.ok) {
        if (action === 'delete') {
          setUsers(prev => prev.filter(u => u.id !== item.id));
        } else if (action === 'suspend' || action === 'activate') {
          setUsers(prev => prev.map(u =>
            u.id === item.id ? { ...u, status: action === 'suspend' ? 'suspended' : 'active' } : u
          ));
        }
        toast({
          title: "Succès",
          description: `Utilisateur ${action} avec succès`,
        });
      } else {
        throw new Error('Échec de l\'action');
      }
    } catch (err) {
      console.error('Error performing user action:', err);
      toast({
        title: "Erreur",
        description: `Impossible de ${action} l'utilisateur`,
        variant: "destructive",
      });
    }
  };

  const handleAlertAction = async (action: string, item: any) => {
    try {
      // Récupérer l'ID de l'admin connecté depuis l'authentification
      const currentUserResponse = await fetch('/api/auth/me', { headers: authHeaders });
      if (!currentUserResponse.ok) {
        throw new Error('Utilisateur non authentifié');
      }

      const currentUser = await currentUserResponse.json();
      const authorId = currentUser.id; // ✅ Utilise l'ID réel de l'utilisateur connecté

      const url = `/api/alerts/${item.id}/status`;
      let response;
      const baseHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

      switch (action) {
        case 'confirm':
          response = await fetch(url, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify({ status: 'confirmed', authorId }), // ✅ authorId dynamique
          });
          break;
        case 'fake':
          response = await fetch(url, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify({ status: 'fake', authorId }), // ✅ authorId dynamique
          });
          break;
        case 'delete':
          response = await fetch(`/api/alerts/${item.id}`, {
            method: 'DELETE',
            headers: baseHeaders,
            body: JSON.stringify({ authorId }), // ✅ authorId dynamique
          });
          break;
        default:
          return;
      }

      if (response.ok) {
        if (action === 'delete') {
          setAlerts(prev => prev.filter(a => a.id !== item.id));
        } else if (action === 'confirm' || action === 'fake') {
          setAlerts(prev => prev.map(a =>
            a.id === item.id ? { ...a, status: action } : a
          ));
        }
        toast({
          title: "Succès",
          description: `Alerte ${action} avec succès`,
        });
      } else {
        throw new Error('Échec de l\'action');
      }
    } catch (err) {
      console.error('Error performing alert action:', err);
      toast({
        title: "Erreur",
        description: `Impossible de ${action} l'alerte`,
        variant: "destructive",
      });
    }
  };

  const openModal = (type: typeof modalConfig.type, item: any, title: string, message?: string) => {
    setModalConfig({ type, item, title, message: message || '' });
    if (type === 'userEdit') {
      setEditUserForm({
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        email: item.email || '',
        phone: item.phone || '',
        neighborhood: item.neighborhood || '',
        hasCIN: item.hasCIN || false,
        isAdmin: item.isAdmin || false,
        password: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalConfig({ type: '', item: null, title: '', message: '' });
    setEditUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      neighborhood: '',
      hasCIN: false,
      isAdmin: false,
      password: '',
    });
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = { ...editUserForm };
      if (!formData.password) {
        delete formData.password;
      }
      const response = await fetch(`/api/admin/users/${modalConfig.item.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const updatedUser = {
          ...modalConfig.item,
          ...formData,
          name: `${formData.firstName} ${formData.lastName}`.trim()
        };
        setUsers(prev => prev.map(u => u.id === modalConfig.item.id ? updatedUser : u));
        toast({
          title: "Succès",
          description: "Utilisateur mis à jour",
        });
        closeModal();
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleConfirmation = () => {
    if (!modalConfig.item) return;
    const { type, item } = modalConfig;
    if (type.startsWith('user')) {
      const action = type === 'userSuspend' ? 'suspend' : type === 'userActivate' ? 'activate' : 'delete';
      handleUserAction(action, item);
    } else {
      const action = type === 'alertConfirm' ? 'confirm' : type === 'alertFake' ? 'fake' : 'delete';
      handleAlertAction(action, item);
    }
    closeModal();
  };

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const verifiedUsers = users.filter((u: any) => u.hasCIN).length;
    const suspendedUsers = users.filter((u: any) => u.status === 'suspended').length;
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs uppercase tracking-wider">Actif</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs uppercase tracking-wider">Suspendu</Badge>;
      default:
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600 font-mono text-xs uppercase tracking-wider">{status}</Badge>;
    }
  };

  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono text-xs uppercase tracking-wider">En attente</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs uppercase tracking-wider">Confirmée</Badge>;
      case 'fake':
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 font-mono text-xs uppercase tracking-wider">Fausse</Badge>;
      default:
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600 font-mono text-xs uppercase tracking-wider">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400 mb-4"></div>
            <p className="text-lg text-zinc-300 font-mono">LOADING DATA...</p>
        </div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-10 text-white bg-zinc-900 min-h-[calc(100vh-6rem)]">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-yellow-400 tracking-wider">Console admin</h1>
          <p className="text-zinc-400 font-mono text-sm">
            Gérez les utilisateurs et les alertes de la plateforme en temps réel.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.totalUsers}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">Utilisateurs</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.verifiedUsers}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">Vérifiés</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <Ban className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.suspendedUsers}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">Suspendus</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.totalAlerts}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">Total alertes</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.pendingAlerts}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">En attente</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.confirmedAlerts}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">Confirmées</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{stats.fakeAlerts}</p>
              <p className="text-xs text-zinc-400 font-mono uppercase">Fausses</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-950 border border-zinc-700 rounded-lg p-1">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-zinc-900 data-[state=active]:font-bold data-[state=active]:shadow-neon-sm data-[state=active]:shadow-yellow-400/30 text-zinc-300 hover:bg-zinc-700 transition-colors duration-200"
            >
              Gestion des utilisateurs
            </TabsTrigger>
            <TabsTrigger 
              value="alerts"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-zinc-900 data-[state=active]:font-bold data-[state=active]:shadow-neon-sm data-[state=active]:shadow-yellow-400/30 text-zinc-300 hover:bg-zinc-700 transition-colors duration-200"
            >
              Gestion des alertes
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl text-white uppercase tracking-wider">Utilisateurs</CardTitle>
                    <CardDescription className="text-zinc-400 font-mono text-sm">Gérez les comptes utilisateurs et leurs permissions</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        className="pl-10 w-full sm:w-64 h-10 bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition"
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        data-testid="input-search-users"
                      />
                    </div>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-full sm:w-48 h-10 bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition" data-testid="select-user-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
                <div className="rounded-xl border border-zinc-700 overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader className="bg-zinc-900 border-zinc-700">
                      <TableRow className="border-zinc-700 hover:bg-zinc-900">
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[12rem]">Utilisateur</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Contact</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[6rem]">Statut</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Activité</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-white">
                      {filteredUsers.map((user: any) => (
                        <TableRow key={user.id} className="border-zinc-700 hover:bg-zinc-700/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border border-yellow-400/50">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="bg-zinc-700 text-yellow-400 font-bold">{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">{user.name}</span>
                                  {user.hasCIN && (
                                    <Shield className="w-4 h-4 text-green-400" title="Vérifié CIN" />
                                  )}
                                  {user.isAdmin && (
                                    <Badge className="bg-yellow-400/30 text-yellow-400 border border-yellow-400/50 text-[10px] font-mono p-0.5 px-1.5 uppercase leading-none">Admin</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 font-mono">
                                  Inscrit le {new Date(user.joinedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-300">
                              <p>{user.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-300">
                              <p>{user.alertsCount} alertes</p>
                              <p className="text-zinc-500 font-mono text-xs">{user.validationsCount} validations</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-zinc-700" data-testid={`button-user-actions-${user.id}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-white">
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal('userView', user, `Voir profil de ${user.name}`);
                                  }}
                                  className="hover:bg-zinc-700 transition-colors"
                                >
                                  <Eye className="mr-2 h-4 w-4 text-yellow-400" />
                                  Voir
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal('userEdit', user, 'Modifier utilisateur');
                                  }}
                                  className="hover:bg-zinc-700 transition-colors"
                                >
                                  <UserCheck className="mr-2 h-4 w-4 text-yellow-400" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const actionType = user.status === 'suspended' ? 'userActivate' : 'userSuspend';
                                    openModal(
                                      actionType,
                                      user,
                                      user.status === 'suspended' ? 'Réactiver utilisateur' : 'Suspendre utilisateur',
                                      `Voulez-vous ${user.status === 'suspended' ? 'réactiver' : 'suspendre'} l'utilisateur ${user.name}?`
                                    );
                                  }}
                                  className={user.status === 'suspended' ? "text-green-400 hover:bg-zinc-700" : "text-red-400 hover:bg-zinc-700"}
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
                                <DropdownMenuSeparator className="bg-zinc-700" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal(
                                      'userDelete',
                                      user,
                                      'Supprimer utilisateur',
                                      `Voulez-vous supprimer définitivement l'utilisateur ${user.name}?`
                                    );
                                  }}
                                  className="text-red-500 hover:bg-red-900/50"
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
          <TabsContent value="alerts" className="space-y-6 mt-6">
            <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl text-white uppercase tracking-wider">Alertes</CardTitle>
                    <CardDescription className="text-zinc-400 font-mono text-sm">Modérez et gérez les alertes de la plateforme</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Rechercher une alerte..."
                        className="pl-10 w-full sm:w-64 h-10 bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition"
                        value={searchAlerts}
                        onChange={(e) => setSearchAlerts(e.target.value)}
                        data-testid="input-search-alerts"
                      />
                    </div>
                    <Select value={alertFilter} onValueChange={setAlertFilter}>
                      <SelectTrigger className="w-full sm:w-48 h-10 bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition" data-testid="select-alert-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
                <div className="rounded-xl border border-zinc-700 overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader className="bg-zinc-900 border-zinc-700">
                      <TableRow className="border-zinc-700 hover:bg-zinc-900">
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[10rem]">Alerte</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Auteur</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[10rem]">Localisation</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Statut</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Validations</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-white">
                      {filteredAlerts.map((alert: any) => (
                        <TableRow key={alert.id} className="border-zinc-700 hover:bg-zinc-700/50 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-white">{alert.reason}</p>
                              <p className="text-xs text-zinc-500 font-mono">{new Date(alert.createdAt).toLocaleString()}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-zinc-300">{alert.author.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-zinc-300">{alert.location}</span>
                          </TableCell>
                          <TableCell>
                            {getAlertStatusBadge(alert.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-green-400 font-bold">+{alert.confirmedCount || 0}</p>
                              <p className="text-red-400 font-bold">-{alert.rejectedCount || 0}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-zinc-700" data-testid={`button-alert-actions-${alert.id}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-white">
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal(
                                      'alertConfirm',
                                      alert,
                                      'Forcer confirmation',
                                      `Voulez-vous confirmer manuellement l'alerte "${alert.reason}"?`
                                    );
                                  }}
                                  className="hover:bg-zinc-700 transition-colors"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                                  Forcer confirmation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal(
                                      'alertFake',
                                      alert,
                                      'Marquer fausse',
                                      `Voulez-vous marquer l'alerte "${alert.reason}" comme fausse?`
                                    );
                                  }}
                                  className="hover:bg-zinc-700 transition-colors"
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-zinc-500" />
                                  Marquer fausse
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-700" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal(
                                      'alertDelete',
                                      alert,
                                      'Supprimer alerte',
                                      `Voulez-vous supprimer l'alerte "${alert.reason}"?`
                                    );
                                  }}
                                  className="text-red-500 hover:bg-red-900/50"
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

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={modalConfig.type === 'userView' ? "max-w-4xl bg-zinc-800 border-zinc-700 text-white" : "max-w-md sm:max-w-lg bg-zinc-800 border-zinc-700 text-white"}>
          <DialogHeader className="border-b border-zinc-700 pb-3">
            <DialogTitle className="text-xl font-bold text-yellow-400 uppercase tracking-wider">{modalConfig.title}</DialogTitle>
            {modalConfig.type === 'userEdit' || modalConfig.type === 'userView' ? null : (
              <DialogDescription className="text-zinc-400 font-mono">{modalConfig.message}</DialogDescription>
            )}
          </DialogHeader>
          {modalConfig.type === 'userView' ? (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
              {modalConfig.item && (
                <>
                  {/* En-tête de l'utilisateur (Avatar et Nom) */}
                  <div className="flex items-center space-x-4 p-4 rounded-lg bg-zinc-900 sticky top-0 z-10 border border-zinc-700">
                    <Avatar className="w-16 h-16 border-2 border-yellow-400">
                      <AvatarImage src={modalConfig.item.avatar} alt={modalConfig.item.name} />
                      <AvatarFallback className="text-xl bg-zinc-700 text-yellow-400 font-bold">
                        {modalConfig.item.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-white">{modalConfig.item.name}</h3>
                      <p className="text-sm text-zinc-400 font-mono">{modalConfig.item.email || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Détails de l'utilisateur - Nouvelle mise en page par cartes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">

                    {/* Carte 1: Informations Personnelles et Contact */}
                    <Card className="lg:col-span-1 bg-zinc-900 border-zinc-700">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                          <User className="w-5 h-5 text-yellow-400" />
                          <span>Informations Personnelles</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">

                        {/* Prénom */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <User className="w-3 h-3 text-zinc-500" />
                            <span>Prénom</span>
                          </Label>
                          <p className="text-sm text-white">{modalConfig.item.firstName || 'N/A'}</p>
                        </div>

                        {/* Nom */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <User className="w-3 h-3 text-zinc-500" />
                            <span>Nom</span>
                          </Label>
                          <p className="text-sm text-white">{modalConfig.item.lastName || 'N/A'}</p>
                        </div>

                        {/* Email */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <Mail className="w-3 h-3 text-zinc-500" />
                            <span>Email</span>
                          </Label>
                          <p className="text-sm text-white">{modalConfig.item.email || 'N/A'}</p>
                        </div>

                        {/* Téléphone */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>Téléphone</span>
                          </Label>
                          <p className="text-sm text-white">{modalConfig.item.phone || 'N/A'}</p>
                        </div>

                        {/* Quartier */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            <span>Quartier</span>
                          </Label>
                          <p className="text-sm text-white">{modalConfig.item.neighborhood || 'N/A'}</p>
                        </div>

                        {/* Coordonnées */}
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <Map className="w-3 h-3 text-zinc-500" />
                            <span>Coordonnées</span>
                          </Label>
                          <p className="text-sm text-white font-mono">Lat: {modalConfig.item.latitude || 'N/A'}, Lng: {modalConfig.item.longitude || 'N/A'}</p>
                        </div>

                      </CardContent>
                    </Card>

                    {/* Carte 2: Statut et Métriques */}
                    <Card className="lg:col-span-1 bg-zinc-900 border-zinc-700">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                          <ShieldCheck className="w-5 h-5 text-green-400" />
                          <span>Statut et Sécurité</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">

                        {/* Statut Admin */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <ShieldCheck className="w-3 h-3 text-zinc-500" />
                            <span>Statut Admin</span>
                          </Label>
                          <p className={`text-sm font-semibold ${modalConfig.item.isAdmin ? 'text-green-400' : 'text-zinc-500'}`}>
                            {modalConfig.item.isAdmin ? 'Oui' : 'Non'}
                          </p>
                        </div>

                        {/* A CIN */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <CreditCard className="w-3 h-3 text-zinc-500" />
                            <span>A CIN</span>
                          </Label>
                          <span className={`text-sm font-semibold ${modalConfig.item.hasCIN ? 'text-green-400' : 'text-red-400'}`}>
                            {modalConfig.item.hasCIN ? 'Oui' : 'Non'}
                          </span>
                        </div>

                        {/* CIN Vérifiée */}
                        <div className="space-y-1 p-2 rounded-md bg-zinc-700/20 border border-zinc-700/50">
                          <Label className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-yellow-400" />
                            <span>CIN Vérifiée</span>
                          </Label>
                          <p className={`text-sm font-bold ${modalConfig.item.cinVerified ? 'text-green-400' : 'text-red-400'}`}>
                            {modalConfig.item.cinVerified ? 'Vérifiée' : 'Non Vérifiée'}
                          </p>
                          {modalConfig.item.cinVerified && (
                            <p className="text-xs text-zinc-500 font-mono">
                              Le {new Date(modalConfig.item.cinVerifiedAt).toLocaleDateString()} par <span className="font-medium text-white">{modalConfig.item.cinVerifiedBy || 'ADMIN'}</span>
                            </p>
                          )}
                        </div>

                        {/* Alertes */}
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1 pt-2">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <AlertTriangle className="w-3 h-3 text-zinc-500" />
                            <span>Alertes Créées</span>
                          </Label>
                          <p className="text-sm text-red-400 font-extrabold">{modalConfig.item.alertsCount || 0}</p>
                        </div>

                        {/* Validations */}
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <CheckCircle className="w-3 h-3 text-zinc-500" />
                            <span>Validations Données</span>
                          </Label>
                          <p className="text-sm text-green-400 font-extrabold">{modalConfig.item.validationsCount || 0}</p>
                        </div>

                      </CardContent>
                    </Card>

                    {/* Carte 3: Historique (Dates) - Mis à part car il est moins critique pour la vue d'ensemble */}
                    <Card className="lg:col-span-2 bg-zinc-900 border-zinc-700">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                          <Calendar className="w-5 h-5 text-yellow-400" />
                          <span>Historique des Dates</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-3 text-sm">

                        {/* Inscrit le */}
                        <div className="space-y-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            <span>Inscrit le</span>
                          </Label>
                          <p className="text-sm text-white font-mono">{new Date(modalConfig.item.joinedAt).toLocaleDateString()}</p>
                        </div>

                        {/* Créé le */}
                        <div className="space-y-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            <span>Créé le (DB)</span>
                          </Label>
                          <p className="text-sm text-white font-mono">{new Date(modalConfig.item.createdAt).toLocaleDateString()}</p>
                        </div>

                        {/* Modifié le */}
                        <div className="space-y-1">
                          <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            <span>Modifié le</span>
                          </Label>
                          <p className="text-sm text-white font-mono">{new Date(modalConfig.item.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                    </Card>

                  </div>

                  {/* Section CIN - Mise en page des images */}
                  <Card className="mx-4 mb-4 bg-zinc-900 border-zinc-700">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                        <FileText className="w-5 h-5 text-yellow-400" />
                        <span>Documents (CIN)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-zinc-300">Recto</Label>
                          {modalConfig.item.cinUploadFrontUrl ? (
                            <a href={modalConfig.item.cinUploadFrontUrl} target="_blank" rel="noopener noreferrer" className="block transition duration-200 hover:scale-[1.01] shadow-md shadow-zinc-950/50">
                              <img
                                src={modalConfig.item.cinUploadFrontUrl}
                                alt="CIN Recto"
                                className="w-full h-48 object-cover border-2 border-dashed border-yellow-400/50 p-1 rounded-lg opacity-90 hover:opacity-100 transition"
                              />
                            </a>
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg text-zinc-500 text-sm bg-zinc-950 font-mono">
                              Pas de recto disponible
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-zinc-300">Verso</Label>
                          {modalConfig.item.cinUploadBackUrl ? (
                            <a href={modalConfig.item.cinUploadBackUrl} target="_blank" rel="noopener noreferrer" className="block transition duration-200 hover:scale-[1.01] shadow-md shadow-zinc-950/50">
                              <img
                                src={modalConfig.item.cinUploadBackUrl}
                                alt="CIN Verso"
                                className="w-full h-48 object-cover border-2 border-dashed border-yellow-400/50 p-1 rounded-lg opacity-90 hover:opacity-100 transition"
                              />
                            </a>
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg text-zinc-500 text-sm bg-zinc-950 font-mono">
                              Pas de verso disponible
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              <DialogFooter className="sticky bottom-0 bg-zinc-800/95 p-4 border-t border-zinc-700">
                <Button type="button" onClick={closeModal} className="w-full sm:w-auto bg-zinc-700 hover:bg-zinc-700/80 text-white font-bold transition">
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          ) : modalConfig.type === 'userEdit' ? (
            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-zinc-300">Prénom</Label>
                <Input
                  id="firstName"
                  value={editUserForm.firstName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-zinc-300">Nom</Label>
                <Input
                  id="lastName"
                  value={editUserForm.lastName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-300">Téléphone</Label>
                <Input
                  id="phone"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="text-zinc-300">Quartier</Label>
                <Input
                  id="neighborhood"
                  value={editUserForm.neighborhood}
                  onChange={(e) => setEditUserForm({ ...editUserForm, neighborhood: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasCIN"
                    checked={editUserForm.hasCIN}
                    onCheckedChange={(checked) => setEditUserForm({ ...editUserForm, hasCIN: !!checked })}
                    className="border-zinc-500 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-zinc-900"
                  />
                  <Label htmlFor="hasCIN" className="text-zinc-300">A CIN</Label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdmin"
                    checked={editUserForm.isAdmin}
                    onCheckedChange={(checked) => setEditUserForm({ ...editUserForm, isAdmin: !!checked })}
                    className="border-zinc-500 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-zinc-900"
                  />
                  <Label htmlFor="isAdmin" className="text-zinc-300">Admin</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Nouveau mot de passe (optionnel)</Label>
                <Input
                  id="password"
                  type="password"
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                  placeholder="Laisser vide pour ne pas changer"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeModal} className="bg-zinc-700 hover:bg-zinc-700/80 text-white border-zinc-600 font-bold transition">
                  Annuler
                </Button>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold transition">Enregistrer</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="py-4">
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeModal} className="bg-zinc-700 hover:bg-zinc-700/80 text-white border-zinc-600 font-bold transition">
                  Annuler
                </Button>
                <Button 
                  type="button" 
                  variant={modalConfig.type.includes('Delete') || modalConfig.type.includes('Suspend') ? "destructive" : "default"} 
                  onClick={handleConfirmation}
                  className={modalConfig.type.includes('Delete') ? "bg-red-700 hover:bg-red-800 text-white font-bold" : "bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold"}
                >
                  Confirmer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}