// components/ProfilePage.tsx - Design DARK et RESPONSIVE
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query'; // ✅ AJOUTÉ: Import pour invalider les queries
import { Upload, Shield, CheckCircle, User, Phone, Mail, Camera, MapPin, Trash2, AlertCircle, Edit, ChevronDown } from "lucide-react";

type Location = {
  nom: string;
  latitude: number;
  longitude: number;
};

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

const getRegionFileName = (region: string): string => {
  return region
    .toLowerCase()
    .replace(/['\s]/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const searchLocations = (query: string, locations: Location[]): Location[] => {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return locations.filter(location => 
    location.nom.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
};

interface ProfilePageProps {
    token: string; // Token = user.id, passé depuis App.tsx
}

interface FullUser {
    id: string;
    name: string;
    phone: string;
    email?: string;
    avatar?: string;
    hasCIN: boolean;
    joinedAt: string;
    alertsCount: number;
    validationsCount: number;
    neighborhood?: string;
    firstName?: string;
    lastName?: string;
    latitude?: number;
    longitude?: number;
    region?: string;
    cinUploadedFront?: boolean;
    cinUploadedBack?: boolean;
    cinUploadFrontUrl?: string;
    cinUploadBackUrl?: string;
    cinVerified?: boolean;
    cinVerifiedAt?: string;
    cinVerifiedBy?: string;
    isAdmin?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export default function ProfilePage({ token }: ProfilePageProps) {
    const queryClient = useQueryClient(); // ✅ AJOUTÉ: Instance pour invalider les queries globales
    const [user, setUser] = useState<FullUser | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        neighborhood: '',
        latitude: '',
        longitude: '',
        region: '',
    });
    const [avatarVersion, setAvatarVersion] = useState(0);
    const [cinFrontVersion, setCinFrontVersion] = useState(0);
    const [cinBackVersion, setCinBackVersion] = useState(0);
    const [showRegionDropdown, setShowRegionDropdown] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [regionLocations, setRegionLocations] = useState<Location[]>([]);
    const [suggestions, setSuggestions] = useState<Location[]>([]);

    // ✅ AJOUTÉ: Base URL pour les images CIN et avatar (backend sur port 5005)
    const BASE_URL = window.location.origin;

    // LOGIQUE INCHANGÉE
    const refetchUser = async () => {
        if (!token) {
            setError('Non authentifié. Vérifiez votre session.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data: FullUser = await res.json();
                setUser(data);
                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    neighborhood: data.neighborhood || '',
                    latitude: data.latitude?.toString() || '',
                    longitude: data.longitude?.toString() || '',
                    region: data.region || '',
                });
                setSelectedRegion(data.region || '');
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || 'Échec de la récupération du profil.');
            }
        } catch (err) {
            console.error('Erreur fetch profil:', err);
            setError('Erreur de connexion lors de la récupération du profil.');
        } finally {
            setIsLoading(false);
        }
    };

    // Charger les données de la région sélectionnée
    useEffect(() => {
        if (selectedRegion) {
            const loadRegionData = async () => {
                try {
                    const fileName = getRegionFileName(selectedRegion);
                    const regionData = await import(`./types/${fileName}.json`);
                    setRegionLocations(regionData.default || regionData);
                    setFormData(prev => ({ ...prev, region: selectedRegion }));
                } catch (error) {
                    console.error(`Erreur lors du chargement des données pour ${selectedRegion}:`, error);
                    setRegionLocations([]);
                }
            };
            
            loadRegionData();
        } else {
            setRegionLocations([]);
        }
    }, [selectedRegion]);

    useEffect(() => {
        refetchUser();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) return;

        const body = {
            firstName: formData.firstName || undefined,
            lastName: formData.lastName || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            neighborhood: formData.neighborhood || undefined,
            latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
            longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
            region: formData.region || undefined,
        };

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                // ✅ MODIFIÉ: Recharger les données après mise à jour pour s'assurer de la cohérence
                await refetchUser();
                // ✅ AJOUTÉ: Invalider la query currentUser pour propager les changements partout
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
                setIsEditing(false);
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || 'Échec de la mise à jour du profil.');
            }
        } catch (err) {
            console.error('Erreur update profil:', err);
            setError('Erreur de connexion lors de la mise à jour du profil.');
        }
    };

    const handleCINUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (!file || !user || !token) return;

        const formDataUpload = new FormData();
        formDataUpload.append(side, file);

        try {
            const res = await fetch(`/api/users/${user.id}/cin-upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload,
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                // ✅ AJOUTÉ: Incrémente la version pour le côté concerné
                if (side === 'front') {
                    setCinFrontVersion(prev => prev + 1);
                } else {
                    setCinBackVersion(prev => prev + 1);
                }
                // ✅ AJOUTÉ: Invalider la query pour propager les changements (ex: hasCIN)
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
                e.target.value = '';
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || `Échec de l'upload du ${side === 'front' ? 'recto' : 'verso'}.`);
            }
        } catch (err) {
            console.error('Erreur upload CIN:', err);
            setError(`Erreur de connexion lors de l'upload du ${side === 'front' ? 'recto' : 'verso'}.`);
        }
    };

    const handleDeleteCINSide = async (side: 'front' | 'back') => {
        if (!user || !token) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer le ${side === 'front' ? 'recto' : 'verso'} de votre CIN ?`)) return;

        try {
            console.log(`Deleting CIN side: ${side}`); // ✅ AJOUTÉ: Log pour debug frontend
            const res = await fetch(`/api/users/${user.id}/cin`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ side }),
            });
            if (res.ok) {
                const data = await res.json();
                console.log('Delete response user:', data.user); // ✅ AJOUTÉ: Log réponse
                setUser(data.user);
                // ✅ AJOUTÉ: Incrémente la version pour forcer le re-rendu (même si URL null)
                if (side === 'front') {
                    setCinFrontVersion(prev => prev + 1);
                } else {
                    setCinBackVersion(prev => prev + 1);
                }
                // ✅ AJOUTÉ: Invalider la query pour propager les changements (ex: hasCIN)
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || `Échec de la suppression du ${side === 'front' ? 'recto' : 'verso'}.`);
            }
        } catch (err) {
            console.error('Erreur delete CIN:', err);
            setError(`Erreur de connexion lors de la suppression du ${side === 'front' ? 'recto' : 'verso'}.`);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !token) return;

        const userNameSafe = user.name.replace(/[^a-zA-Z0-9]/g, '_');
        const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')) || '.jpeg' : '.jpeg';
        const suggestedFilename = `avatar_${userNameSafe}${ext}`;
        console.log('Upload avatar suggéré:', suggestedFilename);

        const formDataUpload = new FormData();
        formDataUpload.append('avatar', file);
        formDataUpload.append('filename', suggestedFilename);

        try {
            const res = await fetch(`/api/users/${user.id}/avatar-upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload,
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user); // Met à jour avec le nouvel avatar (chemin /uploads/avatar_... rempli par backend)
                setAvatarVersion(prev => prev + 1); // ✅ AJOUTÉ: Incrémente la version pour bypasser le cache
                // ✅ AJOUTÉ: Invalider la query pour propager le nouvel avatar partout
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
                e.target.value = '';
                console.log('Avatar uploadé avec succès:', data.user.avatar);
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || 'Échec de l\'upload de l\'avatar.');
            }
        } catch (err) {
            console.error('Erreur upload avatar:', err);
            setError('Erreur de connexion lors de l\'upload de l\'avatar.');
        }
    };

    const handleDeleteProfile = async () => {
        if (!user || !token) return;

        if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et supprimera toutes vos données, alertes et validations.')) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                // ✅ AJOUTÉ: Invalider avant redirection (pour cohérence, même si on redirige)
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
                alert('Votre compte a été supprimé avec succès. Vous allez être redirigé vers la page d\'accueil.');
                // Redirection vers la page d'accueil ou de connexion (ajustez selon votre routing)
                window.location.href = '/';
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || 'Échec de la suppression du compte.');
            }
        } catch (err) {
            console.error('Erreur delete profil:', err);
            setError('Erreur de connexion lors de la suppression du compte.');
        }
    };

    const handleNeighborhoodChange = (value: string) => {
        setFormData(prev => ({ ...prev, neighborhood: value }));
        const newSuggestions = searchLocations(value, regionLocations);
        setSuggestions(newSuggestions);
    };

    const selectLocation = (location: Location) => {
        setFormData(prev => ({
            ...prev,
            neighborhood: location.nom,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString()
        }));
        setSuggestions([]);
    };

    const handleNeighborhoodBlur = () => {
        setTimeout(() => setSuggestions([]), 200);
    };

    const handleRegionSelect = (region: string) => {
        setSelectedRegion(region);
        setShowRegionDropdown(false);
        // Réinitialiser les données de localisation quand la région change
        setFormData(prev => ({
            ...prev,
            region: region,
            neighborhood: '',
            latitude: '',
            longitude: ''
        }));
    };

    // LOGIQUE INCHANGÉE
    if (isLoading) {
        return <div className="min-h-screen bg-[#161313] flex items-center justify-center text-white">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500 mb-4"></div>
                <p className="text-lg">Chargement du profil...</p>
            </div>
        </div>;
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-[#161313] flex flex-col items-center justify-center text-white p-4">
                <div className="text-red-500 text-center mb-6 text-xl font-medium">{error || 'Profil non trouvé.'}</div>
                {error && <Button onClick={() => window.location.reload()} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold">Réessayer</Button>}
            </div>
        );
    }

    const getStatusText = () => {
        if (user.cinVerified) return 'Identité Vérifiée';
        if (user.cinUploadedFront || user.cinUploadedBack) return 'En attente de vérification';
        return 'Non vérifié';
    };

    const getStatusVariant = () => {
        if (user.cinVerified) return 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30';
        if (user.cinUploadedFront || user.cinUploadedBack) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30';
        return 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700';
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

    const getFullCINUrl = (relativeUrl?: string, side: 'front' | 'back') => {
        const version = side === 'front' ? cinFrontVersion : cinBackVersion;
        return relativeUrl ? `${BASE_URL}${relativeUrl}?v=${version}` : undefined;
    };

    const getFullAvatarUrl = (relativeUrl?: string) => 
        relativeUrl ? `${BASE_URL}${relativeUrl}?v=${avatarVersion}` : undefined;

    // ✅ MODIFIÉ: CINSlot optimisé pour le mobile/dark mode
    const CINSlot = ({ side, label, isPending = false }: { side: 'front' | 'back'; label: string; isPending?: boolean }) => {
        const sideLabel = side === 'front' ? 'recto' : 'verso';
        const hasUrl = side === 'front' ? !!user.cinUploadFrontUrl : !!user.cinUploadBackUrl;
        const url = side === 'front' ? user.cinUploadFrontUrl : user.cinUploadBackUrl;
        const inputId = `cin-${side}`;
        const finalLabel = isPending && hasUrl ? `${label} (actuel)` : label;

        return (
            <div className="space-y-3">
                <Label htmlFor={inputId} className="text-sm font-medium text-gray-300 block">
                    {finalLabel}
                </Label>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCINUpload(e, side)}
                />
                {hasUrl ? (
                    <div className="group relative w-full overflow-hidden rounded-xl border border-zinc-700 shadow-lg">
                        <img
                            src={getFullCINUrl(url, side)}
                            alt={`CIN ${sideLabel}`}
                            className="w-full h-40 object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        {/* Overlay d'actions pour le mobile */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                            <Button
                                size="icon"
                                variant="default"
                                type="button"
                                onClick={() => document.getElementById(inputId)?.click()}
                                className="h-10 w-10 p-0 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-full shadow-md"
                                title="Remplacer le fichier"
                            >
                                <Upload className="w-5 h-5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="destructive"
                                type="button"
                                onClick={() => handleDeleteCINSide(side)}
                                className="h-10 w-10 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md"
                                title="Supprimer le fichier"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                        {/* {isPending && (
                <Badge className="absolute top-2 left-2 bg-yellow-500 text-gray-900 hover:bg-yellow-500/80">En cours</Badge>
            )} */}
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full h-40 flex flex-col items-center justify-center gap-2 mt-2 border-dashed border-2 border-zinc-700 text-gray-400 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition"
                        type="button"
                        onClick={() => document.getElementById(inputId)?.click()}
                    >
                        <Upload className="w-8 h-8 text-yellow-500" />
                        <span className="text-sm font-semibold">Uploader le {sideLabel}</span>
                        <span className="text-xs text-gray-500">(Format: JPG, PNG | Max 5MB)</span>
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#161313] text-white">
            {/* Header */}
            <div className='flex flex-col items-center px-4 sm:px-6 text-center'>
                <h1 className="text-3xl font-extrabold text-yellow-400 tracking-wider mt-6">Mon Profil</h1>
                <p className="text-zinc-400 font-mono text-sm">
                    Gérez vos informations personnelles et votre statut de vérification.
                </p>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
                {error && <div className="mb-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 font-medium">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* COLONNE 1: Carte de profil et statistiques */}
                    <Card className="md:col-span-1 bg-zinc-800 border-zinc-700 shadow-xl">
                        <CardHeader className="text-center p-6">
                            <div className="relative inline-block mx-auto mb-4 group">
                                <label htmlFor="avatar-upload" className="cursor-pointer">
                                    <Avatar className="w-28 h-28 mx-auto border-4 border-yellow-500 overflow-hidden">
                                        <AvatarImage
                                            src={getFullAvatarUrl(user.avatar)}
                                            alt={user.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="text-3xl bg-yellow-500 text-gray-900 font-bold">
                                            {user.name.charAt(0)}
                                        </AvatarFallback>

                                        {/* Overlay caméra */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </Avatar>
                                </label>

                                {/* Input caché */}
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                            </div>
                            <CardTitle className="flex flex-col items-center gap-2 text-xl font-extrabold text-white">
                                {user.name}
                                <div className="flex items-center gap-2 mt-1">
                                    {user.cinVerified && <Shield className="w-5 h-5 text-green-400 fill-green-400/20" />}
                                    {!user.cinVerified && (user.cinUploadedFront || user.cinUploadedBack) && <AlertCircle className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />}
                                </div>
                            </CardTitle>
                            <CardDescription className="text-gray-400 mt-1">Membre depuis le {formatDate(user.joinedAt)}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-6">
                            <div className="text-center">
                                <Badge className={`px-4 py-1.5 text-sm font-semibold rounded-full ${getStatusVariant()}`}>
                                    {getStatusText()}
                                </Badge>
                            </div>
                            <div className="flex justify-around gap-4 text-center border-t border-zinc-700 pt-4">
                                <div>
                                    <p className="text-3xl font-bold text-yellow-500">{user.alertsCount}</p>
                                    <p className="text-sm text-gray-400">Alertes</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-yellow-500">{user.validationsCount}</p>
                                    <p className="text-sm text-gray-400">Validations</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* COLONNE 2: Formulaire d'informations personnelles */}
                    <Card className="md:col-span-2 bg-zinc-800 border-zinc-700 shadow-xl">
                        <CardHeader>
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div>
                                    <CardTitle className="text-xl text-white">Détails du compte</CardTitle>
                                    <CardDescription className="text-gray-400">Gérez vos informations de contact et de localisation.</CardDescription>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant={isEditing ? 'destructive' : 'outline'}
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`font-semibold ${isEditing ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-zinc-600 hover:bg-zinc-700 text-gray-300'}`}
                                    >
                                        {isEditing ? 'Annuler' : <><Edit className="w-4 h-4 mr-2" /> Modifier</>}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Champs Prénom/Nom de famille */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName" className="text-gray-300">Prénom</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="firstName"
                                                value={formData.firstName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                                disabled={!isEditing}
                                                className="pl-10 bg-zinc-700/50 border-zinc-700 text-white placeholder-gray-500 focus:bg-zinc-700 focus:ring-yellow-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className="text-gray-300">Nom de famille</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="lastName"
                                                value={formData.lastName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                                disabled={!isEditing}
                                                className="pl-10 bg-zinc-700/50 border-zinc-700 text-white placeholder-gray-500 focus:bg-zinc-700 focus:ring-yellow-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Champs Email/Téléphone */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-gray-300">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                disabled={!isEditing}
                                                className="pl-10 bg-zinc-700/50 border-zinc-700 text-white placeholder-gray-500 focus:bg-zinc-700 focus:ring-yellow-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-gray-300">Téléphone</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="phone"
                                                value={formData.phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                disabled={!isEditing}
                                                className="pl-10 bg-zinc-700/50 border-zinc-700 text-white placeholder-gray-500 focus:bg-zinc-700 focus:ring-yellow-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sélecteur de Région */}
                                <div className="space-y-2 relative">
                                    <Label htmlFor="region" className="text-gray-300">Région</Label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            disabled={!isEditing}
                                            className="w-full flex items-center justify-between p-3 bg-zinc-700/50 border border-zinc-700 rounded-md text-white text-left hover:border-yellow-500 focus:border-yellow-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => isEditing && setShowRegionDropdown(!showRegionDropdown)}
                                        >
                                            <span>{selectedRegion || "Choisissez votre région"}</span>
                                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isEditing && showRegionDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {regions.map((region) => (
                                                    <div
                                                        key={region}
                                                        onClick={() => handleRegionSelect(region)}
                                                        className="p-3 cursor-pointer hover:bg-yellow-500 hover:text-black text-sm border-b border-zinc-700 last:border-b-0 transition-colors"
                                                    >
                                                        {region}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Sélectionnez votre région pour charger les localités
                                        {selectedRegion && (
                                            <span className="block mt-1 text-gray-400">
                                                Fichier chargé: <code>{getRegionFileName(selectedRegion)}.json</code>
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Quartier (Full width pour les suggestions) */}
                                <div className="space-y-2 relative">
                                    <Label htmlFor="neighborhood" className="text-gray-300">Quartier/Localité</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                        <Input
                                            id="neighborhood"
                                            type="text"
                                            autoComplete="off"
                                            placeholder={
                                                selectedRegion 
                                                    ? "Recherchez votre quartier/localité" 
                                                    : "Veuillez d'abord sélectionner une région"
                                            }
                                            className="pl-10 bg-zinc-700/50 border-zinc-700 text-white focus:border-yellow-500 disabled:opacity-50 focus:bg-zinc-700 focus:ring-yellow-500"
                                            value={formData.neighborhood}
                                            onChange={(e) => isEditing && handleNeighborhoodChange(e.target.value)}
                                            onBlur={handleNeighborhoodBlur}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    {isEditing && suggestions.length > 0 && formData.neighborhood && (
                                        <ul className="absolute z-50 w-full bg-zinc-700 border border-yellow-500/50 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                            {suggestions.map((location) => (
                                                <li
                                                    key={location.nom}
                                                    onClick={() => selectLocation(location)}
                                                    className="p-3 cursor-pointer hover:bg-yellow-500 hover:text-black text-sm border-b border-zinc-600 last:border-b-0"
                                                >
                                                    <div className="font-medium text-white hover:text-black">{location.nom}</div>
                                                    <div className="text-xs text-gray-400 hover:text-black">
                                                        Lat: {location.latitude}, Lng: {location.longitude}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        {selectedRegion 
                                            ? `Recherchez votre quartier/localité dans ${selectedRegion} (${suggestions.length} résultats)` 
                                            : "Veuillez sélectionner une région pour activer la recherche"}
                                    </p>
                                </div>

                                {/* Champs Localisation (Latitude/Longitude) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude" className="text-gray-300">Latitude</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="latitude"
                                                type="number"
                                                step="any"
                                                value={formData.latitude}
                                                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                                                disabled={!isEditing}
                                                className="pl-10 bg-zinc-700/50 border-zinc-700 text-white placeholder-gray-500 focus:bg-zinc-700 focus:ring-yellow-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude" className="text-gray-300">Longitude</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="longitude"
                                                type="number"
                                                step="any"
                                                value={formData.longitude}
                                                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                                                disabled={!isEditing}
                                                className="pl-10 bg-zinc-700/50 border-zinc-700 text-white placeholder-gray-500 focus:bg-zinc-700 focus:ring-yellow-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <Button type="submit" className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold">
                                        Sauvegarder les modifications
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* COLONNE 3: Vérification d'identité (sur toute la largeur) */}
                    <Card className="md:col-span-3 bg-zinc-800 border-zinc-700 shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-white">
                                <Shield className="w-5 h-5 text-yellow-500" />
                                Vérification d'identité (CIN)
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Uploadez votre carte d'identité nationale pour devenir un utilisateur vérifié.

                                <br/><br/>Votre vie privée nous tient à cœur
                                Nous veillons à la protection de vos données personnelles avec la plus grande rigueur. Les informations que vous partagez sont sécurisées, utilisées uniquement pour améliorer nos services et ne seront jamais communiquées sans votre accord.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {user.cinVerified ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20 shadow-md">
                                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-green-400 text-lg">Identité vérifiée !</p>
                                            <p className="text-sm text-gray-400 mt-0.5">
                                                Validée le <strong className="text-white">{formatDate(user.cinVerifiedAt || '')}</strong> par {user.cinVerifiedBy || 'un administrateur'}.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <CINSlot side="front" label="Recto de la CIN" isPending={false} />
                                        <CINSlot side="back" label="Verso de la CIN" isPending={false} />
                                    </div>
                                </div>
                            ) : (user.cinUploadedFront || user.cinUploadedBack) ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 shadow-md">
                                        <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-yellow-400 text-lg">Vérification en cours</p>
                                            <p className="text-sm text-gray-400 mt-0.5">Votre CIN a été uploadée. Le traitement prend généralement 24-48h.</p>
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <CINSlot side="front" label="Recto de la CIN" isPending={true} />
                                        <CINSlot side="back" label="Verso de la CIN" isPending={true} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-zinc-700/50 rounded-xl border border-zinc-700 shadow-md">
                                        <div className="flex items-start gap-3">
                                            <Upload className="w-6 h-6 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium text-gray-300 text-lg">Aucune CIN uploadée</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Pour bénéficier de la vérification automatique des alertes, veuillez uploader une photo claire de votre carte d'identité.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <CINSlot side="front" label="Recto de la CIN" isPending={false} />
                                        <CINSlot side="back" label="Verso de la CIN" isPending={false} />
                                    </div>

                                    <div className="text-xs text-gray-500 space-y-1 p-3 bg-zinc-800 rounded-lg">
                                        <p className="font-medium text-white">Directives d'Upload :</p>
                                        <p>• Format accepté : JPG, PNG (max 5MB)</p>
                                        <p>• Assurez-vous que toutes les informations sont lisibles et non coupées.</p>
                                        <p>• Vos données sont sécurisées et utilisées uniquement à des fins de vérification.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Section Danger Zone (bottom)
                    <Card className="md:col-span-3 bg-red-900/10 border-red-900 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-red-400">
                <AlertCircle className="w-5 h-5" />
                Zone de Danger
              </CardTitle>
              <CardDescription className="text-red-300">
                Ces actions sont irréversibles et affecteront définitivement votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-red-700 rounded-lg bg-red-900/20">
                <div>
                  <p className="font-medium text-white">Supprimer mon compte</p>
                  <p className="text-sm text-red-300">Toutes vos données, alertes et validations seront supprimées définitivement.</p>
                </div>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleDeleteProfile}
                  className="mt-4 sm:mt-0 bg-red-700 hover:bg-red-800 text-white font-bold transition flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le compte
                </Button>
              </div>
            </CardContent>
          </Card> */}

                </div>
            </div>
        </div>
    );
}