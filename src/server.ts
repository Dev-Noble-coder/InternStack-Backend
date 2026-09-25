import http from "node:http";
import dns from "node:dns";
import { config } from "./config";
async function start(): Promise<void> {
  const servers = config.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers?.length) dns.setServers(servers);
  const [{ createApp }, { connectDatabase, disconnectDatabase }, extractionQueue, submissionSocket, { logger }] = await Promise.all([
    import("./app.js"),
    import("./db.js"),
    import("./services/extractionQueue.js"),
    import("./services/submissionSocket.js"),
    import("./logging/logger.js"),
  ]);
  await connectDatabase();
  await extractionQueue.initializeExtractionQueue();
  const server = http.createServer(createApp());
  const socketServer = submissionSocket.createSubmissionSocketServer();
  server.on("upgrade", (request, socket, head) => {
    if (request.url?.split("?")[0] !== "/ws") {
      socket.destroy();
      return;
    }
    submissionSocket.upgradeSubmissionSocket(socketServer, request, socket, head);
  });
  extractionQueue.startExtractionWorker(submissionSocket.publishSubmissionEvent);
  server.listen(config.PORT, () => logger.info(`InternStack API listening on ${config.PORT}`));
  const shutdown = async () => {
    server.close();
    await submissionSocket.closeSubmissionSocketServer(socketServer);
    await extractionQueue.closeExtractionQueue();
    await disconnectDatabase();
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch((error) => {
  console.error("InternStack API failed to start", error);
  process.exit(1);
});
