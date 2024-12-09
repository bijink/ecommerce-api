import { createHmac } from 'crypto';
import { Types } from 'mongoose';
import { ParsedQs } from 'qs';
import Razorpay from 'razorpay';
import { Cart, Order } from '../models';
import { UserAddress } from '../types/global.type';

const orderHelpers = {
  generateRazorpay: async (userId: string, amount: number) => {
    try {
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID as string,
        key_secret: process.env.RAZORPAY_SECRET as string,
      });
      const userCart = await Cart.findOne({ user_id: userId });
      if (!userCart) return Promise.reject({ status: 404, data: { message: 'cart is empty' } });
      const options = {
        amount: amount * 100, // amount in smallest currency unit
        currency: 'INR',
        receipt: `receipt_order_${userCart._id}`,
      };
      const order = await instance.orders.create(options);
      if (!order) return Promise.reject({ status: 500, data: { message: 'some error occured' } });
      return Promise.resolve({ status: 200, data: order });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  verifyPayment: (paymentRes: {
    orderCreationId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }) => {
    try {
      // getting the details back from font-end
      const { orderCreationId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = paymentRes;
      // Creating our own digest
      const secret = process.env.RAZORPAY_SECRET as string;
      // The format should be like this:
      // digest = hmac_sha256(orderCreationId + "|" + razorpayPaymentId, secret);
      const shasum = createHmac('sha256', secret);
      shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
      const digest = shasum.digest('hex');
      // comaparing our digest with the actual signature
      if (digest !== razorpaySignature)
        return Promise.reject({ status: 400, data: { message: 'Transaction not legit!' } });
      // THE PAYMENT IS LEGIT & VERIFIED
      return Promise.resolve({
        status: 200,
        data: {
          message: 'success',
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
        },
      });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  placeOrder: async (
    userId: string,
    orderData: {
      address: UserAddress;
      mobile: string;
      paymentMethod: string;
      paymentStatus: string;
    },
    totalAmount: number,
  ) => {
    try {
      const userCart = await Cart.findOne({ user_id: userId });
      if (!userCart) return Promise.reject({ status: 404, data: { message: 'cart is empty' } });
      const orderObj = {
        date: new Date(),
        user_id: userId,
        deliveryDetails: {
          address: orderData.address,
          mobile: orderData.mobile,
        },
        orderedItems: userCart.items,
        totalAmount,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus,
        orderStatus: 'placed',
      };
      const order = new Order(orderObj);
      await order.save();
      const insertedOrder = await Order.findById(order._id).exec();
      if (!insertedOrder)
        return Promise.reject({
          status: 500,
          data: {
            message: 'something went wrong, please try again later',
          },
        });
      await Cart.findOneAndDelete({ user_id: userId });
      return Promise.resolve({ status: 201, data: insertedOrder });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  updateOrderStatus: async (
    orderId: string,
    detailsToUpdate: {
      orderStatus: string;
    },
  ) => {
    try {
      const order = await Order.findOne({ _id: orderId });
      if (!order) return Promise.reject({ status: 404, data: { message: 'order is empty' } });
      await Order.updateOne({ _id: orderId }, detailsToUpdate);
      const updatedOrder = await Order.findById(orderId).exec();
      if (!updatedOrder)
        return Promise.reject({
          status: 500,
          data: {
            message: 'something went wrong, please try again later',
          },
        });
      return Promise.resolve({ status: 200, data: { message: 'order updated' } });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  getUserOrders: async (userId: string, sortOrder: ParsedQs[string]) => {
    try {
      const orders = await Order.find({ user_id: userId }).sort({
        date: sortOrder === 'desc' ? 'desc' : 'asc',
      });
      if (!orders)
        return Promise.reject({ status: 404, data: { message: 'order list not found' } });
      if (!orders.length) return Promise.resolve({ status: 200, data: [] });
      const ordersWithProductDetails = await Promise.all(
        orders.map(async (order) => {
          return await Order.aggregate([
            {
              $match: {
                _id: new Types.ObjectId(order._id),
              },
            },
            {
              $unwind: '$orderedItems',
            },
            {
              $project: {
                date: '$date',
                user_id: '$user_id',
                deliveryDetails: '$deliveryDetails',
                product_id: '$orderedItems.product_id',
                quantity: '$orderedItems.quantity',
                color: '$orderedItems.color',
                size: '$orderedItems.size',
                item_id: '$orderedItems._id',
                totalAmount: '$totalAmount',
                paymentMethod: '$paymentMethod',
                paymentStatus: '$paymentStatus',
                orderStatus: '$orderStatus',
              },
            },
            {
              $lookup: {
                from: 'products',
                localField: 'product_id',
                foreignField: '_id',
                as: 'items',
              },
            },
            {
              $addFields: {
                image: {
                  $arrayElemAt: [
                    {
                      $arrayElemAt: ['$items.images', 0],
                    },
                    0,
                  ],
                },
              },
            },
            {
              $unset: [
                'color._id',
                'items.colors',
                'items.sizes',
                'items.images',
                'items._id',
                'items.category',
                'items.highlights',
                'items.description',
                'items.details',
                'items.suitableFor',
              ],
            },
            {
              $addFields: {
                items: {
                  _id: '$item_id',
                  product_id: '$product_id',
                  color: '$color',
                  size: '$size',
                  image: '$image',
                  quantity: '$quantity',
                },
              },
            },
            {
              $group: {
                _id: '$_id',
                date: {
                  $first: '$date',
                },
                user_id: {
                  $first: '$user_id',
                },
                deliveryDetails: {
                  $first: '$deliveryDetails',
                },
                orderedItems: {
                  $push: {
                    $arrayElemAt: ['$items', 0],
                  },
                },
                totalAmount: {
                  $first: '$totalAmount',
                },
                paymentMethod: {
                  $first: '$paymentMethod',
                },
                paymentStatus: {
                  $first: '$paymentStatus',
                },
                orderStatus: {
                  $first: '$orderStatus',
                },
              },
            },
          ]).then((res) => res[0]);
        }),
      );
      return Promise.resolve({
        status: 200,
        data: ordersWithProductDetails,
      });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  // getOrderProducts: async (orderId: string) => {
  //   try {
  //     const userOrder = await Order.findOne({ _id: orderId });
  //     if (!userOrder) return Promise.reject({ status: 200, data: { message: 'order not found' } });
  //     const order = await Order.aggregate([
  //       {
  //         $match: {
  //           _id: new Types.ObjectId(orderId),
  //         },
  //       },
  //       {
  //         $unwind: '$orderedItems',
  //       },
  //       {
  //         $project: {
  //           user_id: '$user_id',
  //           product_id: '$orderedItems.product_id',
  //           quantity: '$orderedItems.quantity',
  //           color: '$orderedItems.color',
  //           size: '$orderedItems.size',
  //           item_id: '$orderedItems._id',
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'products',
  //           localField: 'product_id',
  //           foreignField: '_id',
  //           as: 'items',
  //         },
  //       },
  //       {
  //         $addFields: {
  //           image: {
  //             $arrayElemAt: [
  //               {
  //                 $arrayElemAt: ['$items.images', 0],
  //               },
  //               0,
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $unset: ['color._id', 'items.colors', 'items.sizes', 'items.images', 'items._id'],
  //       },
  //       {
  //         $addFields: {
  //           items: {
  //             _id: '$item_id',
  //             product_id: '$product_id',
  //             color: '$color',
  //             size: '$size',
  //             image: '$image',
  //             quantity: '$quantity',
  //           },
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$_id',
  //           user_id: {
  //             $first: '$user_id',
  //           },
  //           orderedItems: {
  //             $push: {
  //               $arrayElemAt: ['$items', 0],
  //             },
  //           },
  //         },
  //       },
  //     ]);
  //     return Promise.resolve({
  //       status: 200,
  //       data: order[0].orderedItems,
  //     });
  //   } catch (error) {
  //     return Promise.reject({ status: 500, data: error });
  //   }
  // },
  getAllOrders: async (sortOrder: ParsedQs[string]) => {
    try {
      const orders = await Order.find().sort({ date: sortOrder === 'desc' ? 'desc' : 'asc' });
      if (!orders)
        return Promise.reject({ status: 404, data: { message: 'order list not found' } });
      if (!orders.length) return Promise.resolve({ status: 200, data: [] });
      const ordersWithProductDetails = await Promise.all(
        orders.map(async (order) => {
          return await Order.aggregate([
            {
              $match: {
                _id: new Types.ObjectId(order._id),
              },
            },
            {
              $unwind: '$orderedItems',
            },
            {
              $project: {
                date: '$date',
                user_id: '$user_id',
                deliveryDetails: '$deliveryDetails',
                product_id: '$orderedItems.product_id',
                quantity: '$orderedItems.quantity',
                color: '$orderedItems.color',
                size: '$orderedItems.size',
                item_id: '$orderedItems._id',
                totalAmount: '$totalAmount',
                paymentMethod: '$paymentMethod',
                paymentStatus: '$paymentStatus',
                orderStatus: '$orderStatus',
              },
            },
            {
              $lookup: {
                from: 'products',
                localField: 'product_id',
                foreignField: '_id',
                as: 'items',
              },
            },
            {
              $addFields: {
                image: {
                  $arrayElemAt: [
                    {
                      $arrayElemAt: ['$items.images', 0],
                    },
                    0,
                  ],
                },
              },
            },
            {
              $unset: [
                'color._id',
                'items.colors',
                'items.sizes',
                'items.images',
                'items._id',
                'items.category',
                'items.highlights',
                'items.description',
                'items.details',
                'items.suitableFor',
              ],
            },
            {
              $addFields: {
                items: {
                  _id: '$item_id',
                  product_id: '$product_id',
                  color: '$color',
                  size: '$size',
                  image: '$image',
                  quantity: '$quantity',
                },
              },
            },
            {
              $group: {
                _id: '$_id',
                date: {
                  $first: '$date',
                },
                user_id: {
                  $first: '$user_id',
                },
                deliveryDetails: {
                  $first: '$deliveryDetails',
                },
                orderedItems: {
                  $push: {
                    $arrayElemAt: ['$items', 0],
                  },
                },
                totalAmount: {
                  $first: '$totalAmount',
                },
                paymentMethod: {
                  $first: '$paymentMethod',
                },
                paymentStatus: {
                  $first: '$paymentStatus',
                },
                orderStatus: {
                  $first: '$orderStatus',
                },
              },
            },
          ]).then((res) => res[0]);
        }),
      );
      return Promise.resolve({
        status: 200,
        data: ordersWithProductDetails,
      });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
};

export default orderHelpers;
