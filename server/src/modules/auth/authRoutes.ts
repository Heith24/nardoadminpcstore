import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { userRepository } from './repositories/userRepository.js';

export const authRoutes = Router();
authRoutes.post('/login', asyncHandler(async (request, response) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Valid email and password are required' });
  const user = await userRepository.findByEmail(parsed.data.email);
  if (!user?.passwordHash || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return response.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({}, env.jwtSecret, { subject: user.id, expiresIn: '8h' });
  return response.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, imageUrl: user.imageUrl } });
}));
authRoutes.get('/me', requireAuth, asyncHandler(async (request: AuthRequest, response) => {
  const user = await userRepository.findById(request.userId!);
  return user ? response.json(user) : response.status(401).json({ message: 'User no longer exists' });
}));
