import { Router } from 'express';
import { authenticateJwtToken, authenticateUserRole } from '../utils/middlewares';
import AdminRoutes from './admin.routes';
import AuthRoutes from './auth.routes';
import CustomerRoutes from './customer.routes';
import UserRoutes from './user.routes';

const router = Router();

// #welcome route
router.get('/', (request, response) => {
  response.send(`
    Welcome to API service of "Shopping Bazaar" e-commerce web application. 
    To visit the application click <a href="${process.env.CORS_ORIGIN_URL}">${process.env.CORS_ORIGIN_URL?.replace(/^https?:\/\//, '')}</a>.
    `);
});

// #other routes
router.use('/auth', AuthRoutes);
router.use('/user', UserRoutes);
router.use('/admin', authenticateJwtToken, authenticateUserRole('admin'), AdminRoutes);
router.use('/customer', authenticateJwtToken, authenticateUserRole('customer'), CustomerRoutes);

export default router;
