/* eslint no-console: off */
import mongoose from 'mongoose';

const connectDB = (url: string) => {
  mongoose.set('strictQuery', true);

  mongoose
    .connect(url)
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.log(err));
};

export default connectDB;
