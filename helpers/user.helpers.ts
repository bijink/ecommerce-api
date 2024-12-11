import {
  CreateInvalidationCommand,
  CreateInvalidationCommandInput,
} from '@aws-sdk/client-cloudfront';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadObjectCommand,
  HeadObjectCommandInput,
} from '@aws-sdk/client-s3';
import {
  CloudfrontSignInputWithParameters,
  getSignedUrl as getCfSignedUrl,
} from '@aws-sdk/cloudfront-signer';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import cloudFront from '../config/cloudFront';
import s3 from '../config/s3';
import { Cart, Order, User } from '../models';
import { UserAddress } from '../types/global.type';

const userHelpers = {
  getUserDetails: async (userId: string) => {
    try {
      const user = await User.findById(userId).select('-password').lean().exec();
      if (!user) return Promise.reject({ status: 404, data: { message: 'could not find user' } });
      return Promise.resolve({ status: 200, data: user });
    } catch (error) {
      return Promise.reject({ status: 400, data: error });
    }
  },
  updateUserDetails: async (
    userId: string,
    detailsToUpdate: {
      fname?: string;
      lname?: string;
      email?: string;
      mobile?: string;
      password?: string;
      image?: string;
      address?: UserAddress;
    },
  ) => {
    try {
      const user = await User.findOne({ _id: userId });
      if (!user) return Promise.reject({ status: 404, data: { message: 'could not find user' } });
      await User.updateOne({ _id: userId }, detailsToUpdate);
      const updatedUserDetails = await User.findById(userId).select('-password').lean().exec();
      if (!updatedUserDetails)
        return Promise.reject({
          status: 500,
          data: {
            message: 'something went wrong, please try again later',
          },
        });
      return Promise.resolve({ status: 200, data: { user: updatedUserDetails } });
    } catch (error) {
      return Promise.reject({ status: 400, data: error });
    }
  },
  deleteUserAccount: async (userId: string) => {
    try {
      const user = await User.findById(userId).exec();
      if (!user) return Promise.reject({ status: 404, data: { message: 'user not found' } });
      const deletedUser = await Promise.all([
        await Order.deleteMany({ user_id: userId }),
        await Cart.findOneAndDelete({ user_id: userId }),
        await User.findOneAndDelete({ _id: userId }),
      ]);
      if (!deletedUser.length)
        return Promise.reject({
          status: 500,
          data: { message: 'something went wrong, please try again later' },
        });
      return Promise.resolve({
        status: 200,
        data: { message: 'User account deleted successfully', deletedUser: user },
      });
    } catch (error) {
      return Promise.reject({ status: 500, data: { error } });
    }
  },
  // ** IMAGES ** //
  // #if process.env.NODE_ENV === 'development'
  getImageUrlForDev: async (
    ObjectCommandParams: HeadObjectCommandInput | GetObjectCommandInput,
  ) => {
    try {
      // HeadObjectCommand is used here to check the image exist in storage or not
      const headObjectCommand = new HeadObjectCommand(ObjectCommandParams);
      await s3.send(headObjectCommand);
      const command = new GetObjectCommand(ObjectCommandParams);
      // Generate signed URL
      const signedUrl = await getS3SignedUrl(s3, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });
      return Promise.resolve({ status: 200, data: { imageUrl: signedUrl } });
    } catch (error) {
      return Promise.reject({ status: 500, data: { error: 'Failed to generate image URL' } });
    }
  },
  // #if process.env.NODE_ENV === 'production'
  getImageUrlForProd: async (signedUrlParams: CloudfrontSignInputWithParameters) => {
    try {
      // Generate signed URL
      const signedUrl = getCfSignedUrl(signedUrlParams);
      return Promise.resolve({ status: 200, data: { imageUrl: signedUrl } });
    } catch (error) {
      return Promise.reject({ status: 500, data: { error: 'Failed to generate image URL' } });
    }
  },
  deleteImage: async (bucket: string, key: string) => {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await s3.send(command);
      return Promise.resolve({
        status: 200,
        message: `Successfully deleted image '${key}' from bucket '${bucket}'`,
      });
    } catch (error) {
      return Promise.reject({
        status: 500,
        message: `Failed to delete image '${key}' from bucket '${bucket}'`,
      });
    }
  },
  invalidateCloudfront: async (invalidationParams: CreateInvalidationCommandInput) => {
    try {
      const cfCommand = new CreateInvalidationCommand(invalidationParams);
      const result = await cloudFront.send(cfCommand);
      return Promise.resolve({
        status: 200,
        data: { message: 'Successfully invalidated cloudfront', result },
      });
    } catch (error) {
      return Promise.reject({
        status: 200,
        data: { message: 'Failed to invalidate cloudfront', error },
      });
    }
  },
  // ** /IMAGES ** //
};

export default userHelpers;
