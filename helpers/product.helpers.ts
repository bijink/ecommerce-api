import { ParsedQs } from 'qs';
import { Product } from '../models';
import { Product as ProductType } from '../types/global.type';

const productHelpers = {
  addProduct: async (reqData: ProductType) => {
    try {
      const product = new Product(reqData);
      await product.save();
      const insertedProduct = await Product.findById(product._id).exec();
      return Promise.resolve({ status: 201, data: { product: insertedProduct } });
    } catch (error) {
      return Promise.reject({ status: 400, data: error });
    }
  },
  getAllProducts: async (
    sortOrder: ParsedQs[string],
    skip: ParsedQs[string],
    limit: ParsedQs[string],
  ) => {
    try {
      const products = await Product.find({})
        .sort({ _id: sortOrder === 'desc' ? 'desc' : 'asc' })
        .skip(parseInt(skip as string))
        .limit(parseInt(limit as string));
      const productLength = await Product.countDocuments();
      return Promise.resolve({ status: 200, data: { products, length: productLength } });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  getProduct: async (prodId: ParsedQs[string]) => {
    try {
      const product = await Product.findById(prodId).exec();
      if (!product) return Promise.reject({ status: 404, data: { message: 'product not found' } });
      return Promise.resolve({ status: 200, data: product });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
  deleteProduct: async (prodId: string) => {
    try {
      const product = await Product.findOne({ _id: prodId });
      if (!product) return Promise.reject({ status: 404, data: { message: 'product not found' } });
      const deletedProduct = await Product.findByIdAndDelete(prodId);
      if (!deletedProduct)
        return Promise.reject({
          status: 500,
          data: { message: 'something went wrong, please try again later' },
        });
      return Promise.resolve({
        status: 200,
        data: { message: 'product deleted successfully', deletedProduct },
      });
    } catch (error) {
      return Promise.reject({ status: 500, data: { error } });
    }
  },
  updateProduct: async (routeMethod: string, prodId: string, detailsToUpdate: ProductType) => {
    try {
      const product = await Product.findOne({ _id: prodId });
      if (!product) return Promise.reject({ status: 404, data: { message: 'product not found' } });
      if (routeMethod === 'put') {
        // Replace the entire document
        await Product.replaceOne({ _id: prodId }, detailsToUpdate, {
          runValidators: true,
        });
      } else if (routeMethod === 'patch') {
        // Update only the provided fields
        await Product.updateOne(
          { _id: prodId },
          { $set: detailsToUpdate }, // Only update specified fields
          {
            runValidators: true, // Validate updated fields
          },
        );
      }
      const updatedProduct = await Product.findById(prodId).exec();
      if (!updatedProduct)
        return Promise.reject({
          status: 500,
          data: { message: 'something went wrong, please try again later' },
        });
      return Promise.resolve({ status: 200, data: { product: updatedProduct } });
    } catch (error) {
      return Promise.reject({ status: 500, data: error });
    }
  },
};

export default productHelpers;
