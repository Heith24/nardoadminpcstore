import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { categoryRepository } from './repositories/categoryRepository.js';

export const categoryRoutes = Router();
categoryRoutes.get('/', requireAuth, asyncHandler(async (_request, response) => response.json(await categoryRepository.findAll())));