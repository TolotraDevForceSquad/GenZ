import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration de multer pour les uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = join(__dirname, 'uploads');
    
    // Créer le dossier uploads s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter images et vidéos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seules les images et vidéos sont autorisées.'));
    }
  }
});

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware pour servir les fichiers uploadés
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Route pour uploader les médias
app.post('/api/upload', upload.array('media', 5), (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const fileUrls = (req.files as Express.Multer.File[]).map(file => {
      return `/uploads/${file.filename}`;
    });

    res.json({ 
      success: true, 
      message: 'Fichiers uploadés avec succès',
      files: fileUrls 
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// Route pour créer une alerte avec médias
app.post('/api/alerts', upload.array('media', 5), async (req, res) => {
  try {
    const { reason, description, location, urgency, authorId } = req.body;
    
    // Récupérer les URLs des fichiers uploadés
    const mediaUrls = (req.files as Express.Multer.File[]).map(file => {
      return `/uploads/${file.filename}`;
    });

    // Créer l'alerte dans la base de données
    const newAlert = {
      id: 'alert_' + Date.now(),
      reason,
      description,
      location,
      urgency,
      media: mediaUrls,
      timestamp: new Date().toISOString(),
      status: 'pending',
      author: {
        id: authorId || 'usr_anonymous',
        name: 'Utilisateur Anonyme',
        avatar: '',
        hasCIN: false
      },
      validations: {
        confirmed: 0,
        rejected: 0
      },
      views: 0,
      validatedBy: []
    };

    // Sauvegarder l'alerte (remplacer par votre logique de base de données)
    // await saveAlert(newAlert);

    // Diffuser l'alerte via WebSocket
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'NEW_ALERT',
          alert: newAlert
        }));
      }
    });

    res.status(201).json(newAlert);
  } catch (error) {
    console.error('Erreur création alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'alerte' });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Dossier uploads: ${join(__dirname, 'uploads')}`);
});