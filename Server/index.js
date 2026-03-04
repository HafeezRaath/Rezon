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
// 🔐 ENV CONFIG (MUST BE ON TOP)
// ==========================================
dotenv.config();

// ==========================================
// 🔐 Firebase Admin Setup
// ==========================================
const require = createRequire(import.meta.url);
const serviceAccount = require("./credentials.json");

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
// 🌐 Socket.IO Setup
// ==========================================
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

// ==========================================
// 📂 Path Helpers
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 🧩 Middlewares
// ==========================================
// ✅ CORS Update: Credentials allow karein
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

// ✅ Payload Limit Update: Taake ID Card aur Selfie images block na hon
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==========================================
// 🛣️ Routes
// ==========================================
app.use("/api", route);
app.use("/api/admin", adminRoutes);

// ==========================================
// 🟢 Online Users Tracker
// ==========================================
let onlineUsers = {};

// ==========================================
// 🔌 Socket Events
// ==========================================
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("user_online", async (userId) => {
    if (!userId) return;
    onlineUsers[userId] = socket.id;
    await User.findOneAndUpdate({ uid: userId }, { isOnline: true });
    io.emit("status_change", { userId, isOnline: true });
    console.log(`🟢 User ${userId} is Online`);
  });

  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("send_message", async (data) => {
    const { chatId, senderId, message } = data;
    try {
      await Chat.findByIdAndUpdate(chatId, {
        $push: {
          messages: {
            senderId,
            message,
            timestamp: new Date(),
            isRead: false,
          },
        },
        $set: {
          lastMessage: message,
          deletedBy: [],
        },
      });
      io.to(chatId).emit("receive_message", data);
      console.log(`📩 Message from ${senderId} in chat ${chatId}`);
    } catch (error) {
      console.error("Socket Send Error:", error);
    }
  });

  socket.on("message_seen", async ({ chatId, userId }) => {
    try {
      await Chat.updateOne(
        { _id: chatId },
        { $set: { "messages.$[msg].isRead": true } },
        { arrayFilters: [{ "msg.senderId": { $ne: userId }, "msg.isRead": false }] }
      );
      io.to(chatId).emit("messages_marked_read", { chatId });
    } catch (error) {
      console.error("Seen Error:", error);
    }
  });

  socket.on("disconnect", async () => {
    const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
    if (userId) {
      const lastSeen = new Date();
      await User.findOneAndUpdate({ uid: userId }, { isOnline: false, lastSeen });
      delete onlineUsers[userId];
      io.emit("status_change", { userId, isOnline: false, lastSeen });
      console.log(`🔴 User ${userId} is Offline`);
    }
  });
});

// ==========================================
// 🗄️ MongoDB Connection
// ==========================================
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port: ${PORT}`);
      console.log(`👑 Admin Panel: http://localhost:${PORT}/api/admin/dashboard`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Error:", error.message);
  });