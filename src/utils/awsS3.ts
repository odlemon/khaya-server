// @ts-nocheck
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: "AKIAYLERNOX7ATX3MPMP",
    secretAccessKey: "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"
  }
});
const BUCKET_NAME = "lysp";

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadToS3(buffer: Buffer, key: string, mimetype: string): Promise<UploadResult> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read' // Make the file publicly accessible
  }));
  
  return {
    url: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
    key: key
  };
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  }));
}

// Generate presigned URL for secure uploads (if needed)
export async function generatePresignedUrl(key: string, contentType: string): Promise<string> {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });
  
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry
} 
