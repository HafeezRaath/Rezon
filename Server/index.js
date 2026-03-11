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

dotenv.config();
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

// ==========================================
// 🌐 THE PERFECT CORS SETUP (Order Matters!)
// ==========================================
const allowedOrigins = [
  "https://rezon.raathdeveloper.com",
  "https://www.rezon.raathdeveloper.com", // <-- Ye lazmi add karein
  "https://raathdeveloper.com",
  "https://www.raathdeveloper.com",
  "https://rezon.up.railway.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy Blocked this request'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));

// Middlewares (CORS ke baad lekin Routes se pehle)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 🛣️ ROUTES (Must be after CORS)
// ==========================================
app.use("/api", route);
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

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
    console.log("✅ Firebase Admin Initialized!");
  }
} catch (error) {
  console.error("❌ Firebase Error:", error.message);
}

// ==========================================
// 🔌 Socket.IO & Server Startup
// ==========================================
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/socket.io/",
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

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