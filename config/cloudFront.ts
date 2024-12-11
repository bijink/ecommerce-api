import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import dotenv from 'dotenv';

dotenv.config();

const cloudFront = new CloudFrontClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export default cloudFront;
