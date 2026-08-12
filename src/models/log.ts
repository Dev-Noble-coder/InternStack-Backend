import { Schema, model } from "mongoose";

export type LogLevel = "info" | "warn" | "error";

const LogSchema = new Schema(
  {
    level: {
      type: String,
      enum: ["info", "warn", "error"],
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    errorName: String,
    errorCode: String,
    stack: String,
    request: {
      method: String,
      path: String,
      statusCode: Number,
      ip: String,
      userAgent: String,
      durationMs: Number,
    },
    context: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

LogSchema.index({ createdAt: -1 });
LogSchema.index({ "request.statusCode": 1, createdAt: -1 });

export const Log = model("Log", LogSchema);
