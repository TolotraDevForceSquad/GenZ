//A2.tsx
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

const regions = [
  "Diana",
  "Sava",
  "Itasy",
  "Analamanga",
  "Vakinankaratra",
  "Bongolava",
  "Sofia",
  "Boeny",
  "Betsiboka",
  "Melaky",
  "Alaotra Mangoro",
  "Atsinanana",
  "Analanjirofo",
  "Atsimo-Atsinanana",
  "Vatovavy",
  "Fitovinany",
  "Atsimo-Andrefana",
  "Androy",
  "Anosy",
  "Andrefana",
  "Menabe",
  "Amoron'i Mania",
  "Haute Matsiatra",
  "Ihorombe"
];

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
  const [cinSearch, setCinSearch] = useState('');
  const [cinDateSearch, setCinDateSearch] = useState('');
  const [cinSort, setCinSort] = useState('recent');
  const [cinStatusFilter, setCinStatusFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cinVerifications, setCinVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: '' as 'userEdit' | 'userSuspend' | 'userActivate' | 'userDelete' | 'alertConfirm' | 'alertFake' | 'alertDelete' | 'userView' | 'cinVerify' | 'duplicateAlert',
    item: null as any,
    title: '',
    message: '',
  });
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    neighborhood: '',
    region: '',
    hasCIN: false,
    isAdmin: false,
    isActive: true,
    password: '',
  });
  const [cinForm, setCinForm] = useState({
    id: '',
    userId: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    address: '',
    issuePlace: '',
    issueDate: '',
    cinNumber: '',
    status: 'pending',
    notes: '',
  });
  const [similarities, setSimilarities] = useState<any[]>([]);
  const [selectedSimilar, setSelectedSimilar] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const usersRes = await fetch('/api/admin/users', { headers: authHeaders });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.map((u: any) => ({ ...u, status: u.isActive ? 'active' : 'suspended' })));
      }

      const alertsRes = await fetch('/api/alerts?limit=1000', { headers: authHeaders });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      const cinRes = await fetch('/api/admin/cin-verifications?limit=50', { headers: authHeaders });
      if (cinRes.ok) {
        const cinData = await cinRes.json();
        setCinVerifications(cinData);
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
            body: JSON.stringify({ isActive: false }),
          });
          break;
        case 'activate':
          response = await fetch(url, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify({ isActive: true }),
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
            u.id === item.id ? { ...u, isActive: action === 'suspend' ? false : true, status: action === 'suspend' ? 'suspended' : 'active' } : u
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

  const handleCinVerifyAction = async (action: string, item: any) => {
    try {
      const res = await fetch(`/api/admin/users/${item.id}/verify-cin`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          verified: !item.cinVerified,
          verifierId: authToken ? authToken.split(' ')[1] : 'admin',
        }),
      });

      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === item.id ? { ...u, cinVerified: !u.cinVerified } : u));
        toast({
          title: "Succès",
          description: `CIN ${item.cinVerified ? 'dé-vérifié' : 'vérifié'} pour ${item.name}`,
        });
        fetchData();
      } else {
        throw new Error('Échec de la vérification');
      }
    } catch (error) {
      console.error('Error verifying CIN:', error);
      toast({ title: "Erreur", description: "Erreur réseau lors de la vérification CIN", variant: "destructive" });
    }
  };

  const handleCinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = cinForm.id ? `/api/admin/cin-verifications/${cinForm.id}` : '/api/admin/cin-verifications';
      const method = cinForm.id ? 'PUT' : 'POST';
      const body = {
        ...cinForm,
        userId: modalConfig.item.id,
        adminId: authToken ? authToken.split(' ')[1] : 'admin',
        birthDate: cinForm.birthDate,
        issueDate: cinForm.issueDate,
      };

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: "Succès", description: "Vérification CIN mise à jour" });
        fetchData();
        closeModal();
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (error) {
      console.error('Error submitting CIN:', error);
      toast({ title: "Erreur", description: "Erreur réseau lors de la mise à jour CIN", variant: "destructive" });
    }
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
          status: formData.isActive ? 'active' : 'suspended'
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

  const openModal = (type: typeof modalConfig.type, item: any, title: string, message?: string) => {
    setModalConfig({ type, item, title, message: message || '' });
    if (type === 'userEdit') {
      setEditUserForm({
        name: item.name || '',
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        email: item.email || '',
        phone: item.phone || '',
        neighborhood: item.neighborhood || '',
        region: item.region || '',
        hasCIN: item.hasCIN || false,
        isAdmin: item.isAdmin || false,
        isActive: item.isActive !== undefined ? item.isActive : true,
        password: '',
      });
    } else if (type === 'cinVerify') {
      const existing = cinVerifications.find((v: any) => v.userId === item.id);
      setCinForm(existing || {
        id: '',
        userId: item.id,
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        birthDate: '',
        birthPlace: '',
        address: item.address || '',
        issuePlace: '',
        issueDate: '',
        cinNumber: '',
        status: 'pending',
        notes: '',
      });
      setSimilarities([
        { userId: '1', name: 'John Doe', fields: 'name, cinNumber' },
        { userId: '3', name: 'Bob Johnson', fields: 'name' },
      ]);
      setSelectedSimilar(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalConfig({ type: '', item: null, title: '', message: '' });
    setEditUserForm({
      name: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      neighborhood: '',
      region: '',
      hasCIN: false,
      isAdmin: false,
      isActive: true,
      password: '',
    });
    setCinForm({
      id: '',
      userId: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      birthPlace: '',
      address: '',
      issuePlace: '',
      issueDate: '',
      cinNumber: '',
      status: 'pending',
      notes: '',
    });
    setSimilarities([]);
    setSelectedSimilar(null);
  };

  const handleConfirmation = () => {
    if (!modalConfig.item) return;
    const { type, item } = modalConfig;
    if (type.startsWith('user')) {
      const action = type === 'userSuspend' ? 'suspend' : type === 'userActivate' ? 'activate' : 'delete';
      handleUserAction(action, item);
    } else if (type.startsWith('alert')) {
      const action = type === 'alertConfirm' ? 'confirm' : type === 'alertFake' ? 'fake' : 'delete';
      handleAlertAction(action, item);
    }
    closeModal();
  };

  const handleSimilarClick = (sim: any) => {
    const similarUser = users.find(u => u.id === sim.userId);
    if (similarUser) {
      closeModal();
      openModal('cinVerify', similarUser, `Vérifier ${similarUser.name}`);
    }
  };

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const verifiedUsers = users.filter((u: any) => u.hasCIN).length;
    const suspendedUsers = users.filter((u: any) => !u.isActive).length;
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
        (userFilter === 'suspended' && !user.isActive) ||
        (userFilter === 'active' && user.isActive);
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

  const filteredCinUsers = useMemo(() => {
    return users
      .filter(u => u.cinUploadFrontUrl || u.cinUploadBackUrl)
      .map(u => {
        const verif = cinVerifications.find(v => v.userId === u.id);
        return { ...u, status: verif ? verif.status : 'pending' };
      })
      .filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(cinSearch.toLowerCase()) || u.phone?.includes(cinSearch);
        const matchesDate = !cinDateSearch || new Date(u.updatedAt).toISOString().split('T')[0] === cinDateSearch;
        const matchesStatus = cinStatusFilter === 'all' || u.status === cinStatusFilter;
        return matchesSearch && matchesDate && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        return cinSort === 'recent' ? dateB - dateA : dateA - dateB;
      });
  }, [users, cinVerifications, cinSearch, cinDateSearch, cinSort, cinStatusFilter]);

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs uppercase tracking-wider">Actif</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs uppercase tracking-wider">Suspendu</Badge>;
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

  const getCinStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono text-xs uppercase tracking-wider">En attente</Badge>;
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs uppercase tracking-wider">Vérifiée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs uppercase tracking-wider">Rejetée</Badge>;
      case 'duplicate':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-mono text-xs uppercase tracking-wider">Doublon</Badge>;
      case 'suspicious':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-mono text-xs uppercase tracking-wider">Suspect</Badge>;
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
          <TabsList className="grid w-full grid-cols-3 bg-zinc-950 border border-zinc-700 rounded-lg p-1">
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
            <TabsTrigger 
              value="cin-verification"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-zinc-900 data-[state=active]:font-bold data-[state=active]:shadow-neon-sm data-[state=active]:shadow-yellow-400/30 text-zinc-300 hover:bg-zinc-700 transition-colors duration-200"
            >
              Vérification CIN
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
                            {getStatusBadge(user.isActive)}
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
                                    const actionType = !user.isActive ? 'userActivate' : 'userSuspend';
                                    openModal(
                                      actionType,
                                      user,
                                      !user.isActive ? 'Réactiver utilisateur' : 'Suspendre utilisateur',
                                      `Voulez-vous ${!user.isActive ? 'réactiver' : 'suspendre'} l'utilisateur ${user.name}?`
                                    );
                                  }}
                                  className={!user.isActive ? "text-green-400 hover:bg-zinc-700" : "text-red-400 hover:bg-zinc-700"}
                                >
                                  {!user.isActive ? (
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
                    <CardDescription className="text-zinc-400 font-mono text-sm">Modérez et validez les signalements des utilisateurs</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Rechercher une alerte..."
                        className="pl-10 w-full sm:w-64 h-10 bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition"
                        value={searchAlerts}
                        onChange={(e) => setSearchAlerts(e.target.value)}
                      />
                    </div>
                    <Select value={alertFilter} onValueChange={setAlertFilter}>
                      <SelectTrigger className="w-full sm:w-48 h-10 bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="all">Toutes les alertes</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="confirmed">Confirmées</SelectItem>
                        <SelectItem value="fake">Fausses</SelectItem>
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
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[14rem]">Alerte</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[10rem]">Auteur</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Localisation</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[6rem]">Statut</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[10rem]">Date</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-white">
                      {filteredAlerts.map((alert: any) => (
                        <TableRow key={alert.id} className="border-zinc-700 hover:bg-zinc-700/50 transition-colors">
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold text-white">{alert.reason}</p>
                              <p className="text-xs text-zinc-500 font-mono">{alert.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={alert.author.avatar} />
                                <AvatarFallback className="bg-zinc-700 text-yellow-400 text-xs">{alert.author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-zinc-300">{alert.author.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-300 font-mono">
                              {alert.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getAlertStatusBadge(alert.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-300 font-mono">
                              {new Date(alert.createdAt).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-zinc-700">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-white">
                                {alert.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        openModal(
                                          'alertConfirm',
                                          alert,
                                          'Confirmer alerte',
                                          `Voulez-vous confirmer cette alerte comme réelle ?`
                                        );
                                      }}
                                      className="text-green-400 hover:bg-zinc-700"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Confirmer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        openModal(
                                          'alertFake',
                                          alert,
                                          'Marquer comme fausse',
                                          `Voulez-vous marquer cette alerte comme fausse ?`
                                        );
                                      }}
                                      className="text-zinc-400 hover:bg-zinc-700"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Fausse
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator className="bg-zinc-700" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    openModal(
                                      'alertDelete',
                                      alert,
                                      'Supprimer alerte',
                                      `Voulez-vous supprimer définitivement cette alerte ?`
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

          {/* CIN Verification Tab - Existing from A2 */}
          <TabsContent value="cin-verification" className="space-y-6 mt-6">
            {/* Insert the existing CIN verification content from A2 here */}
            <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl text-white uppercase tracking-wider">Vérification CIN</CardTitle>
                    <CardDescription className="text-zinc-400 font-mono text-sm">Vérifiez les documents d'identité des utilisateurs</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        className="pl-10 w-full sm:w-64 h-10 bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition"
                        value={cinSearch}
                        onChange={(e) => setCinSearch(e.target.value)}
                      />
                    </div>
                    <Input
                      type="date"
                      value={cinDateSearch}
                      onChange={(e) => setCinDateSearch(e.target.value)}
                      className="w-full sm:w-32 h-10 bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition"
                    />
                    <Select value={cinStatusFilter} onValueChange={setCinStatusFilter}>
                      <SelectTrigger className="w-full sm:w-32 h-10 bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="verified">Vérifiées</SelectItem>
                        <SelectItem value="rejected">Rejetées</SelectItem>
                        <SelectItem value="duplicate">Doublons</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={cinSort} onValueChange={setCinSort}>
                      <SelectTrigger className="w-full sm:w-32 h-10 bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50 transition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="recent">Récent</SelectItem>
                        <SelectItem value="old">Ancien</SelectItem>
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
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">CIN Numéro</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[6rem]">Statut</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono min-w-[8rem]">Date Upload</TableHead>
                        <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-white">
                      {filteredCinUsers.map((user: any) => (
                        <TableRow key={user.id} className="border-zinc-700 hover:bg-zinc-700/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border border-yellow-400/50">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="bg-zinc-700 text-yellow-400 font-bold">{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-semibold text-white">{user.name}</span>
                                <p className="text-xs text-zinc-500 font-mono">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-300 font-mono">
                              {user.cinNumber || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getCinStatusBadge(user.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-300 font-mono">
                              {new Date(user.updatedAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-zinc-700">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-white">
                                <DropdownMenuItem
                                  onClick={() => openModal('cinVerify', user, `Vérifier CIN de ${user.name}`)}
                                  className="hover:bg-zinc-700 transition-colors"
                                >
                                  <Eye className="mr-2 h-4 w-4 text-yellow-400" />
                                  Vérifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCinVerifyAction('toggle', user)}
                                  className="hover:bg-zinc-700 transition-colors"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                                  {user.cinVerified ? 'Dé-vérifier' : 'Vérifier'}
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
        <DialogContent className={
          modalConfig.type === 'userView' 
            ? "max-w-4xl sm:max-w-3xl bg-zinc-800 border-zinc-700 text-white max-h-[95vh] overflow-hidden flex flex-col"
            : modalConfig.type === 'userEdit'
            ? "max-w-xl sm:max-w-2xl bg-zinc-800 border-zinc-700 text-white max-h-[95vh] overflow-hidden flex flex-col"
            : modalConfig.type === 'cinVerify'
            ? "max-w-6xl bg-zinc-800 border-zinc-700 text-white max-h-[95vh] overflow-hidden flex flex-col"
            : "max-w-md sm:max-w-lg bg-zinc-800 border-zinc-700 text-white"
        }>
          <DialogHeader className="border-b border-zinc-700 pb-3 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-yellow-400 uppercase tracking-wider">{modalConfig.title}</DialogTitle>
            {modalConfig.type === 'userEdit' || modalConfig.type === 'userView' || modalConfig.type === 'cinVerify' ? null : (
              <DialogDescription className="text-zinc-400 font-mono">{modalConfig.message}</DialogDescription>
            )}
          </DialogHeader>
          
          <div className={`flex-grow ${modalConfig.type !== 'userView' && modalConfig.type !== 'userEdit' && modalConfig.type !== 'cinVerify' ? 'hidden' : 'overflow-y-auto'}`}>
            {modalConfig.type === 'userView' ? (
              <div className="space-y-6 p-1">
                {modalConfig.item && (
                  <>
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">

                      <Card className="lg:col-span-1 bg-zinc-900 border-zinc-700">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                            <User className="w-5 h-5 text-yellow-400" />
                            <span>Informations Personnelles</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <User className="w-3 h-3 text-zinc-500" />
                              <span>Nom complet</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.name || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <User className="w-3 h-3 text-zinc-500" />
                              <span>Prénom</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.firstName || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <User className="w-3 h-3 text-zinc-500" />
                              <span>Nom</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.lastName || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              <span>Email</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.email || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              <span>Téléphone</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.phone || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              <span>Quartier</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.neighborhood || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              <span>Région</span>
                            </Label>
                            <p className="text-sm text-white">{modalConfig.item.region || 'N/A'}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <Map className="w-3 h-3 text-zinc-500" />
                              <span>Coordonnées</span>
                            </Label>
                            <p className="text-sm text-white font-mono">Lat: {modalConfig.item.latitude || 'N/A'}, Lng: {modalConfig.item.longitude || 'N/A'}</p>
                          </div>

                        </CardContent>
                      </Card>

                      <Card className="lg:col-span-1 bg-zinc-900 border-zinc-700">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                            <ShieldCheck className="w-5 h-5 text-green-400" />
                            <span>Statut et Sécurité</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <UserCheck className="w-3 h-3 text-zinc-500" />
                              <span>Actif</span>
                            </Label>
                            <p className={`text-sm font-semibold ${modalConfig.item.isActive ? 'text-green-400' : 'text-red-400'}`}>
                              {modalConfig.item.isActive ? 'Oui' : 'Non'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <ShieldCheck className="w-3 h-3 text-zinc-500" />
                              <span>Statut Admin</span>
                            </Label>
                            <p className={`text-sm font-semibold ${modalConfig.item.isAdmin ? 'text-green-400' : 'text-zinc-500'}`}>
                              {modalConfig.item.isAdmin ? 'Oui' : 'Non'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <CreditCard className="w-3 h-3 text-zinc-500" />
                              <span>A CIN</span>
                            </Label>
                            <span className={`text-sm font-semibold ${modalConfig.item.hasCIN ? 'text-green-400' : 'text-red-400'}`}>
                              {modalConfig.item.hasCIN ? 'Oui' : 'Non'}
                            </span>
                          </div>

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

                          <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1 pt-2">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <AlertTriangle className="w-3 h-3 text-zinc-500" />
                              <span>Alertes Créées</span>
                            </Label>
                            <p className="text-sm text-red-400 font-extrabold">{modalConfig.item.alertsCount || 0}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <CheckCircle className="w-3 h-3 text-zinc-500" />
                              <span>Validations Données</span>
                            </Label>
                            <p className="text-sm text-green-400 font-extrabold">{modalConfig.item.validationsCount || 0}</p>
                          </div>

                        </CardContent>
                      </Card>

                      <Card className="lg:col-span-2 bg-zinc-900 border-zinc-700">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center space-x-2 text-white uppercase tracking-wider">
                            <Calendar className="w-5 h-5 text-yellow-400" />
                            <span>Historique des Dates</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-3 text-sm">

                          <div className="space-y-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>Inscrit le</span>
                            </Label>
                            <p className="text-sm text-white font-mono">{new Date(modalConfig.item.joinedAt).toLocaleDateString()}</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="flex items-center text-xs font-mono uppercase tracking-wider text-zinc-500 space-x-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>Créé le (DB)</span>
                            </Label>
                            <p className="text-sm text-white font-mono">{new Date(modalConfig.item.createdAt).toLocaleDateString()}</p>
                          </div>

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
              </div>
            ) : modalConfig.type === 'userEdit' ? (
              <form onSubmit={handleEditUserSubmit} className="space-y-4 p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Nom complet</Label>
                    <Input
                      id="name"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50"
                    />
                  </div>
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
                  <div className="space-y-2 md:col-span-2">
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
                    <Label htmlFor="region" className="text-zinc-300">Région</Label>
                    <Select value={editUserForm.region} onValueChange={(value) => setEditUserForm({ ...editUserForm, region: value })}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-yellow-400/70 focus:border-yellow-400/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
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
                  <div className="space-y-2 md:col-span-2">
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
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={editUserForm.isActive}
                        onCheckedChange={(checked) => setEditUserForm({ ...editUserForm, isActive: !!checked })}
                        className="border-zinc-500 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-zinc-900"
                      />
                      <Label htmlFor="isActive" className="text-zinc-300">Actif</Label>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
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
                </div>
                <DialogFooter className="border-t border-zinc-700 pt-4 flex-shrink-0">
                  <Button type="button" variant="outline" onClick={closeModal} className="bg-zinc-700 hover:bg-zinc-700/80 text-white border-zinc-600 font-bold transition">
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold transition">Enregistrer</Button>
                </DialogFooter>
              </form>
            ) : modalConfig.type === 'cinVerify' ? (
              <div className="flex h-full p-6 gap-6">
                <div className="w-1/2 flex flex-col gap-4">
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-900">
                    {modalConfig.item.cinUploadFrontUrl ? (
                      <img src={modalConfig.item.cinUploadFrontUrl} alt="CIN Recto" className="h-96 object-contain" />
                    ) : (
                      <div className="text-zinc-500 text-sm font-mono">Pas de recto</div>
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-900">
                    {modalConfig.item.cinUploadBackUrl ? (
                      <img src={modalConfig.item.cinUploadBackUrl} alt="CIN Verso" className="h-96 object-contain" />
                    ) : (
                      <div className="text-zinc-500 text-sm font-mono">Pas de verso</div>
                    )}
                  </div>
                </div>
                <div className="w-1/2 space-y-4 overflow-y-auto">
                  <form onSubmit={handleCinSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Prénom</Label>
                        <Input
                          value={cinForm.firstName}
                          onChange={(e) => setCinForm({ ...cinForm, firstName: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Nom de famille</Label>
                        <Input
                          value={cinForm.lastName}
                          onChange={(e) => setCinForm({ ...cinForm, lastName: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-zinc-300">Date de naissance</Label>
                        <Input
                          type="date"
                          value={cinForm.birthDate}
                          onChange={(e) => setCinForm({ ...cinForm, birthDate: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Lieu de naissance</Label>
                        <Input
                          value={cinForm.birthPlace}
                          onChange={(e) => setCinForm({ ...cinForm, birthPlace: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-zinc-300">Adresse</Label>
                        <Input
                          value={cinForm.address}
                          onChange={(e) => setCinForm({ ...cinForm, address: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Lieu de délivrance</Label>
                        <Input
                          value={cinForm.issuePlace}
                          onChange={(e) => setCinForm({ ...cinForm, issuePlace: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Date de délivrance</Label>
                        <Input
                          type="date"
                          value={cinForm.issueDate}
                          onChange={(e) => setCinForm({ ...cinForm, issueDate: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-zinc-300">Numéro CIN</Label>
                        <Input
                          value={cinForm.cinNumber}
                          onChange={(e) => setCinForm({ ...cinForm, cinNumber: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Statut</Label>
                        <Select value={cinForm.status} onValueChange={(value) => setCinForm({ ...cinForm, status: value })}>
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="verified">Vérifiée</SelectItem>
                            <SelectItem value="rejected">Rejetée</SelectItem>
                            <SelectItem value="duplicate">Doublon</SelectItem>
                            <SelectItem value="suspicious">Suspect</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-zinc-300">Notes</Label>
                        <textarea
                          value={cinForm.notes}
                          onChange={(e) => setCinForm({ ...cinForm, notes: e.target.value })}
                          className="w-full h-20 bg-zinc-900 border-zinc-700 text-white rounded p-2"
                        />
                      </div>
                    </div>
                    {similarities.length > 0 && (
                      <div className="p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                        <p className="text-orange-400 font-mono mb-2">⚠️ Similitudes détectées :</p>
                        <ul className="space-y-1 text-sm">
                          {similarities.map((sim, idx) => (
                            <li key={idx} className="text-orange-300 cursor-pointer hover:underline" onClick={() => handleSimilarClick(sim)}>
                              {sim.name} ({sim.fields})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-2 p-2 bg-zinc-900 rounded border border-zinc-700">
                      <Label className="text-zinc-300 flex items-center space-x-2">
                        <Checkbox
                          checked={modalConfig.item.cinVerified || false}
                          onCheckedChange={(checked) => handleCinVerifyAction('toggleVerified', modalConfig.item)}
                          className="border-zinc-500 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-zinc-900"
                        />
                        <span>Marquer CIN comme vérifié (utilisateur)</span>
                      </Label>
                    </div>
                    <DialogFooter className="border-t border-zinc-700 pt-4 flex-shrink-0">
                      <Button type="button" variant="outline" onClick={closeModal} className="bg-zinc-700 hover:bg-zinc-700/80 text-white border-zinc-600 font-bold transition">
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold transition">Enregistrer</Button>
                    </DialogFooter>
                  </form>
                </div>
              </div>
            ) : modalConfig.type === 'duplicateAlert' ? (
              <div className="py-4 px-6 text-zinc-300 font-mono text-sm space-y-2">
                <p>Similitudes pour {modalConfig.item?.name}:</p>
                <ul className="space-y-1">
                  {similarities.map((sim, idx) => (
                    <li key={idx} className="text-orange-400 cursor-pointer hover:underline" onClick={() => handleSimilarClick(sim)}>
                      {sim.name} ({sim.fields})
                    </li>
                  ))}
                </ul>
                <Button onClick={() => openModal('cinVerify', modalConfig.item, `Modifier ${modalConfig.item?.name}`)} className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-zinc-900">
                  Modifier
                </Button>
              </div>
            ) : (
              <div className="py-4 px-6 text-zinc-300 font-mono text-sm">
                 {modalConfig.message}
              </div>
            )}
          </div>
          
          {(['userView'].includes(modalConfig.type)) && (
             <DialogFooter className="flex-shrink-0 border-t border-zinc-700 p-4 sticky bottom-0 bg-zinc-800/95">
                <Button type="button" onClick={closeModal} className="w-full sm:w-auto bg-zinc-700 hover:bg-zinc-700/80 text-white font-bold transition">
                  Fermer
                </Button>
             </DialogFooter>
          )}
          
          {['duplicateAlert'].includes(modalConfig.type) && (
             <DialogFooter className="flex-shrink-0 border-t border-zinc-700 pt-4 px-6">
                <Button type="button" variant="outline" onClick={closeModal} className="bg-zinc-700 hover:bg-zinc-700/80 text-white border-zinc-600 font-bold transition">
                  Fermer
                </Button>
             </DialogFooter>
          )}
          
          {(modalConfig.type !== 'userView' && modalConfig.type !== 'userEdit' && modalConfig.type !== 'cinVerify' && modalConfig.type !== 'duplicateAlert') && (
            <DialogFooter className="flex-shrink-0 border-t border-zinc-700 pt-4 px-6">
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}