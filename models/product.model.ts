import { model, Schema } from 'mongoose';

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  suitableFor: {
    type: [String],
    enum: ['children', 'men', 'women'],
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  sizes: {
    xxs: { type: Boolean, required: true },
    xs: { type: Boolean, required: true },
    s: { type: Boolean, required: true },
    m: { type: Boolean, required: true },
    l: { type: Boolean, required: true },
    xl: { type: Boolean, required: true },
    '2xl': { type: Boolean, required: true },
    '3xl': { type: Boolean, required: true },
  },
  price: {
    type: Number,
    required: true,
  },
  colors: [
    {
      name: {
        type: String,
        required: true,
      },
      hex: {
        type: String,
        required: true,
      },
    },
  ],
  description: {
    type: String,
    require: true,
  },
  details: {
    type: String,
    require: true,
  },
  highlights: {
    type: [String],
  },
  images: {
    type: [String],
  },
});

const Product = model('Product', productSchema);

export default Product;
