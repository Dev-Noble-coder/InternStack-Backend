import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { badRequest } from './errors';

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8).max(128);
export const schemas = {
  register: z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email, password, role: z.string().optional() }),
  email: z.object({ email }), emailCode: z.object({ email, code: z.string().regex(/^\d{6}$/) }), login: z.object({ email, password: z.string().min(1) }), reset: z.object({ email, code: z.string().regex(/^\d{6}$/), password }),
};
export const validate = (schema: z.ZodType) => (request: Request, _response: Response, next: NextFunction) => { const result = schema.safeParse(request.body); if (!result.success) return next(badRequest('Invalid request body')); request.body = result.data; next(); };