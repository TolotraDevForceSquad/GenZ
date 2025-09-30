import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Upload, Shield, CheckCircle, User, Phone, Mail, Camera } from "lucide-react";

interface ProfilePageProps {
  user?: {
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
  };
  onUpdateProfile?: (data: any) => void;
  onUploadCIN?: (file: File) => void;
  onUploadAvatar?: (file: File) => void;
}

export default function ProfilePage({ 
  user, 
  onUpdateProfile, 
  onUploadCIN, 
  onUploadAvatar 
}: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    neighborhood: user?.neighborhood || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile updated:', formData);
    onUpdateProfile?.(formData);
    setIsEditing(false);
  };

  const handleCINUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('CIN file selected:', file.name);
      onUploadCIN?.(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Avatar file selected:', file.name);
      onUploadAvatar?.(file);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et votre statut de vérification
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div className="relative inline-block">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-2xl">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  data-testid="button-upload-avatar"
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                {user?.name || 'Utilisateur'}
                {user?.hasCIN && (
                  <Shield className="w-5 h-5 text-green-400" />
                )}
              </CardTitle>
              <CardDescription>
                Membre depuis {user?.joinedAt || 'récemment'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge 
                  className={user?.hasCIN 
                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }
                  data-testid={`status-${user?.hasCIN ? 'verified' : 'pending'}`}
                >
                  {user?.hasCIN ? 'Utilisateur vérifié' : 'En attente de vérification'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{user?.alertsCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Alertes créées</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{user?.validationsCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Validations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>
                    Gérez vos informations de profil et de contact
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-edit-profile"
                >
                  {isEditing ? 'Annuler' : 'Modifier'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      className="pl-10"
                      data-testid="input-profile-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className="pl-10"
                      data-testid="input-profile-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="votre@email.com"
                      data-testid="input-profile-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Quartier</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="neighborhood"
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder={formData.neighborhood || "À compléter"}
                      data-testid="input-profile-neighborhood"
                    />
                  </div>
                  {!formData.neighborhood && (
                    <p className="text-sm text-yellow-600">⚠️ Veuillez compléter votre quartier</p>
                  )}
                </div>

                {isEditing && (
                  <Button type="submit" data-testid="button-save-profile">
                    Sauvegarder les modifications
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* CIN Verification */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Vérification d'identité (CIN)
              </CardTitle>
              <CardDescription>
                Uploadez votre carte d'identité nationale pour devenir un utilisateur vérifié.
                Les utilisateurs vérifiés voient leurs alertes automatiquement confirmées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.hasCIN ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="font-medium text-green-400">Identité vérifiée</p>
                    <p className="text-sm text-muted-foreground">
                      Votre carte d'identité a été validée. Vos alertes sont automatiquement confirmées.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-start gap-3">
                      <Upload className="w-6 h-6 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-400">Vérification en attente</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Uploadez une photo claire de votre carte d'identité nationale (recto/verso).
                          Le traitement prend généralement 24-48h.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cin-front" className="text-sm font-medium">
                        Recto de la CIN
                      </Label>
                      <div className="mt-2">
                        <input
                          id="cin-front"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCINUpload}
                        />
                        <Button
                          variant="outline"
                          className="w-full h-32 flex-col gap-2"
                          onClick={() => document.getElementById('cin-front')?.click()}
                          data-testid="button-upload-cin-front"
                        >
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm">Cliquer pour uploader</span>
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cin-back" className="text-sm font-medium">
                        Verso de la CIN
                      </Label>
                      <div className="mt-2">
                        <input
                          id="cin-back"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCINUpload}
                        />
                        <Button
                          variant="outline"
                          className="w-full h-32 flex-col gap-2"
                          onClick={() => document.getElementById('cin-back')?.click()}
                          data-testid="button-upload-cin-back"
                        >
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm">Cliquer pour uploader</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Format accepté : JPG, PNG (max 5MB)</p>
                    <p>• Assurez-vous que toutes les informations sont lisibles</p>
                    <p>• Vos données sont sécurisées et ne sont utilisées que pour la vérification</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}