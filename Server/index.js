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

// 🔧 RAILWAY PROXY TRUST (Iske bina headers mismatch hotay hain)
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
// 🌐 THE NUCLEAR CORS FIX (FORCE HEADERS)
// ==========================================
// Purana manual header logic aur purana app.use(cors) dono hata dein.
// Sirf ye rakhein:

const allowedOrigins = [
  "https://rezon.raathdeveloper.com",
  "https://raathdeveloper.com",
  "https://rezon.up.railway.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));

// Iske FORAN BAAD routes hone chahiye
app.use("/api", route);

// Extra safety layer
app.use(cors({
  origin: "*", 
  credentials: true
}));

// ==========================================
// 🔌 Socket.IO Setup
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

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// ==========================================
// 🟢 Socket Logic (Simplified for stability)
// ==========================================
let onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("setup", (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(userId, { socketId: socket.id });
    socket.emit("connected");
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
}).catch(err => {
  console.error("❌ DB Error:", err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});