// @ts-nocheck
import express from "express";
import { authenticate } from "../middleware/authenticate";
import { notificationController } from "../controllers/NotificationController";

const router = express.Router();

router.use(authenticate);

router.get("/", notificationController.list.bind(notificationController));
router.get("/unread-count", notificationController.getUnreadCount.bind(notificationController));
router.put("/read-all", notificationController.markAllRead.bind(notificationController));
router.put("/:id/read", notificationController.markRead.bind(notificationController));

export default router;
