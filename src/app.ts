import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import dns from "dns";
import { config } from "./config";
import { AuthService } from "./services/auth";
import { AuthCodeService } from "./services/authCodes";
import { createEmailService, EmailService } from "./services/email";
import { TokenService } from "./services/tokens";
import { AuthController } from "./controllers/authController";
import { createAuthRouter } from "./routes/authRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter, rateLimit } from "./middleware/auth";
import { AppError } from "./errors";
import { requestLogger } from "./logging/requestLogger";
import { createLogRouter } from "./routes/logRoutes";
import { csrfProtection, issueCsrfToken } from "./middleware/csrf";
import { requestTimeout } from "./middleware/requestTimeout";
import mongoose from "mongoose";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export function createApp(emailService: EmailService = createEmailService()) {
  const app = express();
  if (config.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(helmet());
  app.get("/logo.png", (_request, response) => {
    response.sendFile(path.join(process.cwd(), "logo.png"));
  });
  app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(requestTimeout);
  app.get("/api/auth/csrf", issueCsrfToken);
  app.use(csrfProtection);
  app.use(requestLogger);
  app.use(rateLimit(globalLimiter, (request) => `global:${request.ip}`, config.GLOBAL_RATE_LIMIT, config.GLOBAL_RATE_LIMIT_WINDOW_MS));
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/ready", (_request, response) => {
    const ready = mongoose.connection.readyState === 1;
    response.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
  });
  const authService = new AuthService(new AuthCodeService(), new TokenService(), emailService);
  const controller = new AuthController(authService);
  app.use("/api/auth", createAuthRouter(controller, globalLimiter));
  app.use("/api/logs", createLogRouter());
  app.use((_request, _response, next) => next(new AppError(404, "Route not found", "NOT_FOUND")));
  app.use(errorHandler);
  return app;
}