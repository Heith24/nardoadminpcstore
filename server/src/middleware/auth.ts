import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AuthRequest = Request & { userId?: string };
export function requireAuth(request: AuthRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ message: 'Authentication required' });
  try { request.userId = (jwt.verify(token, env.jwtSecret) as { sub: string }).sub; next(); }
  catch { return response.status(401).json({ message: 'Invalid or expired token' }); }
}
