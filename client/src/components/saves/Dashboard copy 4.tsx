import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, AlertTriangle, Shield, Clock, MessageCircle, ThumbsUp, MapPin, Eye, X, Send, Play, User } from "lucide-react";
import SOSForm from "./SOSForm";
import type { Alert } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter"; // Ajouté pour redirection

// Liste des quartiers prédéfinis d'Antananarivo
const PREDEFINED_LOCATIONS = [
  "Analakely", "Andravoahangy", "Anosy", "Antaninarenina", "Antsahavola", 
  "Behoririka", "Ankadifotsy", "Ankadindramamy", "Ankadivato", "Amboditsiry",
  "Ampasampito", "Ambatobe", "Ambohidratrimo", "Ambohimanarina", "Ambohimangakely",
  "Ambohijatovo", "Ambatonakanga", "Isoraka", "Mahamasina", "Faravohitra",
  "Tsimbazaza", "Besarety", "Ankazomanga", "Andohalo", "Antsahamanitra",
  "Ampandrana", "Ambohijatovo", "Ankadikely", "Ambohibao", "Ambohimitsimbina",
  "Ambohitrimanjaka", "Ambohitrarahaba", "Ambohidrapeto", "Ambohimanga", "Ambohimandry",
  "Autre lieu (préciser)"
];

// ✅ CORRECTION: Fonction pour formater le timestamp de manière fiable
const formatTimeAgo = (timestamp: string | Date): string => {
  if (!timestamp) return "Date inconnue";
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "Date invalide";
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return "À l'instant";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return "Date invalide";
  }
};

interface FormProps {
  onSubmit: (comment: string) => void;
  onCancel: () => void;
  title: string;
  placeholder: string;
  buttonText: string;
  buttonVariant: "default" | "destructive" | "outline";
  commentType: 'green' | 'red';
}

function ValidationForm({ onSubmit, onCancel, title, placeholder, buttonText, buttonVariant, commentType }: FormProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(comment);
  };

  const getButtonClass = () => {
    switch (commentType) {
      case 'green': return 'bg-green-600 hover:bg-green-700';
      case 'red': return 'bg-red-600 hover:bg-red-700';
      default: return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="comment" className="text-gray-300">{title}</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={placeholder}
          className="mt-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300 hover:bg-gray-700">
          Annuler
        </Button>
        <Button type="submit" variant={buttonVariant} className={getButtonClass()}>
          {buttonText}
        </Button>
      </div>
    </form>
  );
}

interface CommentSectionProps {
  alertId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

function CommentSection({ alertId, currentUserId, isOpen, onClose }: CommentSectionProps) {
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', alertId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/alerts/${alertId}/comments`);
      if (!response.ok) throw new Error('Erreur de chargement des commentaires');
      return response.json();
    },
    enabled: isOpen,
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ type, content }: { type: string; content: string }) => {
      if (!currentUserId) throw new Error("Vous devez être connecté pour commenter");
      const response = await apiRequest('POST', `/api/alerts/${alertId}/comments`, { 
        type,
        content,
        userId: currentUserId
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erreur lors de la création du commentaire');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', alertId] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setComment('');
    },
    onError: (error: any) => {
      console.error('Error creating comment:', error);
      window.alert("Erreur lors de la création du commentaire: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      createCommentMutation.mutate({ type: 'text', content: comment });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'green': return 'bg-green-600 text-white';
      case 'red': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'green': return 'Confirmé';
      case 'red': return 'Rejeté';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Commentaires</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-3">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Aucun commentaire pour le moment</p>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user?.avatar} alt={comment.user?.name} />
                    <AvatarFallback className="bg-gray-600 text-white text-xs">
                      {comment.user?.name?.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-200 truncate">{comment.user?.name || 'Utilisateur inconnu'}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatTimeAgo(comment.createdAt)}</span>
                    </div>
                    {comment.type !== 'text' && (
                      <div className="mb-2">
                        <Badge className={`text-xs ${getTypeColor(comment.type)} px-2 py-0.5`}>
                          {getTypeLabel(comment.type)}
                        </Badge>
                      </div>
                    )}
                    <p className="text-gray-300 text-sm break-words">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="flex-1 bg-gray-700 border-gray-600 text-white"
            disabled={createCommentMutation.isPending}
          />
          <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={createCommentMutation.isPending || !comment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FacebookStyleAlertProps {
  alert: Alert & {
    author?: {
      id: string;
      name: string;
      avatar?: string;
      hasCIN?: boolean;
    };
    validations?: {
      confirmed: number;
      rejected: number;
    };
    views?: number;
  };
  onValidate: (alertId: string, validation: 'confirm' | 'reject' | 'resolved') => void;
  onReject: (alertId: string) => void;
  onConfirm: (alertId: string) => void;
  currentUserId?: string;
}

function FacebookStyleAlert({ alert, onValidate, onReject, onConfirm, currentUserId }: FacebookStyleAlertProps) {
  const [showFullText, setShowFullText] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<{url: string, type: 'image' | 'video'} | null>(null);
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const maxTextLength = 150;

  // ✅ CORRECTION: Gestion sécurisée des médias
  const parseMediaData = (mediaData: any) => {
    if (!mediaData) return [];
    
    if (typeof mediaData === "object") {
      if (Array.isArray(mediaData)) return mediaData;
      return [mediaData];
    }

    if (typeof mediaData === "string" && mediaData.trim() !== "") {
      return [{ filename: mediaData }];
    }

    return [];
  };

  // Fonction pour obtenir l'URL du média
  const getMediaUrl = (mediaItem: any): string => {
    if (!mediaItem) return "";
    
    if (mediaItem.url) {
      return mediaItem.url.startsWith("http") ? mediaItem.url : `http://localhost:5005${mediaItem.url}`;
    }

    if (mediaItem.filename) {
      return `http://localhost:5005/uploads/${mediaItem.filename}`;
    }

    if (typeof mediaItem === "string") {
      return `http://localhost:5005/uploads/${mediaItem}`;
    }

    return "";
  };

  const getMediaType = (mediaItem: any): 'image' | 'video' | 'unknown' => {
    if (!mediaItem) return 'unknown';

    const mediaUrl = getMediaUrl(mediaItem);
    if (!mediaUrl) return 'unknown';

    const mediaStr = String(mediaUrl).toLowerCase().trim();

    if (mediaStr.startsWith('data:image/') || /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(mediaStr)) {
      return 'image';
    }

    if (mediaStr.startsWith('data:video/') || /\.(mp4|mov|avi|mkv|webm|flv|wmv)$/i.test(mediaStr)) {
      return 'video';
    }

    return 'unknown';
  };

  const getMediaItems = () => {
    return parseMediaData(alert.media);
  };

  // ✅ CORRECTION: Gestion sécurisée des propriétés de l'auteur
  const author = alert.author || {
    id: "unknown",
    name: "Utilisateur inconnu",
    avatar: "",
    hasCIN: false
  };

  const authorName = author.name?.trim() || "Utilisateur inconnu";
  const authorAvatar = author.avatar || "";
  const authorHasCIN = author.hasCIN || false;

  // ✅ CORRECTION: Comptages sécurisés
  const confirmedCount = typeof alert.confirmedCount === 'string' 
    ? parseInt(alert.confirmedCount) || 0 
    : alert.confirmedCount || 0;

  const rejectedCount = typeof alert.rejectedCount === 'string'
    ? parseInt(alert.rejectedCount) || 0
    : alert.rejectedCount || 0;

  const viewsCount = alert.views || 0;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-orange-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-600 text-white';
      case 'fake': return 'bg-red-600 text-white';
      case 'pending': return 'bg-yellow-600 text-white';
      case 'resolved': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const shouldTruncate = alert.description && alert.description.length > maxTextLength;
  const displayText = showFullText ? alert.description : 
    (alert.description ? alert.description.substring(0, maxTextLength) : '');

  const mediaItems = getMediaItems();
  const hasMedia = mediaItems.length > 0;
  const isAuthor = author.id === currentUserId;

  // ✅ CORRECTION: Vérification si l'utilisateur a déjà voté
  const hasUserVoted = currentUserId && alert.validatedBy?.includes(currentUserId);

  const handleMediaClick = (mediaItem: any, mediaType: 'image' | 'video') => {
    const mediaUrl = getMediaUrl(mediaItem);
    if (mediaType === 'image') {
      setExpandedMedia({ url: mediaUrl, type: 'image' });
    } else if (mediaType === 'video') {
      setExpandedMedia({ url: mediaUrl, type: 'video' });
    }
  };

  const handlePlayVideo = (mediaItem: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const mediaUrl = getMediaUrl(mediaItem);
    setPlayingVideo(mediaUrl);
  };

  const handleValidate = (validation: 'confirm' | 'reject' | 'resolved') => {
    if (hasUserVoted) {
      window.alert("Vous avez déjà voté pour cette alerte !");
      return;
    }
    
    switch (validation) {
      case 'confirm':
        onConfirm(alert.id);
        break;
      case 'reject':
        onReject(alert.id);
        break;
      case 'resolved':
        onValidate(alert.id, validation);
        break;
    }
  };

  return (
    <>
      <Card className="w-full shadow-lg hover:shadow-xl transition-all duration-300 border-gray-700 bg-gray-800 backdrop-blur-sm">
        {/* En-tête compacte */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 border-2 border-gray-600 shadow-lg">
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-700 text-white text-sm font-medium">
                  {authorName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-100">{authorName}</span>
                  {authorHasCIN && (
                    <Badge variant="secondary" className="text-xs bg-blue-900 text-blue-200 px-2 py-0 border-blue-700">
                      ✓ Vérifié
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(alert.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={`text-xs ${getUrgencyColor(alert.urgency)} px-3 py-1 border-0 font-medium`}>
                {alert.urgency === 'high' ? 'Urgent' : alert.urgency === 'medium' ? 'Moyen' : 'Faible'}
              </Badge>
              <Badge className={`text-xs ${getStatusColor(alert.status)} px-3 py-1 border-0 font-medium`}>
                {alert.status === 'pending' ? 'En attente' : 
                 alert.status === 'confirmed' ? 'Confirmée' : 
                 alert.status === 'fake' ? 'Fausse' : 'Résolue'}
              </Badge>
            </div>
          </div>

          {/* Localisation et raison */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4" />
              <span>{alert.location}</span>
            </div>
            <Badge variant="outline" className="text-xs bg-orange-900/30 text-orange-300 border-orange-700">
              {alert.reason}
            </Badge>
          </div>
        </div>

        {/* Contenu texte */}
        {alert.description && (
          <div className="px-4 pb-3">
            <p className="text-gray-200 text-sm whitespace-pre-line leading-relaxed">
              {displayText}
              {shouldTruncate && !showFullText && '...'}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium mt-2 transition-colors"
              >
                {showFullText ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        {/* Médias */}
        {hasMedia ? (
          <div className="px-4 pb-3">
            <div
              className={`grid gap-2 ${
                mediaItems.length === 1
                  ? "grid-cols-1"
                  : mediaItems.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {mediaItems.slice(0, 4).map((mediaItem: any, index: number) => {
                const mediaType = getMediaType(mediaItem);
                const isVideo = mediaType === 'video';
                const isImage = mediaType === 'image';
                const mediaUrl = getMediaUrl(mediaItem);

                return (
                  <div 
                    key={index} 
                    className="relative group cursor-pointer"
                    onClick={() => handleMediaClick(mediaItem, mediaType)}
                  >
                    {isImage ? (
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={mediaUrl}
                          alt={`Média ${index + 1}`}
                          className="w-full h-32 object-cover transition-all duration-300 hover:scale-105 hover:shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzNzM5NDAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzkzOTk5RiIgZm9udC1zaXplPSIxNCI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg==";
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : isVideo ? (
                      <div className="relative overflow-hidden rounded-lg">
                        <video
                          className="w-full h-32 object-cover"
                          poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg0IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzNzM5NDAiLz48L3N2Zz4="
                        >
                          <source src={mediaUrl} type="video/mp4" />
                          Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>
                        <div 
                          className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center cursor-pointer"
                          onClick={(e) => handlePlayVideo(mediaItem, e)}
                        >
                          <div className="bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all">
                            <Play className="h-8 w-8 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center shadow-md">
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs text-center p-3 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Fichier joint
                        </a>
                      </div>
                    )}

                    {index === 3 && mediaItems.length > 4 && (
                      <div className="absolute inset-0 bg-black bg-opacity-70 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          +{mediaItems.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-1 gap-2">
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src="http://localhost:5005/uploads/sample.jpeg"
                  alt="Image d'illustration"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                  <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                    Image d'illustration
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ CORRECTION: Statistiques avec les bons comptages */}
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-750">
          <div className="flex justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-2">
                <ThumbsUp className="h-4 w-4 text-green-400" />
                <span>{confirmedCount} confirmation{confirmedCount !== 1 ? 's' : ''}</span>
              </span>
              <span className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span>{rejectedCount} rejet{rejectedCount !== 1 ? 's' : ''}</span>
              </span>
            </div>
            <span className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{viewsCount} vue{viewsCount !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>

        {/* ✅ CORRECTION: Actions avec vérification du vote - Affichage toujours pour status 'pending' indépendamment du filtre */}
        {alert.status === 'pending' && (
          <div className="px-4 py-3 border-t border-gray-700 bg-gray-750 rounded-b-lg">
            {hasUserVoted ? (
              <div className="text-center py-2">
                <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                  ✓ Vous avez déjà voté pour cette alerte
                </Badge>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleValidate('confirm')}
                  className="flex-1 text-sm h-9 bg-green-900/30 text-green-300 hover:bg-green-800/50 border border-green-700/50 transition-all"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Confirmer
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleValidate('reject')}
                  className="flex-1 text-sm h-9 bg-red-900/30 text-red-300 hover:bg-red-800/50 border border-red-700/50 transition-all"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
                
                {isAuthor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleValidate('resolved')}
                    className="flex-1 text-sm h-9 bg-blue-900/30 text-blue-300 hover:bg-blue-800/50 border border-blue-700/50 transition-all"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Résolu
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions sociales toujours présentes pour commenter, et féliciter si confirmée/résolue */}
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-750 rounded-b-lg">
          <div className="flex space-x-3">
            {(alert.status === 'confirmed' || alert.status === 'resolved') && (
              <Button variant="ghost" size="sm" className="text-sm h-8 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Féliciter
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm h-8 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all"
              onClick={() => setShowCommentSection(true)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Commenter
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal pour média agrandi */}
      {expandedMedia && (
        <Dialog open={!!expandedMedia} onOpenChange={() => setExpandedMedia(null)}>
          <DialogContent className="max-w-4xl bg-transparent border-0 shadow-none">
            <div className="relative">
              {expandedMedia.type === 'image' ? (
                <img 
                  src={expandedMedia.url} 
                  alt="Image agrandie"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <video 
                  controls 
                  autoPlay
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
                >
                  <source src={expandedMedia.url} type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpandedMedia(null)}
                className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal pour lecture vidéo */}
      {playingVideo && (
        <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
          <DialogContent className="max-w-4xl bg-transparent border-0 shadow-none">
            <div className="relative">
              <video 
                controls 
                autoPlay
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
              >
                <source src={playingVideo} type="video/mp4" />
                Votre navigateur ne supporte pas la lecture de vidéos.
              </video>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPlayingVideo(null)}
                className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Section commentaires */}
      <CommentSection 
        alertId={alert.id}
        currentUserId={currentUserId || ''}
        isOpen={showCommentSection}
        onClose={() => setShowCommentSection(false)}
      />
    </>
  );
}

export default function Dashboard() {
  const [showSOSForm, setShowSOSForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [rejectingAlertId, setRejectingAlertId] = useState<string | null>(null);
  const [confirmingAlertId, setConfirmingAlertId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // ✅ CORRECTION: Récupérer l'utilisateur connecté avec token et sans fallback fictif
  const { data: currentUser, isError: authError, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token');
      }
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        localStorage.removeItem('authToken');
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false, // Ne pas réessayer si erreur d'auth
  });

  const currentUserId = currentUser?.id;

  // ✅ CORRECTION: Déplacé avant le return conditionnel
  const { data: alerts = [], isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/alerts?page=1&limit=10');
      if (!response.ok) throw new Error('Erreur de chargement des alertes');
      const data = await response.json();
      
      console.log('📊 API ALERTS RESPONSE:', data);
      
      return data;
    },
    staleTime: 1000 * 60,
  });

  const createAlertMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!currentUserId) {
        throw new Error("Vous devez être connecté pour créer une alerte");
      }

      const response = await fetch('/api/alerts', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de la création de l'alerte: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowSOSForm(false);
    },
    onError: (error: any) => {
      console.error('Error creating alert:', error);
      window.alert("Erreur lors de la création de l'alerte: " + error.message);
    }
  });

  // ✅ CORRECTION: Mutation pour update status (Résolu) - Méthode PUT + authorId
  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status, authorId }: { alertId: string; status: string; authorId: string }) => 
      apiRequest('PUT', `/api/alerts/${alertId}/status`, { status, authorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      console.log(`✅ Alerte ${alertId} mise à jour en ${status}`);
    },
    onError: (error: any) => {
      console.error('Error updating alert status:', error);
    }
  });

  // ✅ CORRECTION: Mutation pour validation (Confirmer/Rejeter) - Méthode POST + isConfirmed
  // ✅ CORRECTION: Removed auto-comment creation from onSuccess (handled in forms now)
  const validateAlertMutation = useMutation({
    mutationFn: ({ alertId, isConfirmed, userId }: { alertId: string; isConfirmed: boolean; userId: string }) => {
      console.log(`🔄 Validation alerte ${alertId}: isConfirmed=${isConfirmed}, userId=${userId}`);
      return apiRequest('POST', `/api/alerts/${alertId}/validate`, { 
        isConfirmed, 
        userId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      console.log(`✅ Validation réussie pour alerte`);
    },
    onError: (error: any) => {
      console.error('Error validating alert:', error);
      if (error.message?.includes("User has already voted")) {
        window.alert("Vous avez déjà voté pour cette alerte !");
      } else {
        window.alert("Erreur lors de la validation de l'alerte");
      }
    }
  });

  // ✅ CORRECTION: Mutation pour création commentaire
  const createCommentMutation = useMutation({
    mutationFn: ({ alertId, type, content }: { alertId: string; type: string; content: string }) => 
      apiRequest('POST', `/api/alerts/${alertId}/comments`, { type, content, userId: currentUserId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      console.log(`✅ Commentaire créé pour alerte`);
    },
    onError: (error: any) => {
      console.error('Error creating comment:', error);
      window.alert("Erreur lors de la création du commentaire");
    }
  });

  // ✅ CORRECTION: Déplacé avant le return conditionnel
  const loadMoreAlerts = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await apiRequest('GET', `/api/alerts?page=${nextPage}&limit=10`);
      const newAlerts = await response.json();
      
      if (newAlerts.length < 10) {
        setHasMore(false);
      } else {
        queryClient.setQueryData(['alerts'], (old: Alert[] = []) => [...old, ...newAlerts]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more alerts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // ✅ CORRECTION: useEffect pour redirection sur erreur d'auth
  useEffect(() => {
    if (authError) {
      setLocation('/login');
    }
  }, [authError, setLocation]);

  // ✅ CORRECTION: Return conditionnel après TOUS les hooks
  if (userLoading || authError || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          {userLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          ) : null}
          <p className="text-white">
            {userLoading ? "Chargement de l'utilisateur..." : "Redirection vers la connexion..."}
          </p>
        </div>
      </div>
    );
  }

  // ✅ CORRECTION: Fonctions de handlers après le return conditionnel
  const handleValidation = (alertId: string, validation: 'confirm' | 'reject' | 'resolved') => {
    if (!currentUserId) {
      window.alert("Vous devez être connecté pour voter !");
      return;
    }

    const targetAlert = alerts.find((a: Alert) => a.id === alertId);
    
    if (targetAlert?.validatedBy?.includes(currentUserId)) {
      window.alert("Vous avez déjà voté pour cette alerte !");
      return;
    }

    if (validation === 'resolved') {
      updateAlertMutation.mutate({ alertId, status: 'resolved', authorId: currentUserId });
    } else {
      validateAlertMutation.mutate({
        alertId,
        isConfirmed: validation === 'confirm',
        userId: currentUserId
      });
    }
  };

  const handleRejectWithForm = (alertId: string, comment: string) => {
    validateAlertMutation.mutate(
      {
        alertId,
        isConfirmed: false,
        userId: currentUserId!
      },
      {
        onSuccess: () => {
          if (comment.trim()) {
            createCommentMutation.mutate({
              alertId,
              type: 'red',
              content: comment
            });
          }
          setRejectingAlertId(null);
        }
      }
    );
  };

  const handleConfirmWithForm = (alertId: string, comment: string) => {
    validateAlertMutation.mutate(
      {
        alertId,
        isConfirmed: true,
        userId: currentUserId!
      },
      {
        onSuccess: () => {
          if (comment.trim()) {
            createCommentMutation.mutate({
              alertId,
              type: 'green',
              content: comment
            });
          }
          setConfirmingAlertId(null);
        }
      }
    );
  };

  const handleCreateAlert = (alertData: any) => {
    if (!currentUserId) {
      window.alert("Vous devez être connecté pour créer une alerte !");
      return;
    }

    const formData = new FormData();
    
    formData.append('reason', alertData.reason || "Autre");
    formData.append('description', alertData.description || "Pas de description");
    formData.append('location', alertData.location || "Lieu non précisé");
    formData.append('urgency', alertData.urgency || "medium");
    formData.append('authorId', currentUserId);
    
    if (alertData.media) {
      formData.append('media', alertData.media);
    }

    createAlertMutation.mutate(formData);
  };

  const filteredAlerts = alerts.filter((alert: Alert) => {
    switch (activeTab) {
      case 'pending':
        return alert.status === 'pending';
      case 'confirmed':
        return alert.status === 'confirmed';
      case 'fake':
        return alert.status === 'fake';
      case 'resolved':
        return alert.status === 'resolved';
      default:
        return true;
    }
  });

  const isLoading = alertsLoading || userLoading; // Combiné pour cohérence

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
            <p className="text-gray-300 mt-1">Surveillance des alertes en temps réel</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              <span>{currentUser?.name || 'Utilisateur'}</span>
            </div>
            <Button 
              onClick={() => setShowSOSForm(true)}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg transition-all duration-300"
              size="lg"
              disabled={!currentUserId}
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle Alerte SOS
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Toutes
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
              En attente
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              Confirmées
            </TabsTrigger>
            <TabsTrigger value="fake" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Fausses
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Résolues
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <Card className="text-center py-12 bg-gray-800/50 border-gray-700">
                  <CardContent>
                    <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300">Aucune alerte trouvée</h3>
                    <p className="text-gray-500 mt-2">
                      {activeTab === 'all' 
                        ? "Aucune alerte n'a été signalée pour le moment." 
                        : `Aucune alerte ${activeTab === 'pending' ? 'en attente' : 
                           activeTab === 'confirmed' ? 'confirmée' : 
                           activeTab === 'fake' ? 'fausse' : 'résolue'} pour le moment.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredAlerts.map((alert: Alert) => (
                  <FacebookStyleAlert
                    key={alert.id}
                    alert={alert}
                    onValidate={handleValidation}
                    onReject={(alertId: string) => setRejectingAlertId(alertId)}
                    onConfirm={(alertId: string) => setConfirmingAlertId(alertId)}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </div>

            {/* ✅ CORRECTION: Bouton manuel "Plus d'alertes" sans observer pour éviter le clignotement infini */}
            {hasMore && (
              <div className="flex justify-center py-6">
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                ) : (
                  <Button variant="outline" onClick={loadMoreAlerts} className="border-gray-600 text-gray-300">
                    Plus d'alertes
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* SOS Form Dialog */}
      <Dialog open={showSOSForm} onOpenChange={setShowSOSForm}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Signaler une alerte SOS</DialogTitle>
          </DialogHeader>
          <SOSForm
            onSubmit={handleCreateAlert}
            onClose={() => setShowSOSForm(false)}
            loading={createAlertMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Form Dialog */}
      <Dialog open={!!confirmingAlertId} onOpenChange={() => setConfirmingAlertId(null)}>
        <DialogContent className="max-w-md bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Confirmer l'alerte</DialogTitle>
          </DialogHeader>
          <ValidationForm
            onSubmit={(comment) => {
              if (confirmingAlertId) {
                handleConfirmWithForm(confirmingAlertId, comment);
              }
            }}
            onCancel={() => setConfirmingAlertId(null)}
            title="Raison de la confirmation (optionnel)"
            placeholder="Expliquez pourquoi vous confirmez cette alerte..."
            buttonText="Confirmer"
            buttonVariant="default"
            commentType="green"
          />
        </DialogContent>
      </Dialog>

      {/* Reject Form Dialog */}
      <Dialog open={!!rejectingAlertId} onOpenChange={() => setRejectingAlertId(null)}>
        <DialogContent className="max-w-md bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Rejeter l'alerte</DialogTitle>
          </DialogHeader>
          <ValidationForm
            onSubmit={(comment) => {
              if (rejectingAlertId) {
                handleRejectWithForm(rejectingAlertId, comment);
              }
            }}
            onCancel={() => setRejectingAlertId(null)}
            title="Raison du rejet (optionnel)"
            placeholder="Expliquez pourquoi vous rejetez cette alerte..."
            buttonText="Confirmer le rejet"
            buttonVariant="destructive"
            commentType="red"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}