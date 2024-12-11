import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { productHelpers, userHelpers } from '../helpers';
import { authenticateJwtToken, validateRequest } from '../utils/middlewares';
import { uploadFile } from '../utils/multer';
import { fileUploadSchema } from '../utils/validationSchemas';

const router = Router();

const nodeEnv = process.env.NODE_ENV!;

router.get('/get-user-details/:userId', authenticateJwtToken, (request, response) => {
  const { userId } = request.params;
  userHelpers
    .getUserDetails(userId)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.patch('/update-details/:userId', authenticateJwtToken, (request, response) => {
  const { userId } = request.params;
  userHelpers
    .updateUserDetails(userId, request.body)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.delete('/delete/:userId', (request, response) => {
  const { userId } = request.params;
  userHelpers
    .deleteUserAccount(userId)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.get('/get-product', async (request, response) => {
  const prodId = request.query.id;
  if (prodId) {
    productHelpers
      .getProduct(prodId)
      .then((res) => {
        response.status(res.status).send(res.data);
      })
      .catch((err) => {
        response.status(err.status).send(err.data);
      });
  } else {
    response.status(400).send('product id required');
  }
});
router.get('/get-all-product', async (request, response) => {
  const { sort, skip, limit } = request.query;
  productHelpers
    .getAllProduct(sort, skip, limit)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
// ** IMAGES ** //
// #upload-images route
router.post(
  '/upload-images',
  authenticateJwtToken,
  validateRequest(checkSchema(fileUploadSchema[0])),
  (request, response, next) => {
    request.query.count = (1).toString();
    next();
  },
  uploadFile.array('images', 4),
  (request, response) => {
    if (!request.files) return response.status(400).send({ message: 'no file found on request' });
    const fileNames: (string | null)[] = [];
    const reqFiles = request?.files as Express.MulterS3.File[];
    const reqFilesLength = reqFiles?.length as number;
    if (reqFiles?.length) {
      for (let i = 0; i < reqFilesLength; i++) {
        if (reqFiles[i].originalname !== 'no-image') fileNames.push(reqFiles[i].key);
        else fileNames.push(null);
      }
    }
    response
      .status(201)
      .send({ message: 'file uploaded successfully', files: reqFiles, filenames: fileNames });
  },
);
// #get-image-url route
router.get('/get-image-url/:key', async (request, response) => {
  const key = request.params.key; // file name/key from the request URL
  if (nodeEnv === 'development') {
    // const bucket = process.env.AWS_BUCKET_NAME!; // #to connect aws bucket (but in 'production' mode)
    const bucket = process.env.MINIO_BUCKET_NAME!; // #to connect minio bucket
    const ObjectCommandParams = { Bucket: bucket, Key: key };
    userHelpers
      .getImageUrlForDev(ObjectCommandParams)
      .then((res) => {
        response.status(res.status).send(res.data);
      })
      .catch((err) => {
        response.status(err.status).send(err.data);
      });
  } else {
    const cloudfrontDomainName = process.env.CLOUDFRONT_DOMAIN_NAME!;
    const cloudfrontPrivateKey = process.env.CLOUDFRONT_PRIVATE_KEY!;
    const cloudfrontKeyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID!;
    const url = `https://${cloudfrontDomainName}/${key}`;
    const signedUrlParams = {
      url,
      dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(), // 2days
      privateKey: cloudfrontPrivateKey,
      keyPairId: cloudfrontKeyPairId,
    };
    userHelpers
      .getImageUrlForProd(signedUrlParams)
      .then((res) => {
        response.status(res.status).send(res.data);
      })
      .catch((err) => {
        response.status(err.status).send(err.data);
      });
  }
});
// #delete-images route
router.delete('/delete-images', async (request, response) => {
  const { imageNames }: { imageNames: string[] } = request.body;
  const bucket =
    nodeEnv === 'development' ? process.env.MINIO_BUCKET_NAME! : process.env.AWS_BUCKET_NAME!;
  // #filter out null values from the array
  const imageKeys = imageNames.filter((name) => name !== null);
  try {
    const result = await Promise.all(
      imageKeys.map(async (key) => {
        try {
          return await userHelpers.deleteImage(bucket, key);
        } catch (error) {
          return error as { status: number; message: string };
        }
      }),
    );
    // #check if there any failer in image delete
    const hasError = result.some((obj) => obj.status === 500);
    if (hasError)
      return response.status(500).send('At least one image was not deleted successfully');
    // *invalidate the cloudfront cache for the images
    if (nodeEnv === 'production') {
      const cloudfrontDistributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID!;
      // create imagekey path by adding '/' at begining
      const imageKeyPaths = imageKeys.map((name) => `/${name}`);
      const invalidationParams = {
        DistributionId: cloudfrontDistributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: imageKeyPaths.length, // no of items to invalidate
            Items: imageKeyPaths, // array of image path with '/' at begining (eg: '/product_8759d7b68f763h522e372ef6_1_1733921809305.webp')
          },
          CallerReference: imageKeys[0], // unique id for each invalidation
        },
      };
      await userHelpers.invalidateCloudfront(invalidationParams);
    }
    response.status(200).send('All images are deleted successfully');
  } catch (error) {
    response.status(500).send(error);
  }
});
// ** /IMAGES ** //

export default router;
