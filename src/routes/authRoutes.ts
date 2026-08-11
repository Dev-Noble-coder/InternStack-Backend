import { Router, Request } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/auth';
import { validate, schemas } from '../validation';
import { RateLimiter } from '../services/rateLimiter';
import { rateLimit, authenticate } from '../middleware/auth';

export function createAuthRouter(controller: AuthController, limiter: RateLimiter): Router {
  const router = Router();
  const ip = (request: Request) => `ip:${request.ip}`;
  const account = (request: Request) => `account:${String(request.body.email || '').trim().toLowerCase()}`;
  const limited = (key: (request: Request) => string, count: number, windowMs: number) => rateLimit(limiter, key, count, windowMs);

  router.post('/register', limited(ip, 5, 60 * 60 * 1000), validate(schemas.register), controller.register);
  router.post('/verify-email', limited(account, 5, 10 * 60 * 1000), validate(schemas.emailCode), controller.verifyEmail);
  router.post('/resend-verification', limited(account, 3, 15 * 60 * 1000), validate(schemas.email), controller.resendVerification);
  router.post('/login', limited(ip, 20, 15 * 60 * 1000), validate(schemas.login), controller.login);
  router.post('/refresh', controller.refresh);
  router.get('/me', authenticate, controller.me);
  router.post('/logout', controller.logout);
  router.post('/forgot-password', limited(account, 3, 15 * 60 * 1000), validate(schemas.email), controller.forgotPassword);
  router.post('/verify-password-reset', limited(account, 5, 10 * 60 * 1000), validate(schemas.emailCode), controller.verifyPasswordReset);
  router.post('/reset-password', limited(account, 5, 15 * 60 * 1000), validate(schemas.reset), controller.resetPassword);
  return router;
}