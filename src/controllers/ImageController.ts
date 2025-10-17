// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { uploadToS3, deleteFromS3 } from "../utils/awsS3";
import multer from "multer";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

export class ImageController {

  // Upload single image
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: "No image file provided" 
        });
      }

      const { propertyId, imageType = "gallery" } = req.body;
      const file = req.file;

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `properties/${propertyId || 'temp'}/${imageType}_${timestamp}_${file.originalname}`;

      // Upload to S3
      const uploadResult = await uploadToS3(file.buffer, fileName, file.mimetype);

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          url: uploadResult.url,
          key: uploadResult.key,
          imageType: imageType
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Upload multiple images
  async uploadMultipleImages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No image files provided" 
        });
      }

      const { propertyId, imageType = "gallery" } = req.body;
      const files = req.files as Express.Multer.File[];

      const uploadPromises = files.map(async (file, index) => {
        const timestamp = Date.now();
        const fileName = `properties/${propertyId || 'temp'}/${imageType}_${timestamp}_${index}_${file.originalname}`;
        
        return await uploadToS3(file.buffer, fileName, file.mimetype);
      });

      const uploadResults = await Promise.all(uploadPromises);

      res.status(200).json({
        success: true,
        message: `${files.length} images uploaded successfully`,
        data: uploadResults.map(result => ({
          url: result.url,
          key: result.key,
          imageType: imageType
        }))
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Delete image from S3
  async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageKey } = req.params;

      if (!imageKey) {
        return res.status(400).json({ 
          success: false, 
          message: "Image key is required" 
        });
      }

      await deleteFromS3(imageKey);

      res.status(200).json({
        success: true,
        message: "Image deleted successfully"
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get upload middleware for single image
  static getUploadMiddleware() {
    return upload.single('image');
  }

  // Get upload middleware for multiple images
  static getMultipleUploadMiddleware() {
    return upload.array('images', 10); // Max 10 images
  }
}

export const imageController = new ImageController(); 