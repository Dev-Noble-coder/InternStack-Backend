import { createApp } from "./app";
import { connectDatabase } from "./db";
import { config } from "./config";
import { logger } from "./logging/logger";

async function start(): Promise<void> {
  await connectDatabase();
  createApp().listen(config.PORT, () =>
    logger.info(`InternStack API listening on ${config.PORT}`),
  );
}
start().catch((error) => {
  logger.error("InternStack API failed to start", error);
  process.exit(1);
});
