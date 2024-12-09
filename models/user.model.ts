import { model, Schema } from 'mongoose';

const userSchema = new Schema({
  role: {
    type: String,
    enum: ['customer'], // Restricts the field to only this value
    default: 'customer', // Sets the default value
  },
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  address: {
    fullname: {
      type: String,
    },
    building: {
      type: String,
    },
    street: {
      type: String,
    },
    town: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    landmark: {
      type: String,
    },
  },
});

const User = model('User', userSchema);

export default User;
