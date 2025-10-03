// routes.ts - Updated with CIN Verification CRUD routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAlertSchema, updateAlertStatusSchema, validateAlertSchema, insertUserSchema, insertAlertCommentSchema, updateAlertSchema, insertLibererSchema, updateLibererStatusSchema, updateLibererSchema, insertLibererCommentSchema, insertCinVerificationSchema, updateCinVerificationSchema } from "@shared/schema";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { z } from 'zod';

const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seules les images et vidéos sont autorisées.'));
    }
  }
});

const cinStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/cin';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const cinUpload = multer({
  storage: cinStorageConfig,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées pour la CIN.'));
    }
  }
});

function buildUserResponse(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar || user.profileImageUrl,
    hasCIN: user.hasCIN,
    isAdmin: user.isAdmin,
    neighborhood: user.neighborhood,
    region: user.region,
    latitude: user.latitude,
    longitude: user.longitude,
    joinedAt: user.joinedAt,
    alertsCount: user.alertsCount,
    validationsCount: user.validationsCount
  };
}

function buildUserFullResponse(user: any) {
  return {
    ...buildUserResponse(user),
    cinUploadedFront: user.cinUploadedFront,
    cinUploadedBack: user.cinUploadedBack,
    cinUploadFrontUrl: user.cinUploadFrontUrl,
    cinUploadBackUrl: user.cinUploadBackUrl,
    cinVerified: user.cinVerified,
    cinVerifiedAt: user.cinVerifiedAt,
    cinVerifiedBy: user.cinVerifiedBy,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function buildAdminUserResponse(user: any) {
  return {
    ...buildUserFullResponse(user),
    isActive: user.isActive,
    // Admin gets everything, including verifier details if needed
  };
}

async function renameCINFiles(userId: string, oldFirstName: string, newFirstName: string) {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    const uploadDir = 'uploads/cin';

    // Handle front
    if (user.cinUploadFrontUrl) {
      const oldFilename = path.basename(user.cinUploadFrontUrl);
      const ext = path.extname(oldFilename);
      const baseName = path.basename(oldFilename, ext);
      const parts = baseName.split('_');
      if (parts.length === 3 && parts[1] === userId && parts[2] === 'front' && parts[0] === oldFirstName) {
        const newFilename = `${newFirstName}_${userId}_front${ext}`;
        const oldPath = path.join(uploadDir, oldFilename);
        const newPath = path.join(uploadDir, newFilename);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          await storage.updateUser(userId, { cinUploadFrontUrl: `/uploads/cin/${newFilename}` });
          console.log(`Renamed CIN front: ${oldFilename} -> ${newFilename}`);
        }
      }
    }

    // Handle back
    if (user.cinUploadBackUrl) {
      const oldFilename = path.basename(user.cinUploadBackUrl);
      const ext = path.extname(oldFilename);
      const baseName = path.basename(oldFilename, ext);
      const parts = baseName.split('_');
      if (parts.length === 3 && parts[1] === userId && parts[2] === 'back' && parts[0] === oldFirstName) {
        const newFilename = `${newFirstName}_${userId}_back${ext}`;
        const oldPath = path.join(uploadDir, oldFilename);
        const newPath = path.join(uploadDir, newFilename);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          await storage.updateUser(userId, { cinUploadBackUrl: `/uploads/cin/${newFilename}` });
          console.log(`Renamed CIN back: ${oldFilename} -> ${newFilename}`);
        }
      }
    }
  } catch (error) {
    console.error('Error renaming CIN files:', error);
  }
}

// ✅ AJOUTÉ: Fonction utilitaire pour vérifier si l'utilisateur est admin
async function isAdmin(authHeader: string | undefined): Promise<{ isAdmin: boolean; userId: string | null }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false, userId: null };
  }

  const userId = authHeader.split(' ')[1];
  const user = await storage.getUser(userId);
  return { isAdmin: user?.isAdmin || false, userId };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json()); // ✅ AJOUTÉ: Parser JSON pour les body requests
  app.use('/uploads', express.static('uploads'));

  // Alert routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const authorId = req.query.authorId as string;

      const alerts = await storage.getAlerts({ limit, status, authorId });

      const alertsWithAuthor = await Promise.all(
        alerts.map(async (alert: any) => {
          try {
            const author = await storage.getUser(alert.authorId);
            return {
              ...alert,
              author: author ? {
                id: author.id,
                name: author.name,
                avatar: author.avatar || author.profileImageUrl,
                hasCIN: author.hasCIN
              } : {
                id: "unknown",
                name: "Utilisateur inconnu",
                avatar: "",
                hasCIN: false
              }
            };
          } catch (error) {
            console.error(`Error fetching author for alert ${alert.id}:`, error);
            return {
              ...alert,
              author: {
                id: "unknown",
                name: "Utilisateur inconnu",
                avatar: "",
                hasCIN: false
              }
            };
          }
        })
      );

      res.json(alertsWithAuthor);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // ✅ AJOUTÉ: Route pour récupérer une alerte unique avec système de vue
  app.get("/api/alerts/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Vérification d'auth pour le système de vue
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userId = authHeader.split(' ')[1];
      }

      // Enregistrer la vue si utilisateur authentifié et n'a pas déjà vu
      if (userId) {
        const viewRecorded = await storage.recordView(id, userId);
        if (viewRecorded) {
          console.log(`Vue enregistrée pour l'utilisateur ${userId} sur l'alerte ${id}`);
        }
      }

      const alert = await storage.getAlert(id);
      if (!alert) {
        return res.status(404).json({ error: "Alerte non trouvée" });
      }

      // Ajout de l'auteur dans la réponse
      const author = await storage.getUser(alert.authorId);
      const alertWithAuthor = {
        ...alert,
        author: author ? {
          id: author.id,
          name: author.name,
          avatar: author.avatar || author.profileImageUrl,
          hasCIN: author.hasCIN
        } : {
          id: "unknown",
          name: "Utilisateur inconnu",
          avatar: "",
          hasCIN: false
        }
      };

      res.json(alertWithAuthor);
    } catch (error) {
      console.error('Error fetching single alert:', error);
      res.status(500).json({ error: "Failed to fetch alert" });
    }
  });

  app.post("/api/alerts", upload.single("media"), async (req, res) => {
    try {
      const { reason, description, location, urgency, authorId, latitude, longitude, region } = req.body;
      const media = req.file ? [`/uploads/${req.file.filename}`] : [];

      const defaultAuthorId = "usr_admin_001";
      const effectiveAuthorId = authorId || defaultAuthorId;

      // ✅ CORRECTION : Conversion des coordonnées en nombres
      const parsedLatitude = latitude ? parseFloat(latitude) : undefined;
      const parsedLongitude = longitude ? parseFloat(longitude) : undefined;

      const data = {
        reason: reason || "Autre",
        description: description || "Pas de description",
        location: location || "Lieu non précisé",
        urgency: urgency || "medium",
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        media,
        region,
        authorId: effectiveAuthorId
      };

      console.log("🚨 DEBUG ALERT INSERT:", data);

      const alert = await storage.createAlert(data);

      const author = await storage.getUser(effectiveAuthorId);
      const alertWithAuthor = {
        ...alert,
        author: author ? {
          id: author.id,
          name: author.name,
          avatar: author.avatar || author.profileImageUrl,
          hasCIN: author.hasCIN
        } : {
          id: "unknown",
          name: "Utilisateur inconnu",
          avatar: "",
          hasCIN: false
        }
      };

      res.json(alertWithAuthor);
    } catch (err: any) {
      console.error("❌ Erreur création alerte détaillée:", err);
      res.status(500).json({
        error: "Erreur lors de la création de l'alerte",
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // ✅ AJOUTÉ: Endpoint pour mettre à jour une alerte (par auteur ou admin)
  app.put("/api/alerts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { updaterId, ...updates } = req.body;

      if (!updaterId) {
        return res.status(400).json({ error: "Updater ID is required" });
      }

      // Validation des updates avec le schéma
      const validatedUpdates = updateAlertSchema.parse(updates);

      const result = await storage.updateAlert(id, validatedUpdates, updaterId);

      if (!result) {
        return res.status(404).json({ error: "Alert not found or unauthorized" });
      }

      // Ajout de l'auteur dans la réponse
      const author = await storage.getUser(result.authorId);
      const alertWithAuthor = {
        ...result,
        author: author ? {
          id: author.id,
          name: author.name,
          avatar: author.avatar || author.profileImageUrl,
          hasCIN: author.hasCIN
        } : {
          id: "unknown",
          name: "Utilisateur inconnu",
          avatar: "",
          hasCIN: false
        }
      };

      res.json(alertWithAuthor);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.post("/api/alerts/:id/validate", async (req, res) => {
    try {
      const { id } = req.params;
      const { isConfirmed, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const result = await storage.validateAlert(id, isConfirmed, userId);

      if (!result) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error validating alert:", error);

      if (error.message === "User has already voted") {
        return res.status(409).json({ error: "User has already voted on this alert" });
      }

      res.status(500).json({ error: "Failed to validate alert" });
    }
  });

  app.put("/api/alerts/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, authorId } = req.body;

      if (!authorId) {
        return res.status(400).json({ error: "Author ID is required" });
      }

      const result = await storage.updateAlertStatus(id, status, authorId);

      if (!result) {
        return res.status(404).json({ error: "Alert not found or unauthorized" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating alert status:", error);
      res.status(500).json({ error: "Failed to update alert status" });
    }
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { authorId } = req.body;

      if (!authorId) {
        return res.status(400).json({ error: "Author ID is required" });
      }

      const success = await storage.deleteAlert(id, authorId);

      if (!success) {
        return res.status(404).json({ error: "Alert not found or unauthorized" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // ✅ AJOUTÉ: Liberer routes

  // GET /api/liberers
  app.get("/api/liberers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const authorId = req.query.authorId as string;

      const liberers = await storage.getLiberers({ limit, status, authorId });

      const liberersWithAuthor = await Promise.all(
        liberers.map(async (liber: any) => {
          try {
            const author = await storage.getUser(liber.authorId);
            return {
              ...liber,
              author: author ? {
                id: author.id,
                name: author.name,
                avatar: author.avatar || author.profileImageUrl,
                hasCIN: author.hasCIN
              } : {
                id: "unknown",
                name: "Utilisateur inconnu",
                avatar: "",
                hasCIN: false
              }
            };
          } catch (error) {
            console.error(`Error fetching author for liberer ${liber.id}:`, error);
            return {
              ...liber,
              author: {
                id: "unknown",
                name: "Utilisateur inconnu",
                avatar: "",
                hasCIN: false
              }
            };
          }
        })
      );

      res.json(liberersWithAuthor);
    } catch (error) {
      console.error('Error fetching liberers:', error);
      res.status(500).json({ error: "Failed to fetch liberers" });
    }
  });

  // GET /api/liberers/:id
  app.get("/api/liberers/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const liber = await storage.getLiberer(id);
      if (!liber) {
        return res.status(404).json({ error: "Demande de libération non trouvée" });
      }

      // Ajout de l'auteur dans la réponse
      const author = await storage.getUser(liber.authorId);
      const liberWithAuthor = {
        ...liber,
        author: author ? {
          id: author.id,
          name: author.name,
          avatar: author.avatar || author.profileImageUrl,
          hasCIN: author.hasCIN
        } : {
          id: "unknown",
          name: "Utilisateur inconnu",
          avatar: "",
          hasCIN: false
        }
      };

      res.json(liberWithAuthor);
    } catch (error) {
      console.error('Error fetching single liberer:', error);
      res.status(500).json({ error: "Failed to fetch liberer" });
    }
  });

  // POST /api/liberers (with upload for personImage and arrestVideo)
  app.post("/api/liberers", upload.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'arrestVideo', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { personName, personDescription, arrestDescription, location, validation, arrestDate, arrestedBy, authorId } = req.body;

      const defaultAuthorId = "usr_admin_001";
      const effectiveAuthorId = authorId || defaultAuthorId;

      const files = req.files as any;
      const personImageUrl = files.personImage ? `/uploads/${files.personImage[0].filename}` : null;
      const arrestVideoUrl = files.arrestVideo ? `/uploads/${files.arrestVideo[0].filename}` : null;

      const data = {
        personName: personName || "Nom non précisé",
        personDescription: personDescription || "Pas de description",
        personImageUrl: personImageUrl || req.body.personImageUrl, // Fallback to body URL if no upload
        arrestVideoUrl: arrestVideoUrl || req.body.arrestVideoUrl, // Fallback to body URL if no upload
        arrestDescription: arrestDescription || "Pas de description d'arrestation",
        location: location || "Lieu non précisé",
        validation: validation ? JSON.parse(validation) : false,
        arrestDate: new Date(arrestDate || Date.now()).toISOString(),
        arrestedBy: arrestedBy || "Non spécifié",
        authorId: effectiveAuthorId
      };

      console.log("🆘 DEBUG LIBERER INSERT:", data);

      const liber = await storage.createLiberer(data);

      const author = await storage.getUser(effectiveAuthorId);
      const liberWithAuthor = {
        ...liber,
        author: author ? {
          id: author.id,
          name: author.name,
          avatar: author.avatar || author.profileImageUrl,
          hasCIN: author.hasCIN
        } : {
          id: "unknown",
          name: "Utilisateur inconnu",
          avatar: "",
          hasCIN: false
        }
      };

      res.json(liberWithAuthor);
    } catch (err: any) {
      console.error("❌ Erreur création liberer détaillée:", err);
      res.status(500).json({
        error: "Erreur lors de la création de la demande de libération",
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // PUT /api/liberers/:id
  app.put("/api/liberers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { updaterId, ...updates } = req.body;

      if (!updaterId) {
        return res.status(400).json({ error: "Updater ID is required" });
      }

      // Validation des updates avec le schéma
      const validatedUpdates = updateLibererSchema.parse(updates);

      const result = await storage.updateLiberer(id, validatedUpdates, updaterId);

      if (!result) {
        return res.status(404).json({ error: "Liberer not found or unauthorized" });
      }

      // Ajout de l'auteur dans la réponse
      const author = await storage.getUser(result.authorId);
      const liberWithAuthor = {
        ...result,
        author: author ? {
          id: author.id,
          name: author.name,
          avatar: author.avatar || author.profileImageUrl,
          hasCIN: author.hasCIN
        } : {
          id: "unknown",
          name: "Utilisateur inconnu",
          avatar: "",
          hasCIN: false
        }
      };

      res.json(liberWithAuthor);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating liberer:", error);
      res.status(500).json({ error: "Failed to update liberer" });
    }
  });

  // PUT /api/liberers/:id/status
  app.put("/api/liberers/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, authorId } = req.body;

      if (!authorId) {
        return res.status(400).json({ error: "Author ID is required" });
      }

      const result = await storage.updateLibererStatus(id, status, authorId);

      if (!result) {
        return res.status(404).json({ error: "Liberer not found or unauthorized" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating liberer status:", error);
      res.status(500).json({ error: "Failed to update liberer status" });
    }
  });

  // PUT /api/liberers/:id/validation
  app.put("/api/liberers/:id/validation", async (req, res) => {
    try {
      const { id } = req.params;
      const { validation, authorId } = req.body;

      if (!authorId) {
        return res.status(400).json({ error: "Author ID is required" });
      }

      const result = await storage.updateLibererValidation(id, validation, authorId);

      if (!result) {
        return res.status(404).json({ error: "Liberer not found or unauthorized" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating liberer validation:", error);
      res.status(500).json({ error: "Failed to update liberer validation" });
    }
  });

  // DELETE /api/liberers/:id
  app.delete("/api/liberers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { authorId } = req.body;

      if (!authorId) {
        return res.status(400).json({ error: "Author ID is required" });
      }

      const success = await storage.deleteLiberer(id, authorId);

      if (!success) {
        return res.status(404).json({ error: "Liberer not found or unauthorized" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting liberer:", error);
      res.status(500).json({ error: "Failed to delete liberer" });
    }
  });

  // Comment routes for liberer
  app.get("/api/liberers/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getLibererComments(id);

      const commentsWithUser = await Promise.all(
        comments.map(async (comment: any) => {
          try {
            const user = await storage.getUser(comment.userId);
            return {
              ...comment,
              user: user ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar || user.profileImageUrl,
              } : null
            };
          } catch (error) {
            console.error(`Error fetching user for comment ${comment.id}:`, error);
            return { ...comment, user: null };
          }
        })
      );

      res.json(commentsWithUser);
    } catch (error) {
      console.error('Error fetching liberer comments:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/liberers/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { type, content, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const data = {
        libererId: id,
        userId,
        type: type || 'text',
        content,
      };

      const comment = await storage.createLibererComment(data);

      const user = await storage.getUser(userId);
      const commentWithUser = {
        ...comment,
        user: user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar || user.profileImageUrl,
        } : null
      };

      res.status(201).json(commentWithUser);
    } catch (error) {
      console.error("Error creating liberer comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Comment routes
  app.get("/api/alerts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getAlertComments(id);

      const commentsWithUser = await Promise.all(
        comments.map(async (comment: any) => {
          try {
            const user = await storage.getUser(comment.userId);
            return {
              ...comment,
              user: user ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar || user.profileImageUrl,
              } : null
            };
          } catch (error) {
            console.error(`Error fetching user for comment ${comment.id}:`, error);
            return { ...comment, user: null };
          }
        })
      );

      res.json(commentsWithUser);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/alerts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { type, content, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const data = {
        alertId: id,
        userId,
        type: type || 'text',
        content,
      };

      const comment = await storage.createAlertComment(data);

      const user = await storage.getUser(userId);
      const commentWithUser = {
        ...comment,
        user: user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar || user.profileImageUrl,
        } : null
      };

      res.status(201).json(commentWithUser);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({
          error: "Téléphone et mot de passe requis"
        });
      }

      console.log(`🔐 Tentative de connexion pour: ${phone}`);

      // Utiliser le téléphone comme identité
      const user = await storage.validateUserCredentials(phone, password);

      if (!user) {
        console.log(`❌ Échec authentification pour: ${phone}`);
        return res.status(401).json({
          error: "Identifiants incorrects"
        });
      }

      console.log(`✅ Connexion réussie pour: ${user.name} (${user.phone})`);

      const userResponse = buildUserResponse(user);

      res.json({
        user: userResponse,
        token: user.id, // ✅ AJOUTÉ: Token pour l'authentification (utilise l'ID utilisateur)
        redirectTo: user.isAdmin ? '/admin' : '/dashboard',
        success: true
      });
    } catch (error) {
      console.error("❌ Erreur lors de la connexion:", error);
      res.status(500).json({
        error: "Erreur interne du serveur"
      });
    }
  });

  // ✅ AJOUTÉ: Endpoint pour récupérer le profil complet de l'utilisateur connecté
  app.get("/api/auth/me", async (req, res) => {
    try {
      // Vérification d'auth : extraire le token Bearer
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userId = authHeader.split(' ')[1];
      }

      if (!userId) {
        return res.status(401).json({ error: "Non authentifié" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      // Retourne la réponse complète (inclut URLs CIN)
      const userResponse = buildUserFullResponse(user);
      res.json(userResponse);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Échec de la récupération du profil" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password, neighborhood, latitude, longitude, region } = req.body;

      if (!email && !phone) {
        return res.status(400).json({
          error: "Email ou téléphone requis"
        });
      }

      if (!password) {
        return res.status(400).json({
          error: "Mot de passe requis"
        });
      }

      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({
            error: "Un utilisateur avec cet email existe déjà"
          });
        }
      }

      if (phone) {
        const existingUser = await storage.getUserByPhone(phone);
        if (existingUser) {
          return res.status(409).json({
            error: "Un utilisateur avec ce téléphone existe déjà"
          });
        }
      }

      // ✅ CORRECTION : Conversion des coordonnées en nombres
      const parsedLatitude = latitude ? parseFloat(latitude as string) : undefined;
      const parsedLongitude = longitude ? parseFloat(longitude as string) : undefined;

      const userData = {
        firstName,
        lastName,
        email,
        phone,
        password,
        neighborhood,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        region,
        hasCIN: false,
        isAdmin: false
      };

      const newUser = await storage.createUser(userData);

      const userResponse = buildUserResponse(newUser);

      res.status(201).json({ user: userResponse });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({
        error: "Failed to register user",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // ✅ AJOUTÉ: Endpoint pour self-update du profil utilisateur (non-admin)
  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Vérification d'auth - seul l'utilisateur peut modifier son profil
      const authHeader = req.headers.authorization;
      let userIdFromAuth: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userIdFromAuth = authHeader.split(' ')[1];
      }

      if (!userIdFromAuth || id !== userIdFromAuth) {
        return res.status(403).json({ error: "Non autorisé à modifier cet utilisateur" });
      }

      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const oldFirstName = oldUser.firstName;

      const user = await storage.updateUser(id, updates);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (updates.firstName && updates.firstName !== oldFirstName) {
        await renameCINFiles(id, oldFirstName, updates.firstName as string);
      }

      const userResponse = buildUserFullResponse(user);

      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // User routes - Retourne toujours les détails complets (CIN inclus) via URL directe, sans auth stricte
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // ✅ MODIFIÉ: Toujours réponse complète pour accès via URL (pas de sécurité stricte)
      const userResponse = buildUserFullResponse(user);

      res.json(userResponse);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Ajout dans routes.ts : Endpoint pour l'upload d'avatar (similaire à CIN upload, mais pour avatar)

  const avatarStorageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/avatars';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Utilise le prénom de l'utilisateur pour le nommage : avatar_prenom_id.ext
      const userId = req.params.id;
      const userFirstName = req.body.firstName || 'unknown'; // Optionnel: pourrait être passé en body, sinon défaut
      const uniqueName = `avatar_${userFirstName}_${userId}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const avatarUpload = multer({
    storage: avatarStorageConfig,
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB pour avatar
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Seules les images sont autorisées pour l\'avatar.'));
      }
    }
  });

  // Route pour upload avatar
  app.post("/api/users/:id/avatar-upload", avatarUpload.single('avatar'), async (req, res) => {
    try {
      const { id } = req.params;

      // Vérification d'auth - seul l'utilisateur peut uploader son avatar
      const authHeader = req.headers.authorization;
      let userIdFromAuth: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userIdFromAuth = authHeader.split(' ')[1];
      }

      if (!userIdFromAuth || id !== userIdFromAuth) {
        return res.status(403).json({ error: "Non autorisé à uploader l'avatar pour cet utilisateur" });
      }

      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const updates: any = {
        avatar: null
      };

      let uploaded = false;

      if (req.file) {
        const filename = req.file.filename;
        updates.avatar = `/uploads/avatars/${filename}`;
        uploaded = true;
        console.log(`Avatar uploaded for user ${id}: ${filename}`);
      }

      if (uploaded) {
        const updatedUser = await storage.updateUser(id, updates);

        if (!updatedUser) {
          return res.status(500).json({ error: "Échec de la mise à jour utilisateur" });
        }

        const userResponse = buildUserFullResponse(updatedUser);

        res.json({
          success: true,
          user: userResponse,
          message: "Avatar uploadé avec succès"
        });
      } else {
        res.status(400).json({ error: "Aucun fichier avatar uploadé" });
      }
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({
        error: "Échec de l'upload de l'avatar",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Ajout du middleware static pour avatars
  app.use('/uploads/avatars', express.static('uploads/avatars'));
  
  // CIN upload route (re-upload pour modification)
  app.post("/api/users/:id/cin-upload", cinUpload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ AJOUTÉ: Vérification d'auth - seul l'utilisateur peut uploader sa CIN
      const authHeader = req.headers.authorization;
      let userIdFromAuth: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userIdFromAuth = authHeader.split(' ')[1];
      }

      if (!userIdFromAuth || id !== userIdFromAuth) {
        return res.status(403).json({ error: "Non autorisé à uploader pour cet utilisateur" });
      }

      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const updates: any = {
        cinUploadedFront: false,
        cinUploadedBack: false
      };

      const uploadDir = 'uploads/cin';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let uploadedFront = false;
      let uploadedBack = false;

      if (req.files && (req.files as any)['front']) {
        const file = (req.files as any)['front'][0];
        const ext = path.extname(file.originalname);
        const filename = `${user.firstName}_${id}_front${ext}`;
        const newPath = path.join(uploadDir, filename);
        fs.renameSync(file.path, newPath);
        updates.cinUploadedFront = true;
        updates.cinUploadFrontUrl = `/uploads/cin/${filename}`;
        uploadedFront = true;
        console.log(`CIN front uploaded for user ${id}: ${filename}`);
      }

      if (req.files && (req.files as any)['back']) {
        const file = (req.files as any)['back'][0];
        const ext = path.extname(file.originalname);
        const filename = `${user.firstName}_${id}_back${ext}`;
        const newPath = path.join(uploadDir, filename);
        fs.renameSync(file.path, newPath);
        updates.cinUploadedBack = true;
        updates.cinUploadBackUrl = `/uploads/cin/${filename}`;
        uploadedBack = true;
        console.log(`CIN back uploaded for user ${id}: ${filename}`);
      }

      if (uploadedFront || uploadedBack) {
        updates.hasCIN = true;
      }

      const updatedUser = await storage.updateUser(id, updates);

      if (!updatedUser) {
        return res.status(500).json({ error: "Échec de la mise à jour utilisateur" });
      }

      // ✅ MODIFIÉ: Réponse complète pour l'utilisateur
      const userResponse = buildUserFullResponse(updatedUser);

      res.json({
        success: true,
        user: userResponse,
        message: (uploadedFront && uploadedBack) ? "CIN uploadée avec succès" : "Partie(s) de la CIN uploadée(s)"
      });
    } catch (error: any) {
      console.error("Error uploading CIN:", error);
      res.status(500).json({
        error: "Échec de l'upload de la CIN",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ✅ MODIFIÉ: Endpoint pour supprimer une partie spécifique de la CIN (recto ou verso)
  app.delete("/api/users/:id/cin", async (req, res) => {
    try {
      const { id } = req.params;
      const { side } = req.body;

      console.log(`DELETE CIN request for user ${id}, side: ${side}`); // ✅ AJOUTÉ: Log pour debug

      // Vérification d'auth
      const authHeader = req.headers.authorization;
      let userIdFromAuth: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userIdFromAuth = authHeader.split(' ')[1];
      }

      if (!userIdFromAuth || id !== userIdFromAuth) {
        return res.status(403).json({ error: "Non autorisé à supprimer la CIN de cet utilisateur" });
      }

      if (!side || (side !== 'front' && side !== 'back')) {
        return res.status(400).json({ error: "Le paramètre 'side' ('front' ou 'back') est requis" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      console.log(`Current user CIN state: front=${user.cinUploadedFront}, back=${user.cinUploadedBack}`); // ✅ AJOUTÉ: Log état actuel

      const currentFront = user.cinUploadedFront || false;
      const currentBack = user.cinUploadedBack || false;

      const updates: any = {
        cinUploadedFront: side === 'front' ? false : currentFront,
        cinUploadFrontUrl: side === 'front' ? null : user.cinUploadFrontUrl,
        cinUploadedBack: side === 'back' ? false : currentBack,
        cinUploadBackUrl: side === 'back' ? null : user.cinUploadBackUrl,
        hasCIN: side === 'front' ? currentBack : currentFront
      };

      // Suppression du fichier seulement pour le side concerné
      const uploadDir = 'uploads/cin';
      if (side === 'front' && user.cinUploadFrontUrl) {
        const frontPath = path.join(uploadDir, path.basename(user.cinUploadFrontUrl));
        if (fs.existsSync(frontPath)) {
          fs.unlinkSync(frontPath);
          console.log(`CIN front deleted for user ${id}`);
        }
      } else if (side === 'back' && user.cinUploadBackUrl) {
        const backPath = path.join(uploadDir, path.basename(user.cinUploadBackUrl));
        if (fs.existsSync(backPath)) {
          fs.unlinkSync(backPath);
          console.log(`CIN back deleted for user ${id}`);
        }
      }

      console.log(`Updates to apply:`, updates); // ✅ AJOUTÉ: Log updates

      const updatedUser = await storage.updateUser(id, updates);

      if (!updatedUser) {
        return res.status(500).json({ error: "Échec de la mise à jour" });
      }

      console.log(`Updated user CIN state: front=${updatedUser.cinUploadedFront}, back=${updatedUser.cinUploadedBack}`); // ✅ AJOUTÉ: Log état après update

      const userResponse = buildUserFullResponse(updatedUser);

      const sideLabel = side === 'front' ? 'recto' : 'verso';
      res.json({
        success: true,
        user: userResponse,
        message: `${sideLabel} de la CIN supprimé avec succès`
      });
    } catch (error: any) {
      console.error("Error deleting CIN:", error);
      res.status(500).json({
        error: "Échec de la suppression de la CIN",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Stats routes
  app.get("/api/stats/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  app.get("/api/stats/system", async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ error: "Failed to fetch system stats" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const users = await storage.getAllUsers();

      const usersResponse = users.map(user => buildAdminUserResponse(user));

      res.json(usersResponse);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const { id } = req.params;
      const updates = req.body;

      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const oldFirstName = oldUser.firstName;

      const user = await storage.updateUserAdmin(id, updates);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (updates.firstName && updates.firstName !== oldFirstName) {
        await renameCINFiles(id, oldFirstName, updates.firstName as string);
      }

      const userResponse = buildAdminUserResponse(user);

      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user as admin:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin CIN verification route
  app.put("/api/admin/users/:id/verify-cin", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const { id } = req.params;
      const { verified, verifierId } = req.body;

      if (verifierId === undefined) {
        return res.status(400).json({ error: "verifierId est requis" });
      }

      const updates: any = {
        cinVerified: !!verified
      };

      if (verified) {
        updates.cinVerifiedAt = new Date().toISOString();
        updates.cinVerifiedBy = verifierId;
      } else {
        updates.cinVerifiedAt = null;
        updates.cinVerifiedBy = null;
      }

      const user = await storage.updateUser(id, updates);

      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const userResponse = buildAdminUserResponse(user);

      res.json({
        success: true,
        user: userResponse,
        message: verified ? "CIN vérifiée avec succès" : "Vérification de la CIN annulée"
      });
    } catch (error: any) {
      console.error("Error verifying CIN:", error);
      res.status(500).json({
        error: "Échec de la vérification de la CIN",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ✅ AJOUTÉ: CRUD Routes pour les vérifications CIN (Admin only)

  // GET /api/admin/cin-verifications - Lister toutes les vérifications CIN
  app.get("/api/admin/cin-verifications", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const status = req.query.status as string;
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;

      // Assumer que storage.getAllCinVerifications existe avec options { status?, userId?, limit? }
      const verifications = await storage.getAllCinVerifications({ status, userId, limit });

      // Enrichir avec détails utilisateur si possible
      const verificationsWithUser = await Promise.all(
        verifications.map(async (verif: any) => {
          try {
            const user = await storage.getUser(verif.userId);
            return {
              ...verif,
              user: user ? buildUserResponse(user) : null
            };
          } catch (error) {
            console.error(`Error fetching user for CIN verif ${verif.id}:`, error);
            return { ...verif, user: null };
          }
        })
      );

      res.json(verificationsWithUser);
    } catch (error) {
      console.error("Error fetching CIN verifications:", error);
      res.status(500).json({ error: "Failed to fetch CIN verifications" });
    }
  });

  // GET /api/admin/cin-verifications/:id - Récupérer une vérification CIN spécifique
  app.get("/api/admin/cin-verifications/:id", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const { id } = req.params;
      const verif = await storage.getCinVerification(id);

      if (!verif) {
        return res.status(404).json({ error: "Vérification CIN non trouvée" });
      }

      // Enrichir avec détails utilisateur
      const user = await storage.getUser(verif.userId);
      const verifWithUser = {
        ...verif,
        user: user ? buildUserResponse(user) : null
      };

      res.json(verifWithUser);
    } catch (error) {
      console.error("Error fetching single CIN verification:", error);
      res.status(500).json({ error: "Failed to fetch CIN verification" });
    }
  });

  // POST /api/admin/cin-verifications - Créer une nouvelle vérification CIN
  app.post("/api/admin/cin-verifications", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const data = insertCinVerificationSchema.parse(req.body);

      // Vérifier si une vérification existe déjà pour cet utilisateur
      const existing = await storage.getCinVerificationByUserId(data.userId);
      if (existing) {
        return res.status(409).json({ error: "Une vérification CIN existe déjà pour cet utilisateur" });
      }

      const verif = await storage.createCinVerification(data);

      // Enrichir avec détails utilisateur
      const user = await storage.getUser(data.userId);
      const verifWithUser = {
        ...verif,
        user: user ? buildUserResponse(user) : null
      };

      // Optionnel: Mettre à jour le status utilisateur si verified
      if (verif.status === 'verified') {
        await storage.updateUser(data.userId, { cinVerified: true, cinVerifiedAt: new Date().toISOString(), cinVerifiedBy: data.adminId });
      }

      res.status(201).json(verifWithUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error creating CIN verification:", error);
      res.status(500).json({ error: "Failed to create CIN verification" });
    }
  });

  // PUT /api/admin/cin-verifications/:id - Mettre à jour une vérification CIN
  app.put("/api/admin/cin-verifications/:id", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const { id } = req.params;
      const updates = updateCinVerificationSchema.parse(req.body);

      // Vérifier existence
      const existing = await storage.getCinVerification(id);
      if (!existing) {
        return res.status(404).json({ error: "Vérification CIN non trouvée" });
      }

      const verif = await storage.updateCinVerification(id, updates);

      if (!verif) {
        return res.status(500).json({ error: "Échec de la mise à jour" });
      }

      // Enrichir avec détails utilisateur
      const user = await storage.getUser(verif.userId);
      const verifWithUser = {
        ...verif,
        user: user ? buildUserResponse(user) : null
      };

      // Optionnel: Sync avec users si status change à verified/rejected
      if (updates.status === 'verified') {
        await storage.updateUser(verif.userId, { cinVerified: true, cinVerifiedAt: new Date().toISOString(), cinVerifiedBy: authCheck.userId });
      } else if (updates.status === 'rejected') {
        await storage.updateUser(verif.userId, { cinVerified: false, cinVerifiedAt: null, cinVerifiedBy: null });
      }

      res.json(verifWithUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error updating CIN verification:", error);
      res.status(500).json({ error: "Failed to update CIN verification" });
    }
  });

  // DELETE /api/admin/cin-verifications/:id - Supprimer une vérification CIN
  app.delete("/api/admin/cin-verifications/:id", async (req, res) => {
    try {
      const authCheck = await isAdmin(req.headers.authorization);
      if (!authCheck.isAdmin) {
        return res.status(403).json({ error: "Accès admin requis" });
      }

      const { id } = req.params;
      const success = await storage.deleteCinVerification(id);

      if (!success) {
        return res.status(404).json({ error: "Vérification CIN non trouvée" });
      }

      // Optionnel: Reset CIN status utilisateur
      const verif = await storage.getCinVerification(id); // Fetch avant delete si besoin, mais assumons storage.delete retourne le deleted item ou true
      if (verif) {
        await storage.updateUser(verif.userId, { cinVerified: false, cinVerifiedAt: null, cinVerifiedBy: null });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting CIN verification:", error);
      res.status(500).json({ error: "Failed to delete CIN verification" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}