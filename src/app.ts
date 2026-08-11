import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { AuthService } from './services/auth';
import { AuthCodeService } from './services/authCodes';
import { createEmailService, EmailService } from './services/email';
import { TokenService } from './services/tokens';
import { AuthController } from './controllers/authController';
import { createAuthRouter } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter, rateLimit } from './middleware/auth';
import { AppError } from './errors';

export function createApp(emailService: EmailService = createEmailService()) {
  const app = express();
  const authService = new AuthService(new AuthCodeService(), new TokenService(), emailService);
  const controller = new AuthController(authService);

  app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(rateLimit(globalLimiter, request => `global:${request.ip}`, config.GLOBAL_RATE_LIMIT, 60_000));
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter(controller, globalLimiter));
  app.use((_request, _response, next) => next(new AppError(404, 'Route not found', 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
}