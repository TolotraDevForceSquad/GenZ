// components/AdminSOSLiberation.tsx
import React, { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
    Search,
    MoreHorizontal,
    Eye,
    CheckCircle,
    Clock,
    Trash2,
    Play,
    MapPin,
    User,
    Calendar,
    FileText,
    AlertTriangle
} from "lucide-react";

interface AdminSOSLiberationProps {
    authHeaders: any;
}

interface SOSPost {
    id: string;
    personName: string;
    personDescription: string;
    personImageUrl: string;
    arrestVideoUrl?: string;
    arrestDescription: string;
    location: string;
    status: 'en-detention' | 'liberer';
    validation: boolean;
    arrestDate: string;
    arrestedBy: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
        profileImageUrl?: string;
        isAdmin: boolean;
        hasCIN: boolean;
        isActive: boolean;
    };
    view: number;
    resolvedAt?: string;
    createdAt: string;
}

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, url, title }) => {
    if (!isOpen) return null;

    const VideoContent: React.FC<{ url: string; title: string }> = ({ url, title }) => {
        // YouTube Embed
        if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
            let videoId = '';
            if (url.includes('v=')) {
                videoId = url.split('v=')[1]?.split('&')[0] || '';
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
            }

            if (videoId) {
                return (
                    <div className="relative w-full aspect-video bg-black">
                        <iframe
                            className="w-full h-full border-none"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                );
            }
        }

        // Direct Video File
        if (url.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
            return (
                <div className="relative w-full bg-black rounded-lg overflow-hidden">
                    <video controls className="w-full max-h-[70vh]">
                        <source src={url} />
                        Désolé, votre navigateur ne supporte pas la vidéo intégrée.
                    </video>
                </div>
            );
        }

        return (
            <div className="p-4 bg-gray-900 rounded-lg text-center">
                <p className="text-gray-300 mb-3">Impossible d'intégrer ce lien vidéo directement.</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center p-3 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-blue-400 transition"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Ouvrir la Vidéo (Lien Externe)
                </a>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-zinc-800 border-zinc-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-yellow-400">Vidéo: {title}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Visionnage de la vidéo d'arrestation
                    </DialogDescription>
                </DialogHeader>
                <VideoContent url={url} title={title} />
            </DialogContent>
        </Dialog>
    );
};

const DetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    post: SOSPost | null;
    onStatusChange: (postId: string, status: SOSPost['status']) => void;
}> = ({ isOpen, onClose, post, onStatusChange }) => {
    if (!isOpen || !post) return null;

    const handleStatusChange = async (newStatus: SOSPost['status']) => {
        try {
            const response = await fetch(`/api/liberers/${post.id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    authorId: 'admin'
                }),
            });

            if (response.ok) {
                onStatusChange(post.id, newStatus);
                toast({
                    title: "Succès",
                    description: `Statut changé en "${newStatus === 'liberer' ? 'Libéré' : 'En détention'}"`,
                });
                onClose();
            } else {
                throw new Error('Échec de la mise à jour');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour le statut",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-zinc-800 border-zinc-700 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-yellow-400 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Détails SOS Libération - {post.personName}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne gauche - Informations principales */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Image et statut */}
                        <Card className="bg-zinc-900 border-zinc-700">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <img
                                        src={post.personImageUrl}
                                        alt={post.personName}
                                        className="w-32 h-32 object-cover rounded-lg border-2 border-yellow-400/50"
                                    />
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <Label className="text-zinc-400 text-sm">Nom de la personne</Label>
                                            <p className="text-white font-semibold text-lg">{post.personName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-zinc-400 text-sm">Statut actuel</Label>
                                            <Badge className={
                                                post.status === 'liberer'
                                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                                    : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                            }>
                                                {post.status === 'liberer' ? '🟢 Libéré' : '🟠 En détention'}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleStatusChange('liberer')}
                                                disabled={post.status === 'liberer'}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Marquer Libéré
                                            </Button>
                                            <Button
                                                onClick={() => handleStatusChange('en-detention')}
                                                disabled={post.status === 'en-detention'}
                                                variant="outline"
                                                className="border-orange-600 text-orange-400 hover:bg-orange-600/20"
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                Marquer Détention
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Description */}
                        <Card className="bg-zinc-900 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-yellow-400" />
                                    Description
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-zinc-300">{post.personDescription}</p>
                            </CardContent>
                        </Card>

                        {/* Détails de l'arrestation */}
                        <Card className="bg-zinc-900 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Détails de l'arrestation</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-zinc-300">{post.arrestDescription}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-red-500" />
                                        <span className="text-zinc-300"><strong>Lieu:</strong> {post.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        <span className="text-zinc-300"><strong>Date:</strong> {new Date(post.arrestDate).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-purple-500" />
                                        <span className="text-zinc-300"><strong>Arrêté par:</strong> {post.arrestedBy}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-green-500" />
                                        <span className="text-zinc-300"><strong>Vues:</strong> {post.view}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Colonne droite - Informations complémentaires */}
                    <div className="space-y-6">
                        {/* Auteur */}
                        <Card className="bg-zinc-900 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Auteur</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 border-2 border-yellow-400/50">
                                        <AvatarImage src={post.author.avatar} alt={post.author.name} />
                                        <AvatarFallback className="bg-zinc-700 text-yellow-400">
                                            {post.author.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-white font-semibold">@{post.author.name}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {post.author.hasCIN && (
                                                <Badge className="bg-blue-500/20 text-blue-400 text-xs">Vérifié</Badge>
                                            )}
                                            {post.author.isAdmin && (
                                                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Admin</Badge>
                                            )}
                                            {!post.author.isActive && (
                                                <Badge className="bg-red-500/20 text-red-400 text-xs">Inactif</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dates */}
                        <Card className="bg-zinc-900 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Dates</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <Label className="text-zinc-400">Créé le</Label>
                                    <p className="text-white">{new Date(post.createdAt).toLocaleString('fr-FR')}</p>
                                </div>
                                {post.resolvedAt && (
                                    <div>
                                        <Label className="text-zinc-400">Résolu le</Label>
                                        <p className="text-white">{new Date(post.resolvedAt).toLocaleString('fr-FR')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Vidéo */}
                        {post.arrestVideoUrl && (
                            <Card className="bg-zinc-900 border-zinc-700">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">Vidéo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        onClick={() => {
                                            const videoModal = document.createElement('div');
                                            videoModal.id = 'video-modal-container';
                                            document.body.appendChild(videoModal);
                                            // Le modal vidéo s'ouvrira via le state dans le composant parent
                                        }}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Voir la vidéo
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function AdminSOSLiberation({ authHeaders }: AdminSOSLiberationProps) {
    const [posts, setPosts] = useState<SOSPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'en-detention' | 'liberer'>('all');
    const [selectedPost, setSelectedPost] = useState<SOSPost | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);

    // Charger les données
    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/liberers', {
                headers: authHeaders,
            });

            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            } else {
                throw new Error('Erreur lors du chargement des données');
            }
        } catch (error) {
            console.error('Error fetching SOS posts:', error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les SOS Libérations",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchPosts();
    }, []);

    // Filtrer les posts
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const matchesSearch =
                post.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.arrestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.author.name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || post.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [posts, searchTerm, statusFilter]);

    // Gérer les actions
    const handleStatusChange = (postId: string, newStatus: SOSPost['status']) => {
        setPosts(prev => prev.map(post =>
            post.id === postId ? { ...post, status: newStatus } : post
        ));
    };

    const getCurrentUserId = () => {
        const token = localStorage.getItem('authToken');
        if (!token) return null;

        // Le token est simplement l'ID utilisateur dans votre système
        return token;
    };

    // Modifiez la fonction handleDelete :
    const handleDelete = async (postId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) return;

        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
            toast({
                title: "Erreur",
                description: "Utilisateur non authentifié",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(`/api/liberers/${postId}`, {
                method: 'DELETE',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ authorId: currentUserId }), // Utilisez le vrai ID
            });

            if (response.ok) {
                setPosts(prev => prev.filter(post => post.id !== postId));
                toast({
                    title: "Succès",
                    description: "Publication supprimée avec succès",
                });
            } else {
                throw new Error('Échec de la suppression');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer la publication",
                variant: "destructive",
            });
        }
    };

    const handleViewDetails = (post: SOSPost) => {
        setSelectedPost(post);
        setDetailModalOpen(true);
    };

    const handleViewVideo = (post: SOSPost) => {
        if (post.arrestVideoUrl) {
            setSelectedVideo({ url: post.arrestVideoUrl, title: post.personName });
            setVideoModalOpen(true);
        }
    };

    const getStatusBadge = (status: SOSPost['status']) => {
        switch (status) {
            case 'en-detention':
                return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">En détention</Badge>;
            case 'liberer':
                return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Libéré</Badge>;
            default:
                return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                    <p className="text-zinc-400 mt-4">Chargement des SOS Libérations...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="bg-zinc-800 border-zinc-700 shadow-xl shadow-zinc-950/50">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl text-white uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                                Gestion des SOS Libérations
                            </CardTitle>
                            <CardDescription className="text-zinc-400 font-mono text-sm">
                                Gérez les demandes de libération et les cas de détention
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Rechercher..."
                                    className="pl-10 w-full sm:w-64 bg-zinc-900 border-zinc-700 text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(value: 'all' | 'en-detention' | 'liberer') => setStatusFilter(value)}>
                                <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="en-detention">En détention</SelectItem>
                                    <SelectItem value="liberer">Libéré</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-xl border border-zinc-700 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-900 border-zinc-700">
                                <TableRow>
                                    <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">
                                        Personne
                                    </TableHead>
                                    <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">
                                        Auteur
                                    </TableHead>
                                    <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">
                                        Localisation
                                    </TableHead>
                                    <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">
                                        Statut
                                    </TableHead>
                                    <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">
                                        Date
                                    </TableHead>
                                    <TableHead className="text-yellow-400 text-xs uppercase tracking-wider font-mono">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPosts.map((post) => (
                                    <TableRow key={post.id} className="border-zinc-700 hover:bg-zinc-700/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={post.personImageUrl}
                                                    alt={post.personName}
                                                    className="w-10 h-10 object-cover rounded-lg border border-yellow-400/30"
                                                />
                                                <div>
                                                    <p className="font-semibold text-white">{post.personName}</p>
                                                    <p className="text-xs text-zinc-500 line-clamp-1">{post.personDescription}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={post.author.avatar} />
                                                    <AvatarFallback className="bg-zinc-700 text-yellow-400 text-xs">
                                                        {post.author.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-zinc-300">{post.author.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-zinc-300">
                                                {post.location}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(post.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-zinc-300 font-mono">
                                                {new Date(post.createdAt).toLocaleDateString()}
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
                                                    <DropdownMenuItem onClick={() => handleViewDetails(post)} className="hover:bg-zinc-700">
                                                        <Eye className="mr-2 h-4 w-4 text-yellow-400" />
                                                        Voir détails
                                                    </DropdownMenuItem>
                                                    {post.arrestVideoUrl && (
                                                        <DropdownMenuItem onClick={() => handleViewVideo(post)} className="hover:bg-zinc-700">
                                                            <Play className="mr-2 h-4 w-4 text-red-400" />
                                                            Voir vidéo
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(post.id)}
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

                    {filteredPosts.length === 0 && (
                        <div className="text-center py-8 text-zinc-500">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                            <p>Aucune SOS Libération trouvée</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de détails */}
            <DetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                post={selectedPost}
                onStatusChange={handleStatusChange}
            />

            {/* Modal vidéo */}
            <VideoModal
                isOpen={videoModalOpen}
                onClose={() => setVideoModalOpen(false)}
                url={selectedVideo?.url || ''}
                title={selectedVideo?.title || ''}
            />
        </>
    );
}