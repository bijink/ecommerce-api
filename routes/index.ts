import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Router } from 'express';
import { checkSchema } from 'express-validator';
import s3 from '../config/s3';
import deleteImage from '../utils/deleteImage';
import { authenticateJwtToken, authenticateUserRole, validateRequest } from '../utils/middlewares';
import { uploadFile } from '../utils/multer';
import { fileUploadSchema } from '../utils/validationSchemas';
import AdminRoutes from './admin.routes';
import AuthRoutes from './auth.routes';
import CustomerRoutes from './customer.routes';
import UserRoutes from './user.routes';

const router = Router();

// #welcome route
router.get('/', (request, response) => {
  response.send(`
    Welcome to API service of "Shopping Bazaar" e-commerce web application. 
    To visit the application click <a href="${process.env.CORS_ORIGIN_URL}">${process.env.CORS_ORIGIN_URL?.replace(/^https?:\/\//, '')}</a>.
    `);
});
// #upload-file route
router.post(
  '/upload-file/image',
  authenticateJwtToken,
  validateRequest(checkSchema(fileUploadSchema[0])),
  (request, response, next) => {
    request.query.count = (0).toString();
    next();
  },
  uploadFile.array('files', 4),
  (request, response) => {
    if (!request.files) return response.status(400).send({ message: 'no file found on request' });
    const fileKeys: (string | null)[] = [];
    const reqFiles = request?.files as Express.MulterS3.File[];
    const reqFilesLength = reqFiles?.length as number;
    if (reqFiles?.length) {
      for (let i = 0; i < reqFilesLength; i++) {
        if (reqFiles[i].originalname !== 'no-image') fileKeys.push(reqFiles[i].key);
        else fileKeys.push(null);
      }
    }
    response
      .status(201)
      .send({ message: 'file uploaded successfully', files: reqFiles, filekeys: fileKeys });
  },
);
// #get-img-url route
router.get('/get-img-url', async (req, res) => {
  const bucket =
    process.env.NODE_ENV === 'development'
      ? (process.env.MINIO_BUCKET_NAME as string)
      : (process.env.AWS_BUCKET_NAME as string);
  const key = req.query.key as string; // File name/key from the request URL
  try {
    // HeadObjectCommand is used here to check the image exist in storage or not
    const headObjectCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
    await s3.send(headObjectCommand);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    // Generate a signed URL
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });
    res.status(200).send({ imageUrl: signedUrl });
  } catch (error) {
    res.status(500).send({ error: 'Failed to generate image URL' });
  }
});
// #delete-img route
router.delete('/delete-image', async (request, response) => {
  const bucket =
    process.env.NODE_ENV === 'development'
      ? (process.env.MINIO_BUCKET_NAME as string)
      : (process.env.AWS_BUCKET_NAME as string);
  const objectKey = request.query.key as string;
  try {
    await deleteImage(bucket, objectKey);
    response.status(200).json({ message: `Image "${objectKey}" deleted successfully.` });
  } catch (error) {
    response.status(500).json({ error: 'Failed to delete image.' });
  }
});
// #other routes
router.use('/auth', AuthRoutes);
router.use('/user', UserRoutes);
router.use('/admin', authenticateJwtToken, authenticateUserRole('admin'), AdminRoutes);
router.use('/customer', authenticateJwtToken, authenticateUserRole('customer'), CustomerRoutes);

export default router;
