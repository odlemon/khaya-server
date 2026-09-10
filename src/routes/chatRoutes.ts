// @ts-nocheck
import express from "express";
import { chatController } from "../controllers/ChatController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

router.use(authenticate);

// Chat management routes
router.post("/get-or-create", chatController.getOrCreateChat.bind(chatController));
router.get("/", chatController.getUserChats.bind(chatController));
router.post("/send", chatController.sendSimpleMessage.bind(chatController));
router.get("/stats", chatController.getChatStats.bind(chatController));
router.get("/unread-count", chatController.getUnreadCount.bind(chatController));

// Real-time features (static paths before /:chatId)
router.get("/online-users", chatController.getOnlineUsers.bind(chatController));

// Viewing request routes
router.post("/viewing-request", authorize(["tenant"]), chatController.sendViewingRequest.bind(chatController));
router.put("/viewing-request/respond", authorize(["landlord"]), chatController.respondToViewingRequest.bind(chatController));
router.get("/viewing-requests", authorize(["landlord"]), chatController.getLandlordViewingRequests.bind(chatController));

// Move-in request routes
router.post("/move-in-request", authorize(["tenant"]), chatController.sendMoveInRequest.bind(chatController));
router.put("/move-in-request/respond", authorize(["landlord"]), chatController.respondToMoveInRequest.bind(chatController));
router.get("/move-in-requests", authorize(["landlord"]), chatController.getLandlordMoveInRequests.bind(chatController));

// Tenant-specific routes
router.get("/pending-requests", authorize(["tenant"]), chatController.getTenantPendingRequests.bind(chatController));

// Admin-specific routes
router.get("/admin/all-chats", authorize(["admin"]), requirePermission("khayalami.chat.view"), chatController.getAllChats.bind(chatController));
router.post("/admin/join/:chatId", authorize(["admin"]), requirePermission("khayalami.chat.join"), chatController.adminJoinChat.bind(chatController));
router.post("/admin/start", authorize(["admin"]), requirePermission("khayalami.chat.send"), chatController.adminStartChat.bind(chatController));
router.post("/admin/cleanup-duplicates", authorize(["admin"]), requirePermission("khayalami.chat.view"), chatController.cleanupDuplicateParticipants.bind(chatController));
router.post("/admin/link-to-property", authorize(["admin"]), requirePermission("khayalami.chat.view"), chatController.linkChatToProperty.bind(chatController));

// Chat-specific routes (parameterized — must be last)
router.get("/:chatId", chatController.getChatById.bind(chatController));
router.post("/:chatId/messages", chatController.sendMessage.bind(chatController));
router.put("/:chatId/read", chatController.markMessagesAsRead.bind(chatController));
router.delete("/:chatId", chatController.archiveChat.bind(chatController));

export default router;
