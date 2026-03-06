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

import route from "./Routes/userRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";

import Chat from "./model/chat.js";
import User from "./model/user.js";

// ==========================================
// 🔐 ENV CONFIG
// ==========================================
dotenv.config();

// ==========================================
// 🔐 Firebase Admin Setup
// ==========================================
const require = createRequire(import.meta.url);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
console.log("✅ Firebase Admin SDK Initialized!");

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

const io = new Server(httpServer, {
  path: "/socket.io/", 
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'], 
  pingTimeout: 60000,
  pingInterval: 25000
});

// ==========================================
// 📂 Path Helpers
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  res.json({ status: "OK", socket: "running", timestamp: new Date() });
});

// ==========================================
// 🟢 Online Users Tracker
// ==========================================
let onlineUsers = new Map(); 

// ==========================================
// 🔌 Socket Events
// ==========================================
io.on("connection", (socket) => {
  console.log("✅ Socket Connected:", socket.id, "Transport:", socket.conn.transport.name);

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
  });

  socket.on("typing", (data) => {
    const { chatId, userId } = data;
    socket.to(chatId).emit("typing", { chatId, userId });
  });

  socket.on("stop_typing", (data) => {
    const { chatId, userId } = data;
    socket.to(chatId).emit("stop_typing", { chatId, userId });
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
        io.to(chatId).emit("receive_message", {
          ...data,
          _id: updatedChat.messages[updatedChat.messages.length - 1]._id,
          timestamp: newMessage.timestamp
        });

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
        console.log(`🔴 User ${disconnectedUser} is Offline`);
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
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB Connected Successfully");
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ MongoDB Error (retries: ${retries}):`, error.message);
    if (retries > 0) setTimeout(() => connectDB(retries - 1), 5000);
    else process.exit(1);
  }
};

connectDB();

process.on('SIGTERM', () => {
  httpServer.close(() => mongoose.connection.close(false, () => process.exit(0)));
});
process.on('SIGINT', () => {
  httpServer.close(() => mongoose.connection.close(false, () => process.exit(0)));
});
