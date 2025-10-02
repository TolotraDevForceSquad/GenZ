// components/LibDash.tsx - Design DARK et RESPONSIVE avec MODALE VIDÉO et BOUTONS D'ACTION DIRECTS
import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  Bookmark,
  Clock,
  MapPin,
  CheckCircle,
  Plus,
  X,
  Link,
  User,
  MoreVertical,
  Edit,
  Check,
  X as CloseIcon,
  Play,
  Eye,
  Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// --- (Interfaces et Fonctions d'API restent inchangées) ---

interface AppUser {
  id: string;
  name: string;
  avatar?: string;
  profileImageUrl?: string;
  isAdmin: boolean;
  hasCIN: boolean;
}

interface LibererPost {
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
  author: AppUser;
  view: number;
  resolvedAt?: string;
  createdAt: string;
}

interface NewPostFormState {
  personName: string;
  personDescription: string;
  personImageFile?: File;
  personImageUrl?: string;
  arrestVideoFile?: File;
  arrestVideoUrl?: string;
  arrestDescription: string;
  location: string;
  arrestDate: string;
  arrestedBy: string;
}

interface Comment {
  id: string;
  content: string;
  type: string;
  userId: string;
  user: AppUser;
  createdAt: string;
  updatedAt?: string;
}

const API_BASE = '/api';

const getAuthHeaders = (isJson = true) => {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};


// --------------------------------------------------------------------------------
// Composant VideoContent
// --------------------------------------------------------------------------------

const VideoContent: React.FC<{ url: string; title: string }> = ({ url, title }) => {
    // 1. YouTube Embed Check
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
    
    // 2. Direct Video File Check (for <video> tag)
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

    // 3. Default (simple link for non-embeddable URLs)
    return (
        <div className="p-4 bg-gray-900 rounded-lg text-center">
            <p className="text-gray-300 mb-3">Impossible d'intégrer ce lien vidéo directement.</p>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-3 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-blue-400 transition"
            >
                <Link className="w-4 h-4 mr-2" />
                Ouvrir la Vidéo (Lien Externe)
            </a>
        </div>
    );
};

// --------------------------------------------------------------------------------
// Composant VideoModal
// --------------------------------------------------------------------------------

const VideoModal: React.FC<{ isOpen: boolean; onClose: () => void; url: string; title: string }> = ({ isOpen, onClose, url, title }) => {
    if (!isOpen) return null;
    
    const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="fixed inset-0 bg-[#161313]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in duration-300" onClick={handleContentClick}>
                <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
                    <h2 className="text-xl font-bold text-white line-clamp-1">Vidéo: {title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition rounded-full hover:bg-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-2 sm:p-4">
                    <VideoContent url={url} title={title} />
                </div>
            </div>
        </div>
    );
};


// --------------------------------------------------------------------------------
// Composant CommentsModal (Design ajusté pour Dark/Responsive)
// --------------------------------------------------------------------------------

const CommentsModal: React.FC<{ isOpen: boolean; onClose: () => void; comments: Comment[]; postId: string; currentUser: AppUser; onCommentAdded: () => void }> = ({ isOpen, onClose, comments, postId, currentUser, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const diffHours = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "À l'instant";
    if (diffHours === 1) return 'Il y a 1 heure';
    if (diffHours < 24) return `Il y a ${diffHours} heures`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Il y a 1 jour';
    return `Il y a ${diffDays} jours`;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser.id) return;

    try {
      const response = await fetch(`${API_BASE}/liberers/${postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: newComment,
          type: 'comment',
          userId: currentUser.id,
        }),
      });
      if (response.ok) {
        setNewComment('');
        onCommentAdded();
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 my-8 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
          <h2 className="text-xl font-bold text-white">Commentaires</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition rounded-full hover:bg-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Comments Area */}
        <div className="p-4 space-y-4 flex-grow overflow-y-auto no-scrollbar">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Aucun commentaire pour le moment.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 items-start">
                <img
                  src={comment.user.avatar || comment.user.profileImageUrl || 'http://localhost:5005/uploads/icon-user.png'}
                  alt={comment.user.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-yellow-500/50"
                />
                <div className="flex-grow bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white text-sm">@{comment.user.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-gray-300 text-sm break-words">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Comment Input Form */}
        <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-800 flex items-center bg-[#201d1d] sticky bottom-0">
          <img
            src={currentUser.avatar || currentUser.profileImageUrl || 'http://localhost:5005/uploads/icon-user.png'}
            alt="Avatar"
            className="w-9 h-9 rounded-full object-cover mr-3 border-2 border-yellow-500/50"
          />
          <input
            type="text"
            placeholder="Ajoutez un commentaire..."
            className="flex-grow bg-gray-700 text-gray-200 border border-gray-700 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-yellow-500 focus:outline-none transition placeholder-gray-400"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit" disabled={!newComment.trim()} className="ml-3 text-yellow-500 hover:text-yellow-400 transition p-2 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};


// --------------------------------------------------------------------------------
// Composant LibererCard (Design ajusté pour Dark/Responsive)
// --------------------------------------------------------------------------------

const LibererCard: React.FC<{ post: LibererPost; currentUser: AppUser; onUpdateStatus: (id: string, status: LibererPost['status']) => void; onDelete: (id: string) => void }> = ({ post, currentUser, onUpdateStatus, onDelete }) => {
  // showStatusMenu est supprimé
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isAuthorOrAdmin] = useState(currentUser.id === post.author.id || currentUser.isAdmin);

  const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const diffHours = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "À l'instant";
    if (diffHours === 1) return 'Il y a 1 heure';
    if (diffHours < 24) return `Il y a ${diffHours} heures`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Il y a 1 jour';
    return `Il y a ${diffDays} jours`;
  };

  const statusText = {
    'en-detention': 'En détention',
    liberer: 'Libéré',
  }[post.status] || post.status.toUpperCase();

  const statusColor = {
    'en-detention': 'bg-orange-600',
    liberer: 'bg-green-600',
  }[post.status] || 'bg-gray-600';

  const fetchComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`${API_BASE}/liberers/${post.id}/comments`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
        setCommentCount(data.length);
      }
    } catch (error) {
      console.error('Erreur lors du fetch des commentaires:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const handleCommentButtonClick = () => {
    setShowCommentsModal(true);
  };

  const handleStatusChange = async (status: LibererPost['status']) => {
    if (post.status === status) return;

    if (status === 'liberer' && !confirm('Confirmez-vous que cette personne est maintenant Libérée ?')) return;
    if (status === 'en-detention' && !confirm('Confirmez-vous que cette personne est toujours En détention ?')) return;


    try {
      const response = await fetch(`${API_BASE}/liberers/${post.id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, authorId: currentUser.id }),
      });
      if (response.ok) {
        onUpdateStatus(post.id, status);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette publication ? Cette action est irréversible.')) return;
    try {
      const response = await fetch(`${API_BASE}/liberers/${post.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ authorId: currentUser.id }),
      });
      if (response.ok) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  return (
    <div className="bg-[#201d1d] border border-gray-800 rounded-xl shadow-2xl mb-6 lg:mb-0 transform hover:scale-[1.01] transition duration-300">
      {/* En-tête de la publication */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src={post.author.avatar || post.author.profileImageUrl || 'http://localhost:5005/uploads/icon-user.png'}
            alt={post.author.name}
            className="w-11 h-11 rounded-full object-cover mr-3 border-2 border-yellow-500/50 flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-white text-sm">
                @{post.author.name}
              </span>
              {post.author.hasCIN && (
                  <span className="flex items-center text-xs text-blue-400 font-medium bg-blue-900/30 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vérifié
                  </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-300">{post.personName}</span>
              {' • '}
              <span className="text-yellow-500">{timeAgo(post.createdAt)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Image de l'article */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[3/2] overflow-hidden">
        <img
          src={post.personImageUrl}
          alt={post.personName}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
        />
        {/* Affichage du statut */}
        <span
          className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold rounded-full text-white shadow-lg ${statusColor}`}
        >
          {statusText}
        </span>
        <span className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-xs text-white/90 rounded-full flex items-center">
          <Eye className='w-3 h-3 mr-1' /> {post.view} vues
        </span>
      </div>
      
      {/* Description rapide */}
      <p className="px-4 pt-4 text-sm text-gray-300 line-clamp-3">{post.personDescription}</p>


      {/* Détails de l'arrestation */}
      <div className="p-4 text-sm text-gray-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mb-3">
          <div className="flex items-start">
            <MapPin className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
            <p>
              <strong className="text-white mr-1">Lieu:</strong> {post.location}
            </p>
          </div>
          <div className="flex items-start">
            <Clock className="w-4 h-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
            <p>
              <strong className="text-white mr-1">Date:</strong>{' '}
              {new Date(post.arrestDate).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        <div className="flex items-start mb-3">
          <User className="w-4 h-4 mr-2 mt-0.5 text-purple-500 flex-shrink-0" />
          <p>
            <strong className="text-white mr-1">Arrêté par:</strong> {post.arrestedBy}
          </p>
        </div>
        
        {/* Détails du cas */}
        <p className="mt-3 text-gray-300 line-clamp-2">
          <strong className="text-white">Détails du cas:</strong>{' '}
          {post.arrestDescription}
        </p>
      </div>
      
      {/* Bouton pour ouvrir la Modale Vidéo */}
      {post.arrestVideoUrl && (
          <>
          <div className="p-4 pt-0">
              <button
                  onClick={() => setShowVideoModal(true)}
                  className="flex items-center justify-center w-full p-3 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-800 text-white transition shadow-md"
              >
                  <Play className="w-4 h-4 mr-2" />
                  Voir la Vidéo d'Arrestation
              </button>
          </div>
          <VideoModal
              isOpen={showVideoModal}
              onClose={() => setShowVideoModal(false)}
              url={post.arrestVideoUrl}
              title={post.personName}
          />
          </>
      )}
      
      {/* Barre d'interaction */}
      <div className="flex justify-between items-center p-4 border-t border-gray-800">
        
        {/* Partie Gauche: Commentaires */}
        <div className="flex space-x-6 text-gray-400">
          <button onClick={handleCommentButtonClick} className="flex items-center space-x-1 hover:text-blue-400 transition p-2 -ml-2 rounded-lg hover:bg-gray-700">
            <MessageCircle className="w-6 h-6" />
            <span className="ml-1 text-base">{commentCount}</span>
          </button>
        </div>

        {/* ✅ MODIFIÉ: Partie Droite: Boutons d'Action pour l'Admin/Auteur (Responsive) */}
        {isAuthorOrAdmin && (
          <div className="flex space-x-2 text-sm flex-shrink-0">
            {/* Bouton 'Libéré' */}
            <button
              onClick={() => handleStatusChange('liberer')}
              title="Marquer comme Libéré"
              disabled={post.status === 'liberer'}
              className={`flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-semibold transition whitespace-nowrap ${post.status === 'liberer' 
                  ? 'bg-green-700 text-green-300 opacity-70 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
              }`}
            >
              <Check className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Libéré</span>
              <span className="sm:hidden">Lib.</span>
            </button>
            
            {/* Bouton 'En détention' */}
            <button
                onClick={() => handleStatusChange('en-detention')}
                title="Marquer comme En détention"
                disabled={post.status === 'en-detention'}
                className={`flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-semibold transition whitespace-nowrap ${post.status === 'en-detention' 
                    ? 'bg-orange-700 text-orange-300 opacity-70 cursor-not-allowed' 
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md'
                }`}
            >
                <Clock className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">En détention</span>
                <span className="sm:hidden">Dét.</span>
            </button>
            
            {/* Bouton 'Supprimer' (Reste compact avec icône) */}
            {/* <button
              onClick={handleDelete}
              title="Supprimer la publication"
              className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-md flex items-center justify-center flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button> */}
          </div>
        )}
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        comments={comments}
        postId={post.id}
        currentUser={currentUser}
        onCommentAdded={fetchComments}
      />
    </div>
  );
};

// --------------------------------------------------------------------------------
// Composant NewPostForm (Scrollbar fix)
// --------------------------------------------------------------------------------

const NewPostForm: React.FC<{ onClose: () => void; onSuccess: () => void; currentUser: AppUser }> = ({ onClose, onSuccess, currentUser }) => {
  const [formState, setFormState] = useState<NewPostFormState>({
    personName: '',
    personDescription: '',
    arrestDescription: '',
    location: '',
    arrestDate: new Date().toISOString().split('T')[0],
    arrestedBy: '',
  });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [useImageUrl, setUseImageUrl] = useState(false);
  const [useVideoUrl, setUseVideoUrl] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      if (type === 'image') {
        setFormState((prev) => ({ ...prev, personImageFile: file, personImageUrl: '' }));
        setImagePreview(previewUrl);
      } else {
        setFormState((prev) => ({ ...prev, arrestVideoFile: file, arrestVideoUrl: '' }));
        setVideoPreview(previewUrl);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) {
      alert('Utilisateur non authentifié');
      return;
    }

    if (!formState.personImageFile && !formState.personImageUrl) {
      alert('Image de la personne requise');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('personName', formState.personName);
    formData.append('personDescription', formState.personDescription);
    formData.append('arrestDescription', formState.arrestDescription);
    formData.append('location', formState.location);
    formData.append('arrestDate', formState.arrestDate);
    formData.append('arrestedBy', formState.arrestedBy);
    formData.append('authorId', currentUser.id);
    formData.append('validation', 'false');

    if (formState.personImageFile) {
      formData.append('personImage', formState.personImageFile);
    } else if (formState.personImageUrl) {
      formData.append('personImageUrl', formState.personImageUrl);
    }

    if (formState.arrestVideoFile) {
      formData.append('arrestVideo', formState.arrestVideoFile);
    } else if (formState.arrestVideoUrl) {
      formData.append('arrestVideoUrl', formState.arrestVideoUrl);
    }

    try {
      const response = await fetch(`${API_BASE}/liberers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Erreur lors de la publication: ${errorData.message || 'Problème inconnu.'}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la publication');
    } finally {
      setUploading(false);
    }
  };

  const inputClass = 'w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:ring-yellow-500 focus:border-yellow-500 placeholder-gray-500 transition';

  return (
    <form className="space-y-6" onSubmit={handleSubmit}> {/* ✅ MODIFIÉ: Suppression de max-h-[70vh] overflow-y-auto no-scrollbar */}
      
      <h3 className="text-xl font-bold text-yellow-500 border-b border-gray-800 pb-2">Personne Détenue</h3>
      
      <div className="space-y-4">
        <input name="personName" value={formState.personName} onChange={handleChange} placeholder="Nom complet de la personne (Obligatoire)" className={inputClass} required />
        <textarea name="personDescription" value={formState.personDescription} onChange={handleChange} placeholder="Courte description/bio de la personne (Obligatoire)" rows={3} className={inputClass} required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
            Image de la personne (Obligatoire)
            {imagePreview && <CheckCircle className="w-4 h-4 text-green-500 ml-2" />}
        </label>
        <div className="flex space-x-2 mb-3">
          <button type="button" onClick={() => { setUseImageUrl(false); setFormState(prev => ({ ...prev, personImageFile: undefined, personImageUrl: '' })); setImagePreview(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!useImageUrl ? 'bg-yellow-500 text-gray-900 shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Fichier local
          </button>
          <button type="button" onClick={() => { setUseImageUrl(true); setFormState(prev => ({ ...prev, personImageFile: undefined, personImageUrl: '' })); setImagePreview(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${useImageUrl ? 'bg-yellow-500 text-gray-900 shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            URL
          </button>
        </div>
        {!useImageUrl ? (
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-yellow-500 hover:file:bg-gray-600" />
        ) : (
          <input type="url" name="personImageUrl" value={formState.personImageUrl || ''} onChange={handleChange} placeholder="URL de l'image" className={inputClass} />
        )}
        {imagePreview && <img src={imagePreview} alt="Aperçu" className="mt-4 w-24 h-24 object-cover rounded-lg border border-gray-700 shadow-md" />}
      </div>

      <h3 className="text-xl font-bold text-yellow-500 border-b border-gray-800 pb-2 pt-4">Détails de l'Arrestation</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="date" name="arrestDate" value={formState.arrestDate} onChange={handleChange} className={`${inputClass} pl-10`} required />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input name="location" value={formState.location} onChange={handleChange} placeholder="Ville, Quartier..." className={`${inputClass} pl-10`} required />
        </div>
      </div>
      <div className="relative">
        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input name="arrestedBy" value={formState.arrestedBy} onChange={handleChange} placeholder="Autorité qui a procédé à l'arrestation" className={`${inputClass} pl-10`} required />
      </div>
      <textarea name="arrestDescription" value={formState.arrestDescription} onChange={handleChange} placeholder="Description détaillée de l'incident (Obligatoire)" rows={5} className={inputClass} required />

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
            Vidéo d'arrestation (Optionnel)
            {(formState.arrestVideoFile || formState.arrestVideoUrl) && <CheckCircle className="w-4 h-4 text-green-500 ml-2" />}
        </label>
        <div className="flex space-x-2 mb-3">
          <button type="button" onClick={() => { setUseVideoUrl(false); setFormState(prev => ({ ...prev, arrestVideoFile: undefined, arrestVideoUrl: '' })); setVideoPreview(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!useVideoUrl ? 'bg-yellow-500 text-gray-900 shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Fichier local
          </button>
          <button type="button" onClick={() => { setUseVideoUrl(true); setFormState(prev => ({ ...prev, arrestVideoFile: undefined, arrestVideoUrl: '' })); setVideoPreview(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${useVideoUrl ? 'bg-yellow-500 text-gray-900 shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            URL
          </button>
        </div>
        {!useVideoUrl ? (
          <input type="file" accept="video/*" onChange={(e) => handleFileChange(e, 'video')} className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-yellow-500 hover:file:bg-gray-600" />
        ) : (
          <div className="relative">
            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="url" name="arrestVideoUrl" value={formState.arrestVideoUrl || ''} onChange={handleChange} placeholder="Lien vers vidéo (YouTube, etc.)" className={`${inputClass} pl-10`} />
          </div>
        )}
        {videoPreview && <video src={videoPreview} controls className="mt-4 w-full h-auto max-h-48 object-cover rounded-lg border border-gray-700 shadow-md" />}
      </div>

      <button type="submit" disabled={uploading} className="w-full bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 mt-6">
        {uploading ? 'Publication en cours...' : 'Publier le Nouveau Cas'}
      </button>
    </form>
  );
};

// ... (Le reste du code NewPostModal et LibDash n'a pas été modifié car il est correct)
const NewPostModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; currentUser: AppUser }> = ({ isOpen, onClose, onSuccess, currentUser }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161313]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#201d1d] border border-gray-800 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 my-8 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-[#201d1d] z-10">
          <h2 className="text-xl font-bold text-white">Nouveau Cas de Détention</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition rounded-full hover:bg-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto no-scrollbar"> {/* Le scroll est géré ici */}
          <p className="text-gray-400 mb-6 text-sm">Remplissez tous les champs obligatoires pour publier une demande de libération.</p>
          <NewPostForm onClose={onClose} onSuccess={onSuccess} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};


export const LibDash: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posts, setPosts] = useState<LibererPost[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'en-detention' | 'liberer'>('all');

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

  const currentUser: AppUser | null = currentUserRaw ? {
    id: currentUserRaw.id,
    name: currentUserRaw.name,
    avatar: currentUserRaw.avatar,
    profileImageUrl: currentUserRaw.profileImageUrl,
    isAdmin: currentUserRaw.isAdmin || false,
    hasCIN: currentUserRaw.hasCIN || false,
  } : null;

  const currentUserId = currentUser?.id;

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['liberers'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/liberers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    enabled: !!currentUserId,
  });

  useEffect(() => {
    if (postsData) {
      setPosts(postsData.map((p: any) => ({
        ...p,
        author: {
          id: p.author.id,
          name: p.author.name,
          avatar: p.author.avatar || p.author.profileImageUrl,
          profileImageUrl: p.author.profileImageUrl,
          isAdmin: p.author.isAdmin || false,
          hasCIN: p.author.hasCIN || false,
        },
      })));
    }
  }, [postsData]);

  const filteredPosts = posts.filter(post => selectedStatus === 'all' || post.status === selectedStatus);

  const handleSuccess = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/liberers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      setPosts(data.map((p: any) => ({
        ...p,
        author: {
          id: p.author.id,
          name: p.author.name,
          avatar: p.author.avatar || p.author.profileImageUrl,
          profileImageUrl: p.author.profileImageUrl,
          isAdmin: p.author.isAdmin || false,
          hasCIN: p.author.hasCIN || false,
        },
      })));
    }
  };

  const handleUpdateStatus = (id: string, status: LibererPost['status']) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const handleDelete = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const statusConfig = [
    { key: 'all' as const, label: 'Toutes les alertes', icon: null, color: 'bg-gray-600' },
    { key: 'en-detention' as const, label: 'En détention', icon: Clock, color: 'bg-orange-500' },
    { key: 'liberer' as const, label: 'Libéré', icon: Check, color: 'bg-green-500' },
  ];

  if (userLoading || postsLoading) {
    return <div className="min-h-screen bg-[#161313] flex items-center justify-center text-white text-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500"></div>
    </div>;
  }

  if (authError || !currentUser) {
    return <div className="min-h-screen bg-[#161313] flex items-center justify-center text-red-400 text-lg">Non authentifié. Veuillez vous connecter.</div>;
  }

  return (
    <div className="min-h-screen bg-[#161313] text-white">
      {/* Header */}
        <div className='flex flex-col items-center mt-6 px-4 sm:px-6 text-center'>
          <h1 className="text-3xl font-extrabold text-yellow-400 tracking-wider">SOS Libération</h1>
          <p className="text-zinc-400 font-mono text-sm">
            Cette section vous permet de signaler rapidement une situation urgente en cas d’arrestation ou de détention. <br/>Notre équipe reçoit immédiatement l’alerte et vous accompagne dans les démarches nécessaires pour obtenir une libération dans les plus brefs délais..
          </p>
        </div>

      <main className="py-6 px-4 sm:px-6">
        {/* Section de filtre (responsive, défilement horizontal sur mobile) */}
        <div className="mb-8 max-w-6xl mx-auto">
          <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
            {statusConfig.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap border ${selectedStatus === key
                  ? `${color} text-gray-900 shadow-lg border-transparent`
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-gray-700'
                  }`}
              >
                {Icon && <Icon className={`w-4 h-4 mr-1 ${selectedStatus === key ? 'text-gray-900' : 'text-gray-400'}`} />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille de publications (responsive: 1 colonne sur mobile, 2 sur large) */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <LibererCard key={post.id} post={post} currentUser={currentUser} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
          ))}
        </div>

        {filteredPosts.length === 0 && <p className="text-center text-gray-500 mt-20 text-lg">Aucune publication pour le statut sélectionné.</p>}
      </main>

      {/* Bouton Flottant (responsive) */}
      <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 flex flex-row items-center space-x-3 z-40">
        <div className="group relative hidden sm:block">
          <img
            src={currentUser.avatar || currentUser.profileImageUrl || 'http://localhost:5005/uploads/icon-user.png'}
            alt="Profil"
            className="w-12 h-12 rounded-full object-cover border-2 border-yellow-500 cursor-pointer hover:shadow-lg transition duration-200"
          />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            Connecté: {currentUser.name}
          </span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-yellow-500 p-4 rounded-full shadow-2xl hover:bg-yellow-600 transition duration-300">
          <Plus className="w-6 h-6 text-gray-900 font-bold" />
        </button>
      </div>

      <NewPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} currentUser={currentUser} />
    </div>
  );
};

export default LibDash;