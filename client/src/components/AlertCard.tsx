import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Shield,
  MoreHorizontal,
  CheckCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface AlertCardProps {
  alert: {
    id: string;
    reason: string;
    description: string;
    location: string;
    status: 'pending' | 'confirmed' | 'fake' | 'resolved';
    urgency: 'low' | 'medium' | 'high';
    timestamp: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
      hasCIN: boolean;
    };
    validations: {
      confirmed: number;
      rejected: number;
    };
    media?: string;
  };
  onValidate?: (alertId: string, validation: 'confirm' | 'reject' | 'resolved', comment?: string) => void;
  onViewDetails?: (alertId: string) => void;
  currentUserId?: string;
  showActions?: boolean;
}

export default function AlertCard({ 
  alert, 
  onValidate, 
  onViewDetails, 
  currentUserId,
  showActions = true 
}: AlertCardProps) {
  const [rejectComment, setRejectComment] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resolveComment, setResolveComment] = useState('');
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'fake': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'resolved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmée';
      case 'fake': return 'Fausse alerte';
      case 'resolved': return 'Réglée';
      default: return 'En validation';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Urgent';
      case 'medium': return 'Modéré';
      default: return 'Info';
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={alert.author.avatar} alt={alert.author.name} />
              <AvatarFallback>{alert.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{alert.author.name}</span>
                {alert.author.hasCIN && (
                  <Shield className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {alert.timestamp}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(alert.status)} data-testid={`status-${alert.status}`}>
              {getStatusText(alert.status)}
            </Badge>
            <Badge className={getUrgencyColor(alert.urgency)}>
              {getUrgencyText(alert.urgency)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-base mb-1">{alert.reason}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {alert.description}
          </p>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{alert.location}</span>
        </div>

        {alert.media && (
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-primary/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Média joint disponible</p>
          </div>
        )}

        {showActions && (alert.status === 'pending' || alert.status === 'confirmed') && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{alert.validations.confirmed} confirmations</span>
              <span>{alert.validations.rejected} rejets</span>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 px-3"
                    data-testid="button-reject"
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    Rejeter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Rejeter l'alerte</DialogTitle>
                    <DialogDescription>
                      Pourquoi rejetez-vous cette alerte ? Votre commentaire aidera la communauté.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Expliquez pourquoi cette alerte n'est pas valide..."
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-reject-comment"
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsDialogOpen(false);
                        setRejectComment('');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => {
                        onValidate?.(alert.id, 'reject', rejectComment);
                        setIsDialogOpen(false);
                        setRejectComment('');
                      }}
                      disabled={!rejectComment.trim()}
                      data-testid="button-confirm-reject"
                    >
                      Rejeter l'alerte
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {alert.status === 'pending' && (
                <Button 
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => onValidate?.(alert.id, 'confirm')}
                  data-testid="button-confirm"
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Confirmer
                </Button>
              )}
              {alert.status === 'confirmed' && currentUserId === alert.author.id && (
                <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-resolve"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Marquer réglé
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Marquer comme réglé</DialogTitle>
                      <DialogDescription>
                        Cette alerte a-t-elle été résolue ? Ajoutez un commentaire pour expliquer.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Expliquez comment cette situation a été réglée..."
                        value={resolveComment}
                        onChange={(e) => setResolveComment(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="textarea-resolve-comment"
                      />
                    </div>
                    <DialogFooter className="gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setIsResolveDialogOpen(false);
                          setResolveComment('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        onClick={() => {
                          onValidate?.(alert.id, 'resolved', resolveComment);
                          setIsResolveDialogOpen(false);
                          setResolveComment('');
                        }}
                        disabled={!resolveComment.trim()}
                        data-testid="button-confirm-resolve"
                      >
                        Marquer réglé
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}