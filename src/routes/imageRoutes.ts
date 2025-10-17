// @ts-nocheck
import express from "express";
import { imageController, ImageController } from "../controllers/ImageController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authenticate";

const router = express.Router();

// All image routes require authentication
router.use(authenticate);

// Upload single image
router.post("/upload", 
  authorize(["landlord", "admin"]), 
  ImageController.getUploadMiddleware(),
  (req, res, next) => imageController.uploadImage(req, res, next)
);

// Upload multiple images
router.post("/upload-multiple", 
  authorize(["landlord", "admin"]), 
  ImageController.getMultipleUploadMiddleware(),
  (req, res, next) => imageController.uploadMultipleImages(req, res, next)
);

// Delete image
router.delete("/:imageKey", 
  authorize(["landlord", "admin"]), 
  (req, res, next) => imageController.deleteImage(req, res, next)
);

export default router; 