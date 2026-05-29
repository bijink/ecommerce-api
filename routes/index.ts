import { Router } from 'express';
import { authenticateJwtToken, authenticateUserRole } from '../utils/middlewares';
import AdminRoutes from './admin.routes';
import AuthRoutes from './auth.routes';
import CustomerRoutes from './customer.routes';
import UserRoutes from './user.routes';

const router = Router();

// #welcome route
router.get('/', (request, response) => {
  response.send('Welcome to e-commerce api service.');
});

// #other routes
router.use('/auth', AuthRoutes);
router.use('/user', UserRoutes);
router.use('/admin', authenticateJwtToken, authenticateUserRole('admin'), AdminRoutes);
router.use('/customer', authenticateJwtToken, authenticateUserRole('customer'), CustomerRoutes);

export default router;
