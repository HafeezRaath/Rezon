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
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  console.log("✅ Firebase Admin SDK Initialized!");
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
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// SOCKET.IO WITH OPTIMIZED SETTINGS
const io = new Server(httpServer, {
  path: "/socket.io/", 
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Production mein polling aur websocket dono allow rakhein
  transports: ['polling', 'websocket'], 
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true // Compatibility ke liye
});

// ==========================================
// 🧩 Middlewares
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==========================================
// 🛣️ Routes
// ==========================================
app.use("/api", route);
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    socket: "running", 
    environment: process.env.NODE_ENV || "development",
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
  // Transport log karne se debug asaan hota hai
  console.log(`✅ Socket Connected: ${socket.id} | Mode: ${socket.conn.transport.name}`);

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
        { isOnline: true, lastSeen: new Date() },
        { upsert: true }
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
        
        // Chat room mein message bhejna
        io.to(chatId).emit("receive_message", {
          ...data,
          _id: savedMsg._id,
          timestamp: newMessage.timestamp
        });

        // Notifications bhejna
        const chat = await Chat.findById(chatId).populate('participants', 'uid');
        chat.participants.forEach(participant => {
          if (participant.uid !== senderId) {
            io.to(participant.uid).emit("new_message_notification", {
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
        console.log(`🔴 User ${disconnectedUser} Offline (Reason: ${reason})`);
      } catch (error) {
        console.error("Disconnect update error:", error);
      }
    }
  });

  socket.on("error", (err) => console.error("Socket error:", err));
});

// ==========================================
// 🗄️ Database & Startup
// ==========================================
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URI;

const connectDB = async (retries = 5) => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URL, { 
      serverSelectionTimeoutMS: 5000 
    });
    console.log("✅ MongoDB Connected Successfully");
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port: ${PORT}`);
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

// Graceful Shutdown
process.on('SIGTERM', () => {
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});