import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { userRepository } from '../auth/repositories/userRepository.js';

const userSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().email().max(255).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'superadmin']),
  imageData: z.string().max(7_000_000).regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]*={0,2}$/i).nullable().optional()
});

export const userRoutes = Router();
userRoutes.use(requireAuth);
userRoutes.get('/', asyncHandler(async (_request, response) => response.json(await userRepository.findAll())));
userRoutes.get('/:id/image', asyncHandler(async (request, response) => {
  const parsedId = z.string().uuid().safeParse(request.params.id);
  if (!parsedId.success) return response.status(400).json({ message: 'Invalid user id' });
  const image = await userRepository.findImageById(parsedId.data);
  if (!image) return response.status(404).json({ message: 'User image not found' });
  response.setHeader('Content-Type', image.contentType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return response.send(image.data);
}));
userRoutes.post('/', asyncHandler(async (request: AuthRequest, response) => {
  const parsed = userSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Invalid staff data' });
  const actor = await userRepository.findById(request.userId!);
  if (actor?.role !== 'superadmin') return response.status(403).json({ message: 'Only a superadmin can add staff' });
  if (await userRepository.findByEmail(parsed.data.email)) return response.status(409).json({ message: 'A user with this email already exists' });
  const { password, ...input } = parsed.data;
  const user = await userRepository.create({ ...input, passwordHash: await bcrypt.hash(password, 12) });
  return response.status(201).json(user);
}));