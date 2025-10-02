import React, { useState, useEffect } from 'react';
import {
  Plus,
  AlertTriangle,
  Shield,
  Clock,
  MessageCircle,
  ThumbsUp,
  MapPin,
  Eye,
  X,
  Send,
  Play,
  User,
  CircleCheckBig,
  CheckCircle,
  MoreVertical,
  Edit,
  XIcon,
  Menu, // Ajout pour une potentielle navigation mobile future
  Globe, // Ajout pour la carte ou la localisation
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import type { Alert } from '@shared/schema';
import { searchLocations, Location } from './types/locationsData';

// --- UTILITIES ---

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

// --- COMPONENTS ---

interface FormProps {
  onSubmit: (comment: string) => void;
  onCancel: () => void;
  title: string;
  placeholder: string;
  buttonText: string;
  buttonVariant: "default" | "destructive" | "outline";
  commentType: 'green' | 'red';
}

const ValidationForm: React.FC<FormProps> = ({ onSubmit, onCancel, title, placeholder, buttonText, commentType }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(comment);
  };

  const getButtonClass = () => {
    switch (commentType) {
      case 'green': return 'bg-green-500 hover:bg-green-600';
      case 'red': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="comment" className="text-gray-300 block mb-2 font-medium">{title}</label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-3 rounded-lg resize-none focus:ring-yellow-500 focus:border-yellow-500 transition"
          rows={4}
        />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-700 text-gray-300 hover:bg-gray-700 rounded-lg transition text-sm">
          Annuler
        </button>
        <button type="submit" className={`px-4 py-2 ${getButtonClass()} text-white rounded-lg transition text-sm font-semibold`}>
          {buttonText}
        </button>
      </div>
    </form>
  );
};

interface CommentSectionProps {
  alertId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ alertId, currentUserId, isOpen, onClose }) => {
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
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
      case 'green': return 'bg-green-500 text-gray-900';
      case 'red': return 'bg-red-500 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'green': return 'Confirmé';
      case 'red': return 'Fausse alerte';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    // Responsive Modal Overlay
    <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300 my-8 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-yellow-500" />
            Commentaires
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Comments List - Scrollable area */}
        <div className="p-4 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <p className="text-gray-400 text-center py-4">Chargement des commentaires...</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Soyez le premier à commenter cette alerte.</p>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex space-x-3">
                <img
                  src={comment.user?.avatar || 'http://localhost:5005/uploads/icon-user.png'}
                  alt={comment.user?.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-700"
                />
                <div className="flex-grow bg-gray-800 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-white text-sm">{comment.user?.name || 'Utilisateur inconnu'}</span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                  {comment.type !== 'text' && (
                    <div className="mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(comment.type)}`}>
                        {getTypeLabel(comment.type)}
                      </span>
                    </div>
                  )}
                  <p className="text-gray-300 text-sm">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input - Fixed at bottom */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 flex items-center flex-shrink-0">
          <img
            src={localStorage.getItem('userAvatar') || 'http://localhost:5005/uploads/icon-user.png'}
            alt="Avatar"
            className="w-8 h-8 rounded-full object-cover mr-3 border border-gray-700"
          />
          <input
            type="text"
            placeholder="Ajoutez un commentaire..."
            className="flex-grow bg-gray-800 text-gray-200 border border-gray-700 rounded-full py-2 px-4 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none transition"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={createCommentMutation.isPending}
          />
          <button type="submit" className="ml-3 text-yellow-500 hover:text-white transition p-2 rounded-full hover:bg-gray-700" disabled={createCommentMutation.isPending || !comment.trim()}>
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

// ... (Interface FacebookStyleAlertProps)

const FacebookStyleAlert: React.FC<FacebookStyleAlertProps> = ({ alert, onValidate, onReject, onConfirm, currentUserId }) => {
  const [showFullText, setShowFullText] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const maxTextLength = 150;

  // ... (getMediaUrl, getMediaType, getMediaItems, author extraction, counts extraction) - LOGIC IS PRESERVED

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

  const getMediaUrl = (mediaItem: any): string => {
    if (!mediaItem) return "";

    if (mediaItem.url) {
      return mediaItem.url.startsWith("http") ? mediaItem.url : `http://localhost:5005${mediaItem.url}`;
    }

    if (mediaItem.filename) {
      return `http://localhost:5005/uploads/${mediaItem.filename}`;
    }

    if (typeof mediaItem === "string") {
      const cleanPath = mediaItem.replace(/^\/uploads\//i, '');
      return `http://localhost:5005/uploads/${cleanPath}`;
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

  const author = alert.author || {
    id: "unknown",
    name: "Utilisateur inconnu",
    avatar: "",
    hasCIN: false
  };

  const authorName = author.name?.trim() || "Utilisateur inconnu";
  const authorAvatar = author.avatar || "";
  const authorHasCIN = author.hasCIN || false;

  const confirmedCount = typeof alert.confirmedCount === 'string'
    ? parseInt(alert.confirmedCount) || 0
    : alert.confirmedCount || 0;

  const rejectedCount = typeof alert.rejectedCount === 'string'
    ? parseInt(alert.rejectedCount) || 0
    : alert.rejectedCount || 0;

  const viewsCount = alert.views || 0;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-gray-900';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 text-gray-900';
      case 'fake': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-gray-900';
      case 'resolved': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const shouldTruncate = alert.description && alert.description.length > maxTextLength;
  const displayText = showFullText ? alert.description :
    (alert.description ? alert.description.substring(0, maxTextLength) : '');

  const mediaItems = getMediaItems();
  const hasMedia = mediaItems.length > 0;
  const isAuthor = author.id === currentUserId;

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

  const statusText = {
    pending: 'En Attente',
    confirmed: 'Confirmé',
    fake: 'Faux',
    resolved: 'Résolu',
  }[alert.status] || alert.status.toUpperCase();

  const urgencyText = alert.urgency === 'high' ? 'Urgent' : alert.urgency === 'medium' ? 'Modéré' : 'Information';

  return (
    // CARD STYLE: Dark background, rounded, subtle border, full width on mobile
    <div className="bg-[#201d1d] border border-gray-800 rounded-xl shadow-2xl mb-6 transition-all duration-300 hover:shadow-yellow-900/20">

      {/* En-tête de la publication */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center">
          <img
            src={authorAvatar || 'http://localhost:5005/uploads/icon-user.png'}
            alt={authorName}
            className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-gray-700 flex-shrink-0"
          />
          <div>
            <div className="flex items-center flex-wrap">
              <span className="font-bold text-white text-base mr-2">
                @{authorName}
              </span>
              {authorHasCIN && (
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500" />
                  <span className="ml-1 text-xs text-blue-400 font-medium hidden sm:inline">Vérifié</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center">
              <span className="font-medium text-yellow-400">{alert.reason}</span>
              <span className="mx-1">•</span>
              <span className="text-gray-400">{formatTimeAgo(alert.createdAt)}</span>
            </p>
          </div>
        </div>
        {/* Statut de l'alerte en badge clair */}
        <span className={`px-3 py-1 ml-2 text-xs font-semibold rounded-full ${getStatusColor(alert.status)} flex-shrink-0`}>
          {statusText}
        </span>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-300 leading-relaxed">
          {displayText}
          {shouldTruncate && !showFullText && '...'}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFullText(!showFullText)}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium mt-1 transition-colors"
          >
            {showFullText ? 'Voir moins' : 'Voir plus'}
          </button>
        )}
      </div>

      {/* Image/Vidéo de l'article - utilise un ratio adapté au mobile */}
      <div className="relative w-full aspect-[4/3] bg-gray-900 overflow-hidden">
        {hasMedia ? (
          mediaItems.slice(0, 1).map((mediaItem: any, index: number) => {
            const mediaType = getMediaType(mediaItem);
            const mediaUrl = getMediaUrl(mediaItem);
            return (
              <div key={index} className="w-full h-full cursor-pointer relative" onClick={() => handleMediaClick(mediaItem, mediaType)}>
                {mediaType === 'image' ? (
                  <img
                    src={mediaUrl}
                    alt={`Média ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzNzM5NDAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzkzOTk5RiIgZm9udC1zaXplPSIxNCI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg==";
                    }}
                  />
                ) : mediaType === 'video' ? (
                  <video
                    className="w-full h-full object-cover"
                    poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg0PSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzcxZDEwIi8+PC9zdmc+"
                  >
                    <source src={mediaUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-white">Fichier joint</span>
                  </div>
                )}
                {mediaType === 'video' && (
                  <div
                    className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer"
                    onClick={(e) => handlePlayVideo(mediaItem, e)}
                  >
                    <div className="bg-black bg-opacity-70 rounded-full p-3 hover:bg-opacity-90 transition-all">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Globe className="w-12 h-12 text-gray-600" />
            <span className="ml-3 text-gray-500">Aucun média joint</span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-xs text-white/90 font-medium flex items-center px-2 py-0.5 rounded-full bg-black/50">
          <Eye className="w-3 h-3 mr-1" />
          {viewsCount}
        </div>
        <span className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(alert.urgency)} shadow-md`}>
          {urgencyText}
        </span>
      </div>

      {/* Détails de l'alerte (emplacement, date) */}
      <div className="p-4 text-sm text-gray-400 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex items-start">
            <MapPin className="w-4 h-4 mr-2 mt-0.5 text-red-400 flex-shrink-0" />
            <p>
              <strong className="text-white mr-1">Lieu:</strong> {alert.location}
            </p>
          </div>
          <div className="flex items-start sm:justify-end">
            <Clock className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
            <p>
              <strong className="text-white mr-1">Signalé:</strong>{' '}
              {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques (Confirmations/Rejets) */}
      <div className="p-4 text-sm text-gray-400 border-b border-gray-800">
        <div className="flex justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-2 text-green-400 font-semibold">
              <ThumbsUp className="w-4 h-4" />
              <span>{confirmedCount} Confirmation{confirmedCount !== 1 ? 's' : ''}</span>
            </span>
            <span className="flex items-center space-x-2 text-red-400 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>{rejectedCount} Rejet{rejectedCount !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Barre d'interaction */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start p-4 gap-3">
        {/* Bouton Commenter */}
        <button
          onClick={() => setShowCommentSection(true)}
          className="flex items-center space-x-1 text-gray-400 hover:text-yellow-500 transition py-2 px-3 rounded-lg hover:bg-gray-800 w-full sm:w-auto justify-center sm:justify-start"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Commenter</span>
        </button>

        {/* Boutons de Validation */}
        {alert.status === 'pending' && (
          <div className="flex flex-wrap justify-end items-start gap-x-2 gap-y-2 w-full sm:w-auto">
            {hasUserVoted ? (
              <span className="px-3 py-1.5 bg-gray-700 text-yellow-400 rounded-full text-xs font-semibold flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" /> Déjà voté
              </span>
            ) : (
              <>
                <button
                  onClick={() => handleValidate('confirm')}
                  className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition text-sm font-semibold flex-1 sm:flex-none justify-center"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Confirmer</span>
                </button>
                <button
                  onClick={() => handleValidate('reject')}
                  className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition text-sm font-semibold flex-1 sm:flex-none justify-center"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Fake</span>
                </button>
                {isAuthor && (
                  <button
                    onClick={() => handleValidate('resolved')}
                    className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition text-sm font-semibold flex-1 sm:flex-none justify-center"
                  >
                    <CircleCheckBig className="w-4 h-4" />
                    <span>Résolu</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals pour médias et commentaires */}
      {/* (Logique inchangée pour les modals, seulement le style de CommentSection a été amélioré) */}

      {expandedMedia && (
        <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setExpandedMedia(null)}>
          <div className="bg-black rounded-xl max-w-full w-full max-h-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center h-[80vh] w-full p-4">
              {expandedMedia.type === 'image' ? (
                <img
                  src={expandedMedia.url}
                  alt="Image agrandie"
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              ) : (
                <video
                  controls
                  autoPlay
                  className="max-h-full max-w-full object-contain rounded-xl"
                >
                  <source src={expandedMedia.url} type="video/mp4" />
                </video>
              )}
            </div>
            <button
              onClick={() => setExpandedMedia(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {playingVideo && (
        <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPlayingVideo(null)}>
          <div className="bg-black rounded-xl max-w-full w-full max-h-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center h-[80vh] w-full p-4">
              <video
                controls
                autoPlay
                className="max-h-full max-w-full object-contain rounded-xl"
              >
                <source src={playingVideo} type="video/mp4" />
              </video>
            </div>
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      <CommentSection
        alertId={alert.id}
        currentUserId={currentUserId || ''}
        isOpen={showCommentSection}
        onClose={() => setShowCommentSection(false)}
      />
    </div>
  );
};

// --- SOS FORM (MOBILE OPTIMIZED) ---

const SOSForm: React.FC<SOSFormProps> = ({ onSubmit, onClose, loading }) => {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    media: null as File | null,
    urgency: 'medium'
  });
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<Location[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLocationSearch = (query: string) => {
    setLocationQuery(query);
    if (query.length >= 2) {
      const suggestions = searchLocations(query, 10);
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setFormData(prev => ({
      ...prev,
      location: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString()
    }));
    setLocationQuery(location.name);
    setShowSuggestions(false);
  };

  const handleLocationInputBlur = () => {
    // Petit délai pour permettre le clic sur la suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, media: file }));
  };

  const inputClass = 'w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:ring-yellow-500 focus:border-yellow-500 placeholder-gray-500 transition';

  const Label: React.FC<React.PropsWithChildren<{ htmlFor: string }>> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-1">
      {children}
    </label>
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Type d'incident */}
      <div>
        <Label htmlFor="reason">Type d'incident <span className="text-red-500">*</span></Label>
        <select
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          className={inputClass}
          required
        >
          <option value="">Sélectionnez le type d'incident</option>
          <option value="agression">Agression</option>
          <option value="vol">Vol/Cambriolage</option>
          <option value="harcelement">Harcèlement</option>
          <option value="accident">Accident</option>
          <option value="urgence_medicale">Urgence médicale</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      {/* Description détaillée */}
      <div>
        <Label htmlFor="description">Description détaillée <span className="text-red-500">*</span></Label>
        <textarea
          id="description"
          placeholder="Décrivez ce qui s'est passé (le plus de détails possible)..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className={inputClass}
          required
        />
      </div>

      {/* Localisation */}
      <div>
        <Label htmlFor="location">Localisation <span className="text-red-500">*</span></Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500" />
          <input
            id="location"
            type="text"
            placeholder="Recherchez un quartier, une rue ou un lieu..."
            className={`${inputClass} pl-10`}
            value={locationQuery || formData.location}
            onChange={(e) => {
              const query = e.target.value;
              handleLocationSearch(query);
            }}
            onFocus={() => locationQuery.length >= 2 && setShowSuggestions(true)}
            onBlur={handleLocationInputBlur}
            required
          />
          {showSuggestions && locationSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto">
              {locationSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-700 cursor-pointer text-sm text-gray-300 border-b border-gray-700 last:border-b-0"
                  onMouseDown={() => handleLocationSelect(suggestion)} // Utilisez onMouseDown pour éviter le blur
                >
                  <div className="font-medium">{suggestion.name}</div>
                  <div className="text-xs text-gray-500">{suggestion.district}</div>
                </div>
              ))}
            </div>
          )}
          {showSuggestions && locationSuggestions.length === 0 && locationQuery.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 text-sm text-gray-400">
              Aucune localisation trouvée pour "{locationQuery}"
            </div>
          )}
        </div>
        {formData.location && !showSuggestions && (
          <p className="text-xs text-gray-500 mt-1 pl-3">
            Localisation sélectionnée : <span className="text-gray-300 font-medium">{formData.location}</span>
          </p>
        )}
      </div>

      {/* Niveau d'urgence */}
      <div>
        <Label htmlFor="urgency">Niveau d'urgence</Label>
        <select
          id="urgency"
          value={formData.urgency}
          onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
          className={inputClass}
        >
          <option value="low" className="text-blue-400">Faible - Information préventive</option>
          <option value="medium" className="text-yellow-400">Moyen - Attention requise</option>
          <option value="high" className="text-red-400">Élevé - Danger immédiat</option>
        </select>
      </div>

      {/* Photo/Vidéo */}
      <div>
        <Label htmlFor="media">Photo/Vidéo (optionnel)</Label>
        <input
          id="media"
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-300
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-yellow-500 file:text-gray-900
            hover:file:bg-yellow-600 cursor-pointer transition"
        />
        {formData.media && (
          <p className="text-sm text-gray-500 mt-2">
            Fichier sélectionné: {formData.media.name}
          </p>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3 pt-4 flex-col sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg hover:bg-yellow-600 transition flex items-center justify-center"
          disabled={loading}
        >
          {loading ? 'Envoi...' : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Signaler l'Alerte
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// --- MODAL WRAPPERS (MOBILE OPTIMIZED) ---

const NewAlertModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; currentUser: any }> = ({ isOpen, onClose, onSuccess, currentUser }) => {
  // ... (Logique inchangée)

  const handleCreateAlert = (alertData: any) => {
    if (!currentUser.id) {
      window.alert("Vous devez être connecté pour créer une alerte !");
      return;
    }

    const formDataToSend = new FormData();

    formDataToSend.append('reason', alertData.reason || "Autre");
    formDataToSend.append('description', alertData.description || "Pas de description");
    formDataToSend.append('location', alertData.location || "Lieu non précisé");
    formDataToSend.append('urgency', alertData.urgency || "medium");
    formDataToSend.append('authorId', currentUser.id);

    if (alertData.latitude != null) {
      formDataToSend.append('latitude', alertData.latitude.toString());
    }
    if (alertData.longitude != null) {
      formDataToSend.append('longitude', alertData.longitude.toString());
    }

    if (alertData.media) {
      formDataToSend.append('media', alertData.media);
    }

    fetch('/api/alerts', {
      method: 'POST',
      body: formDataToSend,
    }).then(response => {
      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        window.alert("Erreur lors de la création de l'alerte");
      }
    }).catch(error => {
      console.error('Error creating alert:', error);
      window.alert("Erreur lors de la création de l'alerte");
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-sm sm:max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 my-8 max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-yellow-500" />
            Nouvelle Alerte SOS
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex-grow">
          <p className="text-gray-400 mb-4 text-sm">Remplissez tous les champs pour signaler un incident de manière précise.</p>
          <SOSForm onSubmit={handleCreateAlert} onClose={onClose} loading={false} />
        </div>
      </div>
    </div>
  );
};

// ... (LimitModal and ValidationModal) - Design adjusted to match NewAlertModal

const LimitModal: React.FC<{ isOpen: boolean; onClose: () => void; userAlertsCount: number }> = ({ isOpen, onClose, userAlertsCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
          <h2 className="text-xl font-bold text-white">Limite atteinte</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-300">
              Vous avez créé <strong className="text-yellow-400">{userAlertsCount}</strong> alerte(s). En tant qu'utilisateur non vérifié,
              vous êtes limité à une alerte. Veuillez vérifier votre compte pour créer plus d'alertes.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ValidationModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; placeholder: string; buttonText: string; commentType: 'green' | 'red'; onSubmit: (comment: string) => void }> = ({ isOpen, onClose, title, placeholder, buttonText, commentType, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <ValidationForm
            onSubmit={onSubmit}
            onCancel={onClose}
            title={title}
            placeholder={placeholder}
            buttonText={buttonText}
            buttonVariant="default"
            commentType={commentType}
          />
        </div>
      </div>
    </div>
  );
};

// --- DASHBOARD MAIN COMPONENT ---

export default function Dashboard() {
  const [showSOSForm, setShowSOSForm] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [rejectingAlertId, setRejectingAlertId] = useState<string | null>(null);
  const [confirmingAlertId, setConfirmingAlertId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'confirmed' | 'fake' | 'resolved'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // ... (useQuery for currentUser, useQuery for userAlertsCount, useQuery for alertsData) - LOGIC IS PRESERVED
  const { data: currentUserRaw, isError: authError, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
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
    retry: false,
  });

  const currentUser = currentUserRaw ? {
    id: currentUserRaw.id,
    name: currentUserRaw.name,
    avatar: currentUserRaw.avatar,
    profileImageUrl: currentUserRaw.profileImageUrl,
    isAdmin: currentUserRaw.isAdmin || false,
    hasCIN: currentUserRaw.hasCIN || false,
  } : null;

  const currentUserId = currentUser?.id;

  const { data: userAlertsCount = 0 } = useQuery({
    queryKey: ['user-alerts-count', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;

      try {
        const response = await apiRequest('GET', '/api/alerts');
        if (!response.ok) return 0;

        const allAlerts = await response.json();
        const userAlerts = allAlerts.filter((alert: Alert) => alert.authorId === currentUserId);
        return userAlerts.length;
      } catch (error) {
        console.error('Error counting user alerts:', error);
        return 0;
      }
    },
    staleTime: 0,
    enabled: !!currentUserId,
  });

  const { data: alertsData = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/alerts?page=1&limit=10');
      if (!response.ok) throw new Error('Erreur de chargement des alertes');
      const data = await response.json();
      return data;
    },
    staleTime: 1000 * 60,
    enabled: !!currentUserId,
  });

  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (alertsData) {
      setAlerts(alertsData.map((a: any) => ({
        ...a,
        author: {
          id: a.author?.id || 'unknown',
          name: a.author?.name || 'Utilisateur inconnu',
          avatar: a.author?.avatar,
          hasCIN: a.author?.hasCIN || false,
        },
      })));
    }
  }, [alertsData]);
  // ... (createAlertMutation, updateAlertMutation, validateAlertMutation, createCommentMutation) - LOGIC IS PRESERVED
  // ... (loadMoreAlerts, useEffect for authError) - LOGIC IS PRESERVED

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['user-alerts-count'] });
      setShowSOSForm(false);
    },
    onError: (error: any) => {
      console.error('Error creating alert:', error);
      window.alert("Erreur lors de la création de l'alerte: " + error.message);
    }
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status, authorId }: { alertId: string; status: string; authorId: string }) =>
      apiRequest('PUT', `/api/alerts/${alertId}/status`, { status, authorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error: any) => {
      console.error('Error updating alert status:', error);
    }
  });

  const validateAlertMutation = useMutation({
    mutationFn: ({ alertId, isConfirmed, userId }: { alertId: string; isConfirmed: boolean; userId: string }) => {
      return apiRequest('POST', `/api/alerts/${alertId}/validate`, {
        isConfirmed,
        userId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
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

  const createCommentMutation = useMutation({
    mutationFn: ({ alertId, type, content }: { alertId: string; type: string; content: string }) =>
      apiRequest('POST', `/api/alerts/${alertId}/comments`, { type, content, userId: currentUserId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error: any) => {
      console.error('Error creating comment:', error);
      window.alert("Erreur lors de la création du commentaire");
    }
  });

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
        setAlerts(prev => [...prev, ...newAlerts.map((a: any) => ({
          ...a,
          author: {
            id: a.author?.id || 'unknown',
            name: a.author?.name || 'Utilisateur inconnu',
            avatar: a.author?.avatar,
            hasCIN: a.author?.hasCIN || false,
          },
        }))]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more alerts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (authError) {
      setLocation('/login');
    }
  }, [authError, setLocation]);

  if (userLoading || alertsLoading) {
    return <div className="min-h-screen bg-[#161313] flex items-center justify-center text-white">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500 mb-4"></div>
        <p className="text-lg">Chargement du tableau de bord...</p>
      </div>
    </div>;
  }

  if (authError || !currentUser) {
    return <div className="min-h-screen bg-[#161313] flex items-center justify-center text-white">
      <p className="text-red-500">Non authentifié. Veuillez vous connecter.</p>
    </div>;
  }

  const filteredAlerts = alerts.filter((alert: any) => selectedStatus === 'all' || alert.status === selectedStatus);

  const handleSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    await queryClient.invalidateQueries({ queryKey: ['user-alerts-count'] });
  };

  const handleValidation = (alertId: string, validation: 'confirm' | 'reject' | 'resolved') => {
    if (!currentUserId) {
      window.alert("Vous devez être connecté pour voter !");
      return;
    }

    const targetAlert = alerts.find((a: any) => a.id === alertId);

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

  const handleOpenSOSForm = () => {
    if (!currentUser.hasCIN && userAlertsCount >= 1) {
      setShowLimitModal(true);
      return;
    }
    setShowSOSForm(true);
  };

  const statusConfig = [
    { key: 'all' as const, label: 'Toutes', icon: Globe, color: 'bg-gray-600', activeColor: 'bg-gray-500' },
    { key: 'pending' as const, label: 'En Attente', icon: Clock, color: 'bg-yellow-600', activeColor: 'bg-yellow-500' },
    { key: 'confirmed' as const, label: 'Confirmées', icon: CheckCircle, color: 'bg-green-600', activeColor: 'bg-green-500' },
    { key: 'fake' as const, label: 'Fausses', icon: XIcon, color: 'bg-red-600', activeColor: 'bg-red-500' },
    { key: 'resolved' as const, label: 'Résolues', icon: Shield, color: 'bg-blue-600', activeColor: 'bg-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-[#161313] text-white">
      {/* Header */}
        <div className='flex flex-col items-center mt-6 px-4 sm:px-6 text-center'>
          <h1 className="text-3xl font-extrabold text-yellow-400 tracking-wider">Centre d'alerte</h1>
          <p className="text-zinc-400 font-mono text-sm">
            Consultez ici l’ensemble des alertes reçues. Vous pouvez suivre leur statut, <br/>voir les détails importants et rester informé en temps réel de tout ce qui concerne votre compte.
          </p>
        </div>

      <main className="py-6 px-4 sm:px-6">
        {/* Barre de filtre/statut responsive */}
        <div className="mb-8 max-w-7xl mx-auto">
          <p className="text-gray-400 mb-3 text-sm font-medium">Filtrer par statut :</p>
          <div className="flex space-x-3 overflow-x-auto pb-2 custom-scrollbar">
            {statusConfig.map(({ key, label, icon: Icon, color, activeColor }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap shadow-md ${selectedStatus === key
                  ? `${activeColor} ${key === 'pending' || key === 'confirmed' ? 'text-gray-900' : 'text-white'}`
                  : `${color} text-white hover:bg-opacity-80`
                  }`}
              >
                {Icon && <Icon className={`w-4 h-4 mr-1 ${selectedStatus === key && (key === 'pending' || key === 'confirmed') ? 'text-gray-900' : 'text-white'}`} />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille d'alertes responsive */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAlerts.map((alert: any) => (
            <FacebookStyleAlert
              key={alert.id}
              alert={alert}
              onValidate={handleValidation}
              onReject={(alertId: string) => setRejectingAlertId(alertId)}
              onConfirm={(alertId: string) => setConfirmingAlertId(alertId)}
              currentUserId={currentUserId}
            />
          ))}
        </div>

        {filteredAlerts.length === 0 && <p className="text-center text-gray-500 mt-10 p-4 bg-gray-800 rounded-xl max-w-lg mx-auto">Aucune alerte ne correspond au filtre sélectionné.</p>}

        {/* Bouton de chargement More */}
        {hasMore && (
          <div className="flex justify-center py-8">
            {loadingMore ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            ) : (
              <button onClick={loadMoreAlerts} className="px-6 py-3 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 transition font-semibold">
                Charger plus d'alertes
              </button>
            )}
          </div>
        )}
      </main>

      {/* FAB et Profil fixe */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex flex-col items-end space-y-3 z-40">
        {/* Profil/Avatar */}
        <div className="group relative">
          <img
            src={currentUser.avatar || currentUser.profileImageUrl || 'http://localhost:5005/uploads/icon-user.png'}
            alt="Profil"
            className="w-12 h-12 rounded-full object-cover border-3 border-yellow-500 ring-2 ring-yellow-500 cursor-pointer shadow-xl hover:shadow-yellow-500/50 transition duration-300"
          />
          {/* Tooltip Profil */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap flex items-center shadow-lg">
            {currentUser.name}
            {currentUser.hasCIN && (
              <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400 ml-2" />
            )}
          </div>
        </div>
        {/* FAB Nouvelle Alerte */}
        <button
          onClick={handleOpenSOSForm}
          className="bg-yellow-500 p-4 rounded-full shadow-2xl hover:bg-yellow-600 transition duration-300 transform hover:scale-105"
          title="Signaler une nouvelle alerte"
        >
          <Plus className="w-6 h-6 text-gray-900 font-bold" />
        </button>
      </div>

      {/* Modals */}
      <NewAlertModal
        isOpen={showSOSForm}
        onClose={() => setShowSOSForm(false)}
        onSuccess={handleSuccess}
        currentUser={currentUser}
      />

      <LimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        userAlertsCount={userAlertsCount}
      />

      <ValidationModal
        isOpen={!!confirmingAlertId}
        onClose={() => setConfirmingAlertId(null)}
        title="Confirmer l'alerte"
        placeholder="Expliquez pourquoi vous confirmez cette alerte..."
        buttonText="Confirmer"
        commentType="green"
        onSubmit={(comment) => {
          if (confirmingAlertId) {
            handleConfirmWithForm(confirmingAlertId, comment);
          }
        }}
      />

      <ValidationModal
        isOpen={!!rejectingAlertId}
        onClose={() => setRejectingAlertId(null)}
        title="Marquer comme fausse alerte"
        placeholder="Expliquez pourquoi vous considérez cette alerte comme fausse..."
        buttonText="Confirmer le rejet"
        commentType="red"
        onSubmit={(comment) => {
          if (rejectingAlertId) {
            handleRejectWithForm(rejectingAlertId, comment);
          }
        }}
      />
    </div>
  );
}