import { model, Schema } from 'mongoose';

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 3, // The document will be automatically deleted after 3 minutes of its creation time
  },
});

const Otp = model('Otp', otpSchema);

export default Otp;
