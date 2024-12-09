import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3';

export default async function deleteImage(bucket: string, key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3.send(command);
    // console.log(`Image "${key}" deleted successfully from bucket "${bucket}".`);
  } catch (error) {
    // console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
}
