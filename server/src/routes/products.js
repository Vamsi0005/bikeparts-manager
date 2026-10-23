import { Router } from 'express';
import { adjustStock, createProduct, getProduct, listProducts, productStats, updateProduct } from '../controllers/productsController.js';

const router = Router();
router.get('/', listProducts);
router.get('/stats', productStats);
router.post('/', createProduct);
router.get('/:id', getProduct);
router.patch('/:id', updateProduct);
router.patch('/:id/stock', adjustStock);
export default router;
