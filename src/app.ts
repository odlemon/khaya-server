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
import { setSocketService } from "./services/realtimeRegistry"
import { getSocketCorsOrigins } from "./utils/socketCors"
import { startChatRetentionWatcher, stopChatRetentionWatcher } from "./services/ChatRetentionWatcher"
import { ensureChatRetentionTtlIndex } from "./services/ChatRetentionService"
import { initializeFirebaseAdmin, isFirebaseInitialized, isFcmEnabled } from "./config/firebaseAdmin"

import connectionRoutes from "./routes/connectionRoutes"

dotenv.config()

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: getSocketCorsOrigins(),
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
  },
  // Real-time optimizations
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6
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
    fcm: {
      enabled: isFcmEnabled(),
      firebaseInitialized: isFirebaseInitialized(),
    },
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
import rentalRoutes from "./routes/rentalRoutes"
import paymentRoutes from "./routes/paymentRoutes"
import serviceRoutes from "./routes/serviceRoutes"
import adminDashboardRoutes from "./routes/adminDashboardRoutes"
import adminReportRoutes from "./routes/adminReportRoutes"
import maintenanceRoutes from "./routes/maintenanceRoutes"
import serviceProviderRoutes from "./routes/serviceProviderRoutes"
import commissionRoutes from "./routes/commissionRoutes"
import userProfileRoutes from "./routes/userProfileRoutes"
import landlordDashboardRoutes from "./routes/landlordDashboardRoutes"
import tenantDashboardRoutes from "./routes/tenantDashboardRoutes"
import emailVerificationRoutes from "./routes/emailVerificationRoutes"
import twoFactorAuthRoutes from "./routes/twoFactorAuthRoutes"
import documentVerificationRoutes from "./routes/documentVerificationRoutes"
import appDocumentVerificationRoutes from "./routes/appDocumentVerificationRoutes"
import escrowRoutes from "./routes/escrowRoutes"
import distributionRoutes from "./routes/distributionRoutes"
import paymentRequestRoutes from "./routes/paymentRequestRoutes"
import landlordPreferencesRoutes from "./routes/landlordPreferencesRoutes"
import landlordPayoutMethodRoutes from "./routes/landlordPayoutMethodRoutes"
import landlordSubscriptionRoutes from "./routes/landlordSubscriptionRoutes"
import transactionRoutes from "./routes/transactionRoutes"
import tenantSubscriptionRoutes from "./routes/tenantSubscriptionRoutes"
import cronRoutes from "./routes/cronRoutes"
import webhookRoutes from "./routes/webhookRoutes"
import insuranceAdminRoutes from "./routes/insuranceAdminRoutes"
import bankAdminRoutes from "./routes/bankAdminRoutes"
import notificationRoutes from "./routes/notificationRoutes"

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
app.use("/api/rentals", rentalRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/maintenance", maintenanceRoutes)
app.use("/api/service-providers", serviceProviderRoutes)
app.use("/api/commissions", commissionRoutes)
app.use("/api/user-profiles", userProfileRoutes)
app.use("/api/landlord", landlordDashboardRoutes)
app.use("/api/tenant", tenantDashboardRoutes)
app.use("/api/email-verification", emailVerificationRoutes)
app.use("/api/2fa", twoFactorAuthRoutes)
app.use("/api/documents", documentVerificationRoutes)
app.use("/api/verification", appDocumentVerificationRoutes)
app.use("/api/escrow", escrowRoutes)
app.use("/api/distribution", distributionRoutes)
app.use("/api/payment-requests", paymentRequestRoutes)
app.use("/api/landlord/preferences", landlordPreferencesRoutes)
app.use("/api/landlord/payout-method", landlordPayoutMethodRoutes)
app.use("/api/landlord/subscription", landlordSubscriptionRoutes)
app.use("/api/tenant/subscription", tenantSubscriptionRoutes)
app.use("/api/admin/dashboard", adminDashboardRoutes)
app.use("/api/admin/reports", adminReportRoutes)
app.use("/api/transactions", transactionRoutes)
app.use("/api/cron", cronRoutes)
app.use("/api/webhooks", webhookRoutes)
app.use("/api/insurance-admin", insuranceAdminRoutes)
app.use("/api/bank-admin", bankAdminRoutes)
app.use("/api/notifications", notificationRoutes)
app.use(errorMiddleware)

// Initialize Socket.IO service
const socketService = new SocketService(io)
setSocketService(socketService)

// Make io and socketService available globally for use in controllers
app.set('io', io)
app.set('socketService', socketService)

const startServer = async (): Promise<void> => {
  try {
    await dbConnection.connect()

    await ensureChatRetentionTtlIndex()
    initializeFirebaseAdmin()
    startChatRetentionWatcher()

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
    await stopChatRetentionWatcher()
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
