/**
 * 🐝 BEEChat Backend
 * Safe messaging for kids with parental monitoring
 * PostgreSQL + Supabase
 */

import "./loadEnv.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { 
  checkMessage
} from "./src/safety";
import {
  checkGeofences,
  addGeofenceZone,
  removeGeofenceZone,
  getGeofenceAlerts,
  geofenceZones,
  initializeDefaultZones
} from "./src/geofence";
import {
  initDatabase,
  createUser,
  getUserById,
  getChildrenByParent,
  storeMessage,
  getMessagesForParent,
  storeLocation,
  getLatestLocation,
  getLocationHistory,
  logSafetyEvent,
  getSafetyLogs,
  addContact,
  approveContact,
  getApprovedContacts,
  isContactApproved,
  checkDatabaseHealth,
  updateUserStatus,
  User
} from "./src/db";

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

// In-memory caches for socket mapping (not persistent data)
const socketToUser = new Map<string, string>(); // socketId -> userId
const onlineUsers = new Map<string, boolean>();

// BEE safety mascot responses
const BEE_SAFE_RESPONSES = [
  "Hey there! 🐝 Stay positive, friend!",
  "Oops! We use kind words here 😊",
  "BEE is watching out for your safety!",
  "It's a great day to chat! 🍯",
  "Your parents can see your messages, be nice!",
  "Let's keep it cool and respectful! 🐝",
];

io.on("connection", (socket) => {
  console.log("👋 New connection:", socket.id);

  // Parent registration
  socket.on("parent:register", async (data) => {
    const userId = uuidv4();
    
    const user = await createUser({
      id: userId,
      socket_id: socket.id,
      username: data.username,
      email: data.email,
      type: 'parent'
    });

    if (!user) {
      socket.emit("error", { message: "Failed to create account" });
      return;
    }

    socketToUser.set(socket.id, userId);
    onlineUsers.set(userId, true);
    
    socket.emit("parent:registered", { 
      id: userId, 
      username: data.username 
    });
    
    console.log(`👨‍👩‍👧 Parent registered: ${data.username} (${userId})`);
  });

  // Child registration
  socket.on("child:register", async (data) => {
    // Verify parent exists
    const parent = await getUserById(data.parentId);
    if (!parent || parent.type !== 'parent') {
      socket.emit("error", { message: "Parent not found" });
      return;
    }

    const userId = uuidv4();
    
    const user = await createUser({
      id: userId,
      socket_id: socket.id,
      username: data.username,
      type: 'child',
      parent_id: data.parentId,
      age: data.age
    });

    if (!user) {
      socket.emit("error", { message: "Failed to create account" });
      return;
    }

    socketToUser.set(socket.id, userId);
    onlineUsers.set(userId, true);
    
    socket.emit("child:registered", { 
      id: userId, 
      username: data.username,
      message: "Welcome to BEEChat! BEE is watching over you 🐝"
    });
    
    console.log(`👶 Child registered: ${data.username} (parent: ${parent.username})`);
  });

  // Send message with safety check
  socket.on("message:send", async (data) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const sender = await getUserById(userId);
    if (!sender || sender.type !== 'child') {
      socket.emit("error", { message: "Only children can send messages" });
      return;
    }

    // Check if recipient is approved
    const isApproved = await isContactApproved(userId, data.recipientId);
    if (!isApproved) {
      socket.emit("error", { message: "Contact not approved by parent" });
      return;
    }

    // Check content
    const safetyCheck = checkMessage(data.content);
    
    // If blocked (severe content)
    if (safetyCheck.action === 'block') {
      socket.emit("message:blocked", {
        reason: "Inappropriate content detected",
        flags: safetyCheck.flags,
        beeMessage: "Oops! This message isn't appropriate. Your parents have been notified."
      });
      
      // Log for parent
      await logSafetyEvent({
        child_id: userId,
        content: data.content,
        flags: safetyCheck.flags,
        severity: safetyCheck.severity,
        chat_with: data.recipientId
      });
      
      return;
    }

    // Store message
    const message = await storeMessage({
      sender_id: userId,
      recipient_id: data.recipientId,
      content: data.content,
      type: data.type || 'text',
      safety_flags: safetyCheck.flags
    });

    if (message) {
      // Send to recipient if online
      io.to(data.recipientId).emit("message:received", {
        ...message,
        senderName: sender.username
      });
      
      socket.emit("message:sent", message);
    }

    // If warning (mild content)
    if (safetyCheck.action === 'warn') {
      socket.emit("message:warning", {
        message: "⚠️ Watch your language",
        beeMessage: BEE_SAFE_RESPONSES[Math.floor(Math.random() * BEE_SAFE_RESPONSES.length)]
      });
    }

    // Log if flags detected
    if (!safetyCheck.clean) {
      await logSafetyEvent({
        child_id: userId,
        content: data.content,
        flags: safetyCheck.flags,
        severity: safetyCheck.severity,
        chat_with: data.recipientId
      });
    }
  });

  // Update GPS location
  socket.on("location:update", async (data) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = await getUserById(userId);
    if (!user || user.type !== 'child') return;

    // Store location
    await storeLocation({
      user_id: userId,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy
    });

    // Check geofences
    const alerts = checkGeofences(userId, { lat: data.lat, lng: data.lng });
    
    // Send alerts to parent if any
    if (alerts.length > 0 && user.parent_id) {
      alerts.forEach(alert => {
        io.to(user.parent_id).emit("parent:geofenceAlert", alert);
      });
    }

    console.log(`📍 ${user.username} location: ${data.lat}, ${data.lng}`);
  });

  // Parent requests location
  socket.on("parent:getLocation", async (childId) => {
    const parentId = socketToUser.get(socket.id);
    if (!parentId) return;

    const child = await getUserById(childId);
    if (!child || child.parent_id !== parentId) {
      socket.emit("error", { message: "Access denied" });
      return;
    }

    const current = await getLatestLocation(childId);
    const history = await getLocationHistory(childId, 24);
    
    socket.emit("parent:locationData", {
      childId,
      current,
      history
    });
  });

  // Parent requests safety logs
  socket.on("parent:getSafetyLogs", async (childId) => {
    const parentId = socketToUser.get(socket.id);
    if (!parentId) return;

    const child = await getUserById(childId);
    if (!child || child.parent_id !== parentId) {
      socket.emit("error", { message: "Access denied" });
      return;
    }

    const logs = await getSafetyLogs(childId);
    
    socket.emit("parent:safetyLogs", {
      childId,
      logs
    });
  });

  // Add contact request
  socket.on("child:addContact", async (data) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = await getUserById(userId);
    if (!user || user.type !== 'child') return;

    const contact = await addContact({
      child_id: userId,
      contact_name: data.contactName,
      approved: false,
      approved_by: ''
    });

    if (contact) {
      // Notify parent
      io.to(user.parent_id!).emit("parent:contactRequest", {
        childId: userId,
        childName: user.username,
        contactName: data.contactName,
        contactId: contact.id
      });

      socket.emit("contact:requestSent", { 
        message: "Parent approval requested" 
      });
    }
  });

  // Parent approves contact
  socket.on("parent:approveContact", async (data) => {
    const parentId = socketToUser.get(socket.id);
    if (!parentId) return;

    const success = await approveContact(data.contactId, parentId);
    if (success) {
      socket.emit("contact:approved", { contactId: data.contactId });
    }
  });

  // Typing indicators
  socket.on("typing:start", (recipientId) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;
    
    socket.to(recipientId).emit("typing:start", {
      userId,
      username: socket.id
    });
  });

  socket.on("typing:stop", (recipientId) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;
    
    socket.to(recipientId).emit("typing:stop", { userId });
  });

  // Disconnect
  socket.on("disconnect", async () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      onlineUsers.delete(userId);
      socketToUser.delete(socket.id);
      
      // Update status in DB
      await updateUserStatus(userId, 'offline');
      
      console.log(`👋 User disconnected: ${userId}`);
    }
  });
});

// API Endpoints
app.get("/api/health", async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.json({ 
    status: "ok", 
    database: dbHealthy ? "connected" : "disconnected",
    onlineUsers: onlineUsers.size
  });
});

// Get all children for a parent
app.get("/api/parent/:parentId/children", async (req, res) => {
  const children = await getChildrenByParent(req.params.parentId);
  
  // Add location to each child
  const childrenWithLocation = await Promise.all(
    children.map(async (child) => {
      const location = await getLatestLocation(child.id);
      return {
        ...child,
        location
      };
    })
  );
  
  res.json(childrenWithLocation);
});

// Get child's messages (parent viewing)
app.get("/api/parent/:parentId/child/:childId/messages", async (req, res) => {
  const { parentId, childId } = req.params;
  const { limit } = req.query;
  
  // Verify parent has access
  const child = await getUserById(childId);
  if (!child || child.parent_id !== parentId) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const messages = await getMessagesForParent(
    childId, 
    limit ? parseInt(limit as string) : 50
  );
  
  res.json({
    childId,
    messageCount: messages.length,
    messages
  });
});

// Get conversation summary
app.get("/api/parent/:parentId/child/:childId/contacts", async (req, res) => {
  const { parentId, childId } = req.params;
  
  // Verify parent has access
  const child = await getUserById(childId);
  if (!child || child.parent_id !== parentId) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const contacts = await getApprovedContacts(childId);
  res.json({ childId, contacts });
});

// Add geofence zone
app.post("/api/parent/:parentId/child/:childId/geofences", async (req, res) => {
  const { parentId, childId } = req.params;
  const { name, lat, lng, radius, type } = req.body;
  
  // Verify parent has access
  const child = await getUserById(childId);
  if (!child || child.parent_id !== parentId) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const zone = addGeofenceZone(childId, { name, lat, lng, radius, type });
  res.json({ success: true, zone });
});

// Get geofence alerts
app.get("/api/parent/:parentId/child/:childId/geofence-alerts", async (req, res) => {
  const { parentId, childId } = req.params;
  
  // Verify parent has access
  const child = await getUserById(childId);
  if (!child || child.parent_id !== parentId) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const alerts = getGeofenceAlerts(childId);
  res.json({ childId, alerts });
});

// Initialize database on startup
initDatabase();

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🐝 BEEChat server running on port ${PORT}`);
  console.log(`🔒 Safe messaging for kids with parental controls`);
  console.log(`💾 Powered by Neon Serverless PostgreSQL`);
});
