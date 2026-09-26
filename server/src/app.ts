import express from 'express';
import cors from 'cors';
import { authRoutes } from './modules/auth/authRoutes.js';
import { productRoutes } from './modules/products/productRoutes.js';
import { reportRoutes } from './modules/reports/reportRoutes.js';
import { categoryRoutes } from './modules/categories/categoryRoutes.js';
import { userRoutes } from './modules/users/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use(errorHandler);
