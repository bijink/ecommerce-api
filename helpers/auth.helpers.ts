import bcrypt from 'bcrypt';
import otpGenerator from 'otp-generator';
import { Otp, User } from '../models';
import { mailSender } from '../utils/mailSender';

const authHelpers = {
  sendOtp: async (email: string) => {
    try {
      const userExist = await User.findOne({ email });
      if (userExist)
        return Promise.reject({ status: 409, data: { message: 'email already in use' } });
      // #generate otp
      const generatedOtp = otpGenerator.generate(4, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });
      // #save generated opt to db
      const otp = new Otp({ email, otp: generatedOtp });
      await otp.save();
      const insertedOtp = await Otp.findById(otp._id).exec();
      if (!insertedOtp) {
        return Promise.reject({
          status: 500,
          data: {
            message: 'something went wrong, please try again later',
          },
        });
      }
      // #send mail to user entered email
      const mailResponse = await mailSender({
        fromEmail: '"ECommerce" <bijintestacc@gmail.com>',
        toEmail: email,
        title: 'ECommerce - Sign up OTP',
        htmlBody: `
          <div
            class="container"
            style="max-width: 90%; margin: auto; padding-top: 20px"
          >
            <h2 style="text-align: center;">Welcome to ECommerce</h2>
            <p style="margin-bottom: 30px; text-align: center;">Pleas enter the sign up OTP to get started</p>
            <h1 style="font-size: 40px; letter-spacing: 2px; text-align: center;">${insertedOtp.otp}</h1>
          </div>
        `,
      });
      return Promise.resolve({
        status: 200,
        data: { status: 'success', info: mailResponse },
      });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  // #only for customer
  signup: async (userData: {
    type: string;
    fname: string;
    lname: string;
    email: string;
    password: string;
    otp: string;
  }) => {
    try {
      const userExist = await User.findOne({ email: userData.email });
      if (userExist)
        return Promise.reject({ status: 409, data: { message: 'email already in use' } });
      // #verify otp
      const generatedOtp = await Otp.findOne({ email: userData.email, otp: userData.otp });
      if (!generatedOtp)
        return Promise.reject({ status: 401, data: { message: 'OTP verification failed' } });
      userData.password = await bcrypt.hash(userData.password, 10);
      const user = new User(userData);
      await user.save();
      const insertedUser = await User.findById(user._id).select('-password').lean().exec();
      if (!insertedUser)
        return Promise.reject({
          status: 500,
          data: {
            message: 'something went wrong, please try again later',
          },
        });
      return Promise.resolve({ status: 201, data: { user: insertedUser } });
    } catch (error) {
      return Promise.reject({ status: 409, data: error });
    }
  },
  // #for both admin and customer
  signin: async (credentials: { email: string; password: string }) => {
    try {
      const user = await User.findOne({ email: credentials.email });
      if (!user)
        return Promise.reject({ status: 401, data: { message: 'invalid email or password' } });
      const authStatus = await bcrypt
        .compare(credentials.password, user.password)
        .then((status) => status);
      if (!authStatus)
        return Promise.reject({ status: 401, data: { message: 'invalid password' } });
      const newUserObj = {
        _id: user._id,
        role: user.role,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
      };
      return Promise.resolve({ status: 200, data: { user: newUserObj } });
    } catch (error) {
      return Promise.reject({ status: 400, data: error });
    }
  },
};

export default authHelpers;
