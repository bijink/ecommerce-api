import { Request } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import s3 from '../config/s3';

export const uploadFile = multer({
  storage: multerS3({
    s3: s3,
    bucket:
      process.env.NODE_ENV === 'development'
        ? (process.env.MINIO_BUCKET_NAME as string)
        : (process.env.AWS_BUCKET_NAME as string),
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      const { for: fileFor, id } = req.query;
      const fileCount = parseInt(req.query.count as string);
      const timestamp = Date.now();
      const fileExt = file.mimetype.split('/')[1];
      const originalName = file.originalname;
      let uploadingFileName = '';
      if (originalName === 'no-image') uploadingFileName = originalName;
      else uploadingFileName = `${fileFor}_${id}_${fileCount}_${timestamp}.${fileExt}`;
      req.query.count = (fileCount + 1).toString();
      cb(null, uploadingFileName);
    },
  }),
});
