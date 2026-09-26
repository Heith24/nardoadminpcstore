import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { productRepository } from './repositories/productRepository.js';

const productSchema = z.object({ name: z.string().min(1), categoryId: z.number().int().positive(), price: z.number().nonnegative(), stock: z.number().int().nonnegative(), status: z.enum(['active', 'inactive']), imageData: z.string().max(7_000_000).regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]*={0,2}$/i).nullable().optional() });
export const productRoutes = Router();
productRoutes.use(requireAuth);
productRoutes.get('/', asyncHandler(async (_request, response) => response.json(await productRepository.findAll())));
productRoutes.get('/:id/image', asyncHandler(async (request, response) => {
	const parsedId = z.string().uuid().safeParse(request.params.id);
	if (!parsedId.success) return response.status(400).json({ message: 'Invalid product id' });
	const image = await productRepository.findImageById(parsedId.data);
	if (!image) return response.status(404).json({ message: 'Product image not found' });
	response.setHeader('Content-Type', image.contentType);
	response.setHeader('X-Content-Type-Options', 'nosniff');
	return response.send(image.data);
}));
productRoutes.get('/:id', asyncHandler(async (request, response) => {
	const parsedId = z.string().uuid().safeParse(request.params.id);
	if (!parsedId.success) return response.status(400).json({ message: 'Invalid product id' });
	const product = await productRepository.findById(parsedId.data);
	return product ? response.json(product) : response.status(404).json({ message: 'Product not found' });
}));
productRoutes.post('/', asyncHandler(async (request, response) => {
	const parsed = productSchema.safeParse(request.body);
	if (!parsed.success) return response.status(400).json({ message: 'Invalid product data' });
	return response.status(201).json(await productRepository.create(parsed.data));
}));
productRoutes.put('/:id', asyncHandler(async (request, response) => {
	const parsedId = z.string().uuid().safeParse(request.params.id);
	const parsed = productSchema.partial().safeParse(request.body);
	if (!parsedId.success) return response.status(400).json({ message: 'Invalid product id' });
	if (!parsed.success) return response.status(400).json({ message: 'Invalid product data' });
	const product = await productRepository.update(parsedId.data, parsed.data);
	return product ? response.json(product) : response.status(404).json({ message: 'Product not found' });
}));
productRoutes.delete('/:id', asyncHandler(async (request, response) => {
	const parsedId = z.string().uuid().safeParse(request.params.id);
	if (!parsedId.success) return response.status(400).json({ message: 'Invalid product id' });
	return await productRepository.remove(parsedId.data) ? response.status(204).send() : response.status(404).json({ message: 'Product not found' });
}));
