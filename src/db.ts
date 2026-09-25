import dns from "node:dns";
import mongoose from "mongoose";
import { config } from "./config";
export const connectDatabase = () => {
  const servers = config.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers?.length) dns.setServers(servers);
  return mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: config.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  });
};
export const disconnectDatabase = () => mongoose.disconnect();
