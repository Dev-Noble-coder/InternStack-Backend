import mongoose from "mongoose";
import { config } from "./config";
export const connectDatabase = () =>
  mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: config.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  });
export const disconnectDatabase = () => mongoose.disconnect();
