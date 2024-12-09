import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { orderHelpers, productHelpers } from '../helpers';
import { validateRequest } from '../utils/middlewares';
import { productAddSchema } from '../utils/validationSchemas';

const router = Router();

router.post('/add-product', validateRequest(checkSchema(productAddSchema)), (request, response) => {
  productHelpers
    .addProduct(request.body)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.delete('/delete-product/:id', (request, response) => {
  const prodId = request.params.id;
  productHelpers
    .deleteProduct(prodId)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.patch('/edit-product/:id', (request, response) => {
  const prodId = request.params.id;
  productHelpers
    .updateProduct(prodId, request.body)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.get('/get-all-orders', (request, response) => {
  const { sort } = request.query;
  orderHelpers
    .getAllOrders(sort)
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
router.patch('/change-order-status/:orderId', (request, response) => {
  const { orderId } = request.params;
  const { status } = request.body;
  orderHelpers
    .updateOrderStatus(orderId, { orderStatus: status })
    .then((res) => {
      response.status(res.status).send(res.data);
    })
    .catch((err) => {
      response.status(err.status).send(err.data);
    });
});
// router.get('/all-users', verifyLogin, async (req, res) => {
//   const admin = req.session.admin;
//   const usersList = await adminHelpers.getUsersList();
//   res.render('admin/view-users', { admin, users: usersList });
// });

export default router;
