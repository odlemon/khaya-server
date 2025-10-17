// @ts-nocheck
import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import { errorMiddleware } from "./middleware/error"
import { dbConnection } from "./utils/database"
import { envConfig } from "./utils/env"
import { logger } from "./utils/logger"
import { getServerPort } from "./utils/portFinder"
import "./utils/googleOAuth";
import SocketService from "./services/SocketService"

import connectionRoutes from "./routes/connectionRoutes"

dotenv.config()

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
  }
})
// Port will be determined dynamically in startServer function

app.use(helmet())
app.use(cors({
  // Allow all origins by reflecting the request origin (supports credentials)
  origin: true,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  })
  next()
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: envConfig.get("NODE_ENV"),
    database: dbConnection.getConnection().readyState === 1 ? "connected" : "disconnected",
  })
})

import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes"
import propertyRoutes from "./routes/propertyRoutes"
import imageRoutes from "./routes/imageRoutes"
import onboardingRoutes from "./routes/onboardingRoutes"
import agreementRoutes from "./routes/agreementRoutes"
import favoriteRoutes from "./routes/favoriteRoutes"
import chatRoutes from "./routes/chatRoutes"
import adminRoutes from "./routes/adminRoutes"
import setupRoutes from "./routes/setupRoutes"
import billRoutes from "./routes/billRoutes"

app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/properties", propertyRoutes)
app.use("/api/images", imageRoutes)
app.use("/api/onboarding", onboardingRoutes)
app.use("/api/agreements", agreementRoutes)
app.use("/api/favorites", favoriteRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/connections", connectionRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/setup", setupRoutes)
app.use("/api/bills", billRoutes)
app.use(errorMiddleware)

// Initialize Socket.IO service
const socketService = new SocketService(io)

// Make io and socketService available globally for use in controllers
app.set('io', io)
app.set('socketService', socketService)

const startServer = async (): Promise<void> => {
  try {
    await dbConnection.connect()

    // Find an available port
    const port = await getServerPort()

    server.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`, {
        environment: envConfig.get("NODE_ENV"),
        port: port,
      })
    })
  } catch (error: any) {
    logger.error("Failed to start server", { error: error.message })
    process.exit(1)
  }
}

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down gracefully...`)

  try {
    await dbConnection.disconnect()
    logger.info("Server shut down successfully")
    process.exit(0)
  } catch (error: any) {
    logger.error("Error during shutdown", { error: error.message })
    process.exit(1)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Start the server
startServer()

export default app
export { io }
