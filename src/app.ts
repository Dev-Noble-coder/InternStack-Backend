import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import dns from "dns";
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
dns.setServers(["8.8.8.8", "1.1.1.1"]);
export function createApp(emailService: EmailService = createEmailService()) {
  const app = express();
  const authService = new AuthService(
    new AuthCodeService(),
    new TokenService(),
    emailService,
  );
  const controller = new AuthController(authService);

  app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(
    rateLimit(
      globalLimiter,
      (request) => `global:${request.ip}`,
      config.GLOBAL_RATE_LIMIT,
      config.GLOBAL_RATE_LIMIT_WINDOW_MS,
    ),
  );
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.use("/api/auth", createAuthRouter(controller, globalLimiter));
  app.use("/api/logs", createLogRouter());
  app.use((_request, _response, next) =>
    next(new AppError(404, "Route not found", "NOT_FOUND")),
  );
  app.use(errorHandler);
  return app;
}
