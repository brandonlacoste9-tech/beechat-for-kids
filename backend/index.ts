/**
 * 🐝 BEEChat Backend
 * Messagerie sécurisée pour ados du Québec
 * Parent-approved messaging with safety monitoring
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { config } from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { 
  checkMessage, 
  logSafetyEvent, 
  updateLocation, 
  getChildLocation,
  getLocationHistory,
  safetyLogs,
  locationHistory
} from "./src/safety";
import {
  storeMessageForParent,
  getChildMessages,
  getConversationSummary,
  initializeParentSettings,
  parentSettings
} from "./src/parental-monitoring";
import {
  checkGeofences,
  addGeofenceZone,
  removeGeofenceZone,
  getGeofenceAlerts,
  geofenceZones,
  initializeDefaultZones
} from "./src/geofence";

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Stockage en mémoire
const users = new Map();
const messages = new Map();
const parentAccounts = new Map();
const childAccounts = new Map();

// Réponses de TI-GUY (safety mascot)
const TI_GUY_SAFE_RESPONSES = [
  "Salut! 🦫 Reste positif mon ami!",
  "Oups! On utilise des mots gentils ici 😊",
  "TI-GUY surveille pour ta sécurité!",
  "C'est un beau jour pour chatter! 🍁",
  "Tes parents peuvent voir tes messages, sois gentil!",
  "On reste cool et respectueux! ⚜️",
];

io.on("connection", (socket) => {
  console.log("👋 Nouvelle connexion:", socket.id);

  // Enregistrement parent
  socket.on("parent:register", (data) => {
    const parent = {
      id: socket.id,
      type: 'parent',
      username: data.username,
      email: data.email,
      children: [],
    };
    parentAccounts.set(socket.id, parent);
    users.set(socket.id, parent);
    
    // Initialize parent settings with message viewing enabled
    initializeParentSettings(socket.id);
    console.log(`👨‍👩‍👧 Parent registered: ${data.username} (message viewing: ON, location: ON)`);
  });

  // Enregistrement enfant
  socket.on("child:register", (data) => {
    // Vérifier que le parent existe
    const parent = parentAccounts.get(data.parentId);
    if (!parent) {
      socket.emit("error", { message: "Parent non trouvé" });
      return;
    }

    const child = {
      id: socket.id,
      type: 'child',
      username: data.username,
      parentId: data.parentId,
      age: data.age,
      approvedContacts: [],
      restrictions: {
        timeLimit: data.restrictions?.timeLimit || 120, // minutes per day
        allowedHours: data.restrictions?.allowedHours || { start: 7, end: 21 },
        contentFilter: true,
      }
    };
    
    childAccounts.set(socket.id, child);
    users.set(socket.id, child);
    parent.children.push(socket.id);
    
    socket.emit("child:registered", { 
      id: socket.id, 
      username: child.username,
      message: "Bienvenue sur OuiChat! TI-GUY veille sur toi 🦫"
    });
    
    console.log(`👶 Enfant enregistré: ${data.username} (parent: ${parent.username})`);
  });

  // Envoyer message avec vérification sécurité
  socket.on("message:send", (data) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    // Vérifier contenu
    const safetyCheck = checkMessage(data.content);
    
    // Si bloqué (contenu grave)
    if (safetyCheck.action === 'block') {
      socket.emit("message:blocked", {
        reason: "Contenu inapproprié détecté",
        flags: safetyCheck.flags,
        tiGuyMessage: "Oups! Ce message n'est pas approprié. Tes parents ont été informés."
      });
      
      // Log pour parent
      if (sender.type === 'child') {
        logSafetyEvent({
          id: uuidv4(),
          childId: socket.id,
          childUsername: sender.username,
          content: data.content,
          flags: safetyCheck.flags,
          severity: safetyCheck.severity,
          timestamp: new Date(),
          chatWith: data.recipientId,
        });
      }
      return;
    }

    // Si avertissement (contenu léger)
    if (safetyCheck.action === 'warn') {
      socket.emit("message:warning", {
        message: "⚠️ Attention à ton langage",
        tiGuyMessage: TI_GUY_SAFE_RESPONSES[Math.floor(Math.random() * TI_GUY_SAFE_RESPONSES.length)]
      });
    }

    const message = {
      id: uuidv4(),
      content: data.content,
      senderId: socket.id,
      sender: sender,
      recipientId: data.recipientId,
      timestamp: new Date(),
      type: data.type || "text",
      safetyChecked: true,
    };

    // Sauvegarder et envoyer
    messages.set(message.id, message);
    io.to(data.recipientId).emit("message:received", message);
    socket.emit("message:sent", message);

    // Store for parent review
    storeMessageForParent({
      id: message.id,
      childId: socket.id,
      content: data.content,
      sender: sender.username,
      recipient: data.recipientId,
      timestamp: new Date(),
      type: 'sent',
      safetyFlags: safetyCheck.flags
    });

    // Log si flags détectés
    if (!safetyCheck.clean && sender.type === 'child') {
      logSafetyEvent({
        id: uuidv4(),
        childId: socket.id,
        childUsername: sender.username,
        content: data.content,
        flags: safetyCheck.flags,
        severity: safetyCheck.severity,
        timestamp: new Date(),
        chatWith: data.recipientId,
      });
    }
  });

  // Mise à jour position GPS
  socket.on("location:update", (data) => {
    const user = users.get(socket.id);
    if (!user || user.type !== 'child') return;

    const locationUpdate = {
      userId: socket.id,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date(),
      accuracy: data.accuracy,
    };

    updateLocation(locationUpdate);

    // Check geofences
    const geofenceAlerts = checkGeofences(socket.id, { lat: data.lat, lng: data.lng });
    
    // Send alerts to parent if any
    if (geofenceAlerts.length > 0 && user.parentId) {
      const parentSocket = parentAccounts.get(user.parentId);
      if (parentSocket) {
        geofenceAlerts.forEach(alert => {
          io.to(user.parentId).emit("parent:geofenceAlert", alert);
        });
      }
    }

    console.log(`📍 ${user.username} location: ${data.lat}, ${data.lng}`);
  });

  // Parent demande position enfant
  socket.on("parent:getLocation", (childId) => {
    const parent = parentAccounts.get(socket.id);
    if (!parent || !parent.children.includes(childId)) {
      socket.emit("error", { message: "Accès refusé" });
      return;
    }

    const location = getChildLocation(socket.id, childId);
    const history = getLocationHistory(childId, 24);
    
    socket.emit("parent:locationData", {
      childId,
      current: location,
      history: history.slice(-20), // Last 20 points
    });
  });

  // Parent demande logs sécurité
  socket.on("parent:getSafetyLogs", (childId) => {
    const parent = parentAccounts.get(socket.id);
    if (!parent || !parent.children.includes(childId)) {
      socket.emit("error", { message: "Accès refusé" });
      return;
    }

    const logs = safetyLogs.get(socket.id) || [];
    const childLogs = logs.filter(l => l.childId === childId);
    
    socket.emit("parent:safetyLogs", {
      childId,
      logs: childLogs.slice(-50), // Last 50 events
    });
  });

  // Indicateur de frappe
  socket.on("typing:start", (recipientId) => {
    socket.to(recipientId).emit("typing:start", {
      userId: socket.id,
      username: users.get(socket.id)?.username,
    });
  });

  socket.on("typing:stop", (recipientId) => {
    socket.to(recipientId).emit("typing:stop", { userId: socket.id });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      user.status = "offline";
      console.log(`👋 ${user.username} déconnecté`);
    }
  });
});

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    utilisateurs: users.size,
    enfants: childAccounts.size,
    parents: parentAccounts.size,
    messages: messages.size 
  });
});

// Get all children for a parent
app.get("/api/parent/:parentId/children", (req, res) => {
  const parent = parentAccounts.get(req.params.parentId);
  if (!parent) {
    return res.status(404).json({ error: "Parent non trouvé" });
  }
  
  const children = parent.children.map((id: string) => ({
    id,
    ...childAccounts.get(id),
    location: getChildLocation(parent.id, id),
  }));
  
  res.json(children);
});

// Get child's messages (parent viewing)
app.get("/api/parent/:parentId/child/:childId/messages", (req, res) => {
  const { parentId, childId } = req.params;
  const { limit, search } = req.query;
  
  const messages = getChildMessages(parentId, childId, {
    limit: limit ? parseInt(limit as string) : 50,
    searchQuery: search as string
  });
  
  if (messages === null) {
    return res.status(403).json({ error: "Access denied or viewing disabled" });
  }
  
  res.json({
    childId,
    messageCount: messages.length,
    messages
  });
});

// Get conversation summary (who child talks to most)
app.get("/api/parent/:parentId/child/:childId/contacts", (req, res) => {
  const { parentId, childId } = req.params;
  
  const summary = getConversationSummary(parentId, childId);
  if (summary === null) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  res.json({
    childId,
    contacts: summary
  });
});

// Get parent settings
app.get("/api/parent/:parentId/settings", (req, res) => {
  const settings = parentSettings.get(req.params.parentId);
  if (!settings) {
    return res.status(404).json({ error: "Settings not found" });
  }
  
  res.json(settings);
});

// Update parent settings (toggle message viewing)
app.put("/api/parent/:parentId/settings", (req, res) => {
  const { viewMessages, viewMetadataOnly, realTimeAlerts, locationTracking } = req.body;
  
  const current = parentSettings.get(req.params.parentId);
  if (!current) {
    return res.status(404).json({ error: "Settings not found" });
  }
  
  parentSettings.set(req.params.parentId, {
    ...current,
    viewMessages: viewMessages ?? current.viewMessages,
    viewMetadataOnly: viewMetadataOnly ?? current.viewMetadataOnly,
    realTimeAlerts: realTimeAlerts ?? current.realTimeAlerts,
    locationTracking: locationTracking ?? current.locationTracking
  });
  
  res.json({ success: true, settings: parentSettings.get(req.params.parentId) });
});

// Get geofence zones for a child
app.get("/api/parent/:parentId/child/:childId/geofences", (req, res) => {
  const { parentId, childId } = req.params;
  
  // Verify parent has access
  const parent = parentAccounts.get(parentId);
  if (!parent || !parent.children.includes(childId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const zones = geofenceZones.get(childId) || [];
  res.json({ childId, zones });
});

// Add geofence zone
app.post("/api/parent/:parentId/child/:childId/geofences", (req, res) => {
  const { parentId, childId } = req.params;
  const { name, lat, lng, radius, type } = req.body;
  
  // Verify parent has access
  const parent = parentAccounts.get(parentId);
  if (!parent || !parent.children.includes(childId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const zone = addGeofenceZone(childId, { name, lat, lng, radius, type });
  res.json({ success: true, zone });
});

// Remove geofence zone
app.delete("/api/parent/:parentId/child/:childId/geofences/:zoneId", (req, res) => {
  const { parentId, childId, zoneId } = req.params;
  
  // Verify parent has access
  const parent = parentAccounts.get(parentId);
  if (!parent || !parent.children.includes(childId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const success = removeGeofenceZone(childId, zoneId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Zone not found" });
  }
});

// Get geofence alerts
app.get("/api/parent/:parentId/child/:childId/geofence-alerts", (req, res) => {
  const { parentId, childId } = req.params;
  
  // Verify parent has access
  const parent = parentAccounts.get(parentId);
  if (!parent || !parent.children.includes(childId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const alerts = getGeofenceAlerts(childId);
  res.json({ childId, alerts });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🦫 Serveur OuiChat démarré sur le port ${PORT}`);
  console.log(`🔒 Mode sécurisé: parent-approved messaging pour ados activé`);
});
