import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./db";
import { config } from "./config";
import { logger } from "./logging/logger";

async function start(): Promise<void> {
  await connectDatabase();
  const server = createApp().listen(config.PORT, () => logger.info(`InternStack API listening on ${config.PORT}`));
  const shutdown = async () => { server.close(); await disconnectDatabase(); process.exit(0); };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch((error) => { logger.error("InternStack API failed to start", error); process.exit(1); });