// @ts-nocheck
import multer from "multer";

// Store files in memory for direct upload to S3
const upload = multer({ storage: multer.memoryStorage() });

export default upload; 