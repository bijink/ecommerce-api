import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// #Determine the environment
const isProduction = process.env.NODE_ENV === 'production';

// #Configure S3 Client based on environment
const s3 = new S3Client({
  endpoint: isProduction ? undefined : process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000', // MinIO for development
  region: isProduction ? process.env.AWS_REGION || 'us-east-1' : 'us-east-1', // AWS or MinIO region
  credentials: {
    accessKeyId: isProduction
      ? (process.env.AWS_ACCESS_KEY_ID as string) // AWS credentials
      : process.env.MINIO_ACCESS_KEY || 'minioadmin', // MinIO credentials
    secretAccessKey: isProduction
      ? (process.env.AWS_SECRET_ACCESS_KEY as string) // AWS credentials
      : process.env.MINIO_SECRET_ACCESS_KEY || 'minioadmin', // MinIO credentials
  },
  forcePathStyle: !isProduction, // Required for MinIO, ignored by AWS S3
});

export default s3;
