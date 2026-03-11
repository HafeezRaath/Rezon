import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import admin from "firebase-admin";
import { createRequire } from "module";

// Routes imports
import route from "./Routes/userRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";

// Models imports
import Chat from "./model/chat.js";
import User from "./model/user.js";

// ==========================================
// 🔐 CONFIGURATIONS
// ==========================================
dotenv.config();
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 🔧 Railway proxy trust (IMPORTANT!)
app.set("trust proxy", 1);

const httpServer = createServer(app);

// ==========================================
// 🔐 Firebase Admin Setup
// ==========================================
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    console.log("✅ Firebase Admin SDK Initialized!");
  }
} catch (error) {
  console.error("❌ Firebase Initialization Error:", error.message);
}

// ==========================================
// 🌐 CORS SETUP - CLEAN & BULLETPROOF
// ==========================================
const allowedOrigins = [
  "https://rezon.raathdeveloper.com",
  "https://raathdeveloper.com",
  "https://rezon.up.railway.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ CORS Blocked:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
};

// ✅ Apply CORS before any other middleware
app.use(cors(corsOptions));

// ✅ Handle preflight for all routes
app.options("*", cors(corsOptions));

// ==========================================
// 🔌 Socket.IO SETUP
// ==========================================
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ==========================================
// 🧩 Middlewares
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 🛣️ Routes
// ==========================================
app.use("/api", route);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// CORS test endpoint
app.get("/cors-test", (req, res) => {
  res.json({ 
    message: "CORS Working!", 
    origin: req.headers.origin || "no-origin",
    allowedOrigins: allowedOrigins
  });
});

// ==========================================
// 🟢 Socket Logic
// ==========================================
let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("setup", (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
    socket.emit("connected");
    console.log("✅ User setup:", userId);
  });

  socket.on("user_online", async (userId) => {
    if (!userId) return;
    try {
      await User.findOneAndUpdate(
        { uid: userId }, 
        { isOnline: true, lastSeen: new Date() }
      );
      io.emit("status_change", { userId, isOnline: true });
    } catch (err) {
      console.error("❌ User online error:", err);
    }
  });

  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log("👥 User joined chat:", chatId);
  });

  socket.on("send_message", async (data) => {
    const { chatId, senderId, message } = data;
    try {
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $push: { 
            messages: { 
              senderId, 
              message, 
              timestamp: new Date(), 
              isRead: false 
            } 
          },
          $set: { 
            lastMessage: message, 
            lastMessageTime: new Date() 
          }
        }, 
        { new: true }
      );
      
      if (updatedChat) {
        io.to(chatId).emit("receive_message", data);
        console.log("📨 Message sent to chat:", chatId);
      }
    } catch (err) { 
      console.error("❌ Send message error:", err); 
    }
  });

  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.chatId).emit("stop_typing", data);
  });

  socket.on("disconnect", async () => {
    console.log("🔌 Socket disconnected:", socket.id);
    
    // Find and update user status
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
        try {
          await User.findOneAndUpdate(
            { uid: userId }, 
            { isOnline: false, lastSeen: new Date() }
          );
          io.emit("status_change", { userId, isOnline: false });
        } catch (err) {
          console.error("❌ Disconnect update error:", err);
        }
        break;
      }
    }
  });
});

// ==========================================
// 🗄️ Database & Startup
// ==========================================
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URI;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Connected");
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error("❌ DB Error:", err);
    process.exit(1);
  });