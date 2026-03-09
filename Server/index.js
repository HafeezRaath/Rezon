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

// ==========================================
// 🔐 Firebase Admin Setup
// ==========================================
try {
  // Check if env variable exists
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
// 🚀 App & Server Setup
// ==========================================
const app = express();
const httpServer = createServer(app);

// ==========================================
// 🌐 CORS & Socket Setup
// ==========================================
const allowedOrigins = [
  "https://rezon.raathdeveloper.com",
  "https://raathdeveloper.com",
  "https://rezon-production.up.railway.app", // Railway default domain bhi add rakhen
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS Policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// SOCKET.IO WITH PRODUCTION OPTIMIZATIONS
const io = new Server(httpServer, {
  path: "/socket.io/", 
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Websocket priority
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

// ==========================================
// 🧩 Middlewares
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static uploads (Purani local images ke liye, naye Cloudinary links pe iski zaroorat nahi)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 🛣️ Routes
// ==========================================
app.use("/api", route);
app.use("/api/admin", adminRoutes);

// Health Check for Railway/Uptime Monitoring
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    socket: "running", 
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date() 
  });
});

// ==========================================
// 🟢 Online Users Tracker
// ==========================================
let onlineUsers = new Map(); 

// ==========================================
// 🔌 Socket Events
// ==========================================
io.on("connection", (socket) => {
  console.log(`✅ Socket Connected: ${socket.id}`);

  socket.on("setup", (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
    socket.emit("connected");
  });

  socket.on("user_online", async (userId) => {
    if (!userId) return;
    try {
      onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
      await User.findOneAndUpdate(
        { uid: userId }, 
        { isOnline: true, lastSeen: new Date() }
      );
      io.emit("status_change", { userId, isOnline: true });
    } catch (error) {
      console.error("User online error:", error);
    }
  });

  socket.on("join_chat", (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.chatId).emit("stop_typing", data);
  });

  socket.on("send_message", async (data) => {
    const { chatId, senderId, message, tempId } = data;
    try {
      const newMessage = {
        senderId,
        message,
        timestamp: new Date(),
        isRead: false,
        tempId: tempId || Date.now().toString()
      };

      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $push: { messages: newMessage },
          $set: { lastMessage: message, lastMessageTime: new Date(), deletedBy: [] }
        },
        { new: true }
      );

      if (updatedChat) {
        const savedMsg = updatedChat.messages[updatedChat.messages.length - 1];
        
        // Emit message to the chat room
        io.to(chatId).emit("receive_message", {
          ...data,
          _id: savedMsg._id,
          timestamp: newMessage.timestamp
        });

        // Notify other participants
        updatedChat.participants.forEach(participantUid => {
          if (participantUid !== senderId) {
            io.to(participantUid).emit("new_message_notification", {
              chatId,
              senderId,
              message: message.substring(0, 50),
              timestamp: new Date()
            });
          }
        });
      }
    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("message_error", { chatId, error: error.message });
    }
  });

  socket.on("message_seen", async ({ chatId, userId }) => {
    try {
      await Chat.updateOne(
        { _id: chatId },
        { $set: { "messages.$[msg].isRead": true, "messages.$[msg].readAt": new Date() } },
        { arrayFilters: [{ "msg.senderId": { $ne: userId }, "msg.isRead": false }] }
      );
      io.to(chatId).emit("messages_marked_read", { chatId, userId });
    } catch (error) {
      console.error("Mark seen error:", error);
    }
  });

  socket.on("disconnect", async (reason) => {
    let disconnectedUser = null;
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        disconnectedUser = userId;
        break;
      }
    }

    if (disconnectedUser) {
      const lastSeen = new Date();
      try {
        await User.findOneAndUpdate({ uid: disconnectedUser }, { isOnline: false, lastSeen });
        onlineUsers.delete(disconnectedUser);
        io.emit("status_change", { userId: disconnectedUser, isOnline: false, lastSeen });
      } catch (error) {
        console.error("Disconnect update error:", error);
      }
    }
  });
});

// ==========================================
// 🗄️ Database & Startup
// ==========================================
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URI;

const connectDB = async (retries = 5) => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB Connected Successfully");
    
    // Listen on all interfaces for Railway
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Rezon Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ MongoDB Error (retries left: ${retries}):`, error.message);
    if (retries > 0) {
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      process.exit(1);
    }
  }
};

connectDB();

// Graceful Shutdown for Railway
process.on('SIGTERM', () => {
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});