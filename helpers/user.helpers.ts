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
};

export default userHelpers;
