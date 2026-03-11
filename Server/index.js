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

// 🔧 RAILWAY PROXY TRUST (VERY IMPORTANT FOR CORS)
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
// 🌐 CORS SETUP (GURANTEED FIX)
// ==========================================
const allowedOrigins = [
  "https://rezon.raathdeveloper.com",
  "https://raathdeveloper.com",
  "https://rezon.up.railway.app",
  "http://localhost:5173"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// 1. Pehle CORS middleware apply karein
app.use(cors(corsOptions));

// 2. Pre-flight (OPTIONS) requests ko har route ke liye manually handle karein
app.options("*", cors(corsOptions));

// ==========================================
// 🔌 Socket.IO SETUP
// ==========================================
const io = new Server(httpServer, {
  path: "/socket.io/",
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// ==========================================
// 🟢 Socket Logic
// ==========================================
let onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("setup", (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(userId, { socketId: socket.id });
    socket.emit("connected");
  });

  socket.on("user_online", async (userId) => {
    if (!userId) return;
    await User.findOneAndUpdate({ uid: userId }, { isOnline: true, lastSeen: new Date() });
    io.emit("status_change", { userId, isOnline: true });
  });

  socket.on("send_message", async (data) => {
    const { chatId, senderId, message } = data;
    try {
      const updatedChat = await Chat.findByIdAndUpdate(chatId, {
        $push: { messages: { senderId, message, timestamp: new Date(), isRead: false } },
        $set: { lastMessage: message, lastMessageTime: new Date() }
      }, { new: true });
      if (updatedChat) io.to(chatId).emit("receive_message", data);
    } catch (err) { console.error(err); }
  });

  socket.on("disconnect", () => {
    // disconnect logic...
  });
});

// ==========================================
// 🗄️ Database & Startup
// ==========================================
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URI;

mongoose.connect(MONGO_URL).then(() => {
  console.log("✅ MongoDB Connected");
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port: ${PORT}`);
  });
}).catch(err => console.error("❌ DB Error:", err));