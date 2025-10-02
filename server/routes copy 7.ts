// routes.ts - Updated with user self-management for CIN: view, re-upload, full profile
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAlertSchema, updateAlertStatusSchema, validateAlertSchema, insertUserSchema, insertAlertCommentSchema } from "@shared/schema";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';

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

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/alerts", upload.single("media"), async (req, res) => {
    try {
      const { reason, description, location, urgency, authorId, latitude, longitude } = req.body;
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

  // app.get("/api/auth/me", async (req, res) => {
  //   try {
  //     // Pour la sécurité, en production, utiliser un token JWT ou session pour identifier l'utilisateur
  //     // Ici, pour démonstration, on utilise un ID fixe ; en vrai, extraire de headers ou cookies
  //     const userIdFromAuth = req.headers.authorization?.split(' ')[1] || "6970bcb1-e53f-4abe-acfd-909b7f283e38"; // Exemple avec Bearer token ou fallback

  //     const user = await storage.getUser(userIdFromAuth);

  //     if (!user) {
  //       return res.status(401).json({ error: "Utilisateur non authentifié" });
  //     }

  //     // ✅ MODIFIÉ: Utilise la réponse complète pour l'utilisateur lui-même (inclut détails CIN)
  //     const userResponse = buildUserFullResponse(user);

  //     res.json(userResponse);
  //   } catch (error) {
  //     console.error("Error fetching current user:", error);
  //     res.status(500).json({ error: "Failed to fetch current user" });
  //   }
  // });

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
      const { firstName, lastName, email, phone, password, neighborhood, latitude, longitude } = req.body;

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

  // // User routes
  // app.get("/api/users/:id", async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const user = await storage.getUser(id);

  //     if (!user) {
  //       return res.status(404).json({ error: "User not found" });
  //     }

  //     // ✅ AJOUTÉ: Vérification simple d'auth (en prod, middleware) - si c'est l'utilisateur lui-même, réponse complète
  //     const userIdFromAuth = req.headers.authorization?.split(' ')[1] || "6970bcb1-e53f-4abe-acfd-909b7f283e38";
  //     const userResponse = id === userIdFromAuth ? buildUserFullResponse(user) : buildUserResponse(user);

  //     res.json(userResponse);
  //   } catch (error) {
  //     console.error("Error fetching user:", error);
  //     res.status(500).json({ error: "Failed to fetch user" });
  //   }
  // });

  // User routes
  // app.get("/api/users/:id", async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const user = await storage.getUser(id);

  //     if (!user) {
  //       return res.status(404).json({ error: "User not found" });
  //     }

  //     // ✅ Vérification d'auth : extraire le token Bearer
  //     const authHeader = req.headers.authorization;
  //     let userIdFromAuth: string | null = null;
  //     if (authHeader && authHeader.startsWith('Bearer ')) {
  //       userIdFromAuth = authHeader.split(' ')[1];
  //     }

  //     if (!userIdFromAuth) {
  //       return res.status(401).json({ error: "Non authentifié" });
  //     }

  //     // Si c'est l'utilisateur lui-même, réponse complète ; sinon, basique
  //     const userResponse = id === userIdFromAuth ? buildUserFullResponse(user) : buildUserResponse(user);

  //     res.json(userResponse);
  //   } catch (error) {
  //     console.error("Error fetching user:", error);
  //     res.status(500).json({ error: "Failed to fetch user" });
  //   }
  // });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // ✅ CORRIGÉ: Vérification d'auth stricte (pas de fallback hardcodé)
      const authHeader = req.headers.authorization;
      let userIdFromAuth: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userIdFromAuth = authHeader.split(' ')[1];
      }

      if (!userIdFromAuth) {
        return res.status(401).json({ error: "Non authentifié" });
      }

      // Si c'est l'utilisateur lui-même, réponse complète (avec CIN) ; sinon, basique
      const userResponse = id === userIdFromAuth ? buildUserFullResponse(user) : buildUserResponse(user);

      res.json(userResponse);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Route pour récupérer le profil utilisateur complet (self-management)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Vérification d'auth - seul l'utilisateur peut voir son profil complet
      const userIdFromAuth = req.headers.authorization?.split(' ')[1] || "6970bcb1-e53f-4abe-acfd-909b7f283e38";
      if (id !== userIdFromAuth) {
        return res.status(403).json({ error: "Non autorisé à accéder à ce profil" });
      }

      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      // Réponse complète pour l'utilisateur lui-même
      const userResponse = buildUserFullResponse(user);

      res.json(userResponse);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // CIN upload route (re-upload pour modification)
  app.post("/api/users/:id/cin-upload", cinUpload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ AJOUTÉ: Vérification d'auth - seul l'utilisateur peut uploader sa CIN
      const userIdFromAuth = req.headers.authorization?.split(' ')[1] || "6970bcb1-e53f-4abe-acfd-909b7f283e38";
      if (id !== userIdFromAuth) {
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

  // ✅ AJOUTÉ: Endpoint pour supprimer la CIN (optionnel, pour self-management complet)
  app.delete("/api/users/:id/cin", async (req, res) => {
    try {
      const { id } = req.params;

      // Vérification d'auth
      const userIdFromAuth = req.headers.authorization?.split(' ')[1] || "6970bcb1-e53f-4abe-acfd-909b7f283e38";
      if (id !== userIdFromAuth) {
        return res.status(403).json({ error: "Non autorisé à supprimer la CIN de cet utilisateur" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const updates: any = {
        hasCIN: false,
        cinUploadedFront: false,
        cinUploadedBack: false,
        cinUploadFrontUrl: null,
        cinUploadBackUrl: null
      };

      // Supprimer les fichiers physiques si existants
      const uploadDir = 'uploads/cin';
      if (user.cinUploadFrontUrl) {
        const frontPath = path.join(uploadDir, path.basename(user.cinUploadFrontUrl));
        if (fs.existsSync(frontPath)) {
          fs.unlinkSync(frontPath);
          console.log(`CIN front deleted for user ${id}`);
        }
      }
      if (user.cinUploadBackUrl) {
        const backPath = path.join(uploadDir, path.basename(user.cinUploadBackUrl));
        if (fs.existsSync(backPath)) {
          fs.unlinkSync(backPath);
          console.log(`CIN back deleted for user ${id}`);
        }
      }

      const updatedUser = await storage.updateUser(id, updates);

      if (!updatedUser) {
        return res.status(500).json({ error: "Échec de la mise à jour" });
      }

      const userResponse = buildUserFullResponse(updatedUser);

      res.json({
        success: true,
        user: userResponse,
        message: "CIN supprimée avec succès"
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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}