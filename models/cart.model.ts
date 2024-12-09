import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  color: {
    type: {
      name: {
        type: String,
        required: true,
      },
      hex: {
        type: String,
        required: true,
      },
    },
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
});

const CartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [CartItemSchema],
});

const Cart = mongoose.model('Cart', CartSchema);

export default Cart;
