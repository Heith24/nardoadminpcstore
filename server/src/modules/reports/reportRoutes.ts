import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { productRepository } from '../products/repositories/productRepository.js';

export const reportRoutes = Router();
reportRoutes.get('/inventory', requireAuth, asyncHandler(async (_request, response) => {
  const products = await productRepository.findAll();
  const categoryStock = products.reduce<Record<string, number>>((summary, product) => ({ ...summary, [product.category]: (summary[product.category] ?? 0) + product.stock }), {});
  response.json({ generatedAt: new Date().toISOString(), totalProducts: products.length, activeProducts: products.filter((product) => product.status === 'active').length, totalStock: products.reduce((sum, product) => sum + product.stock, 0), inventoryValue: products.reduce((sum, product) => sum + product.stock * product.price, 0), byCategory: Object.entries(categoryStock).map(([category, stock]) => ({ category, stock })) });
}));
