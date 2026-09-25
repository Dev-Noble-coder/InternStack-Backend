import { IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import Redis from "ioredis";
import { config } from "../config";
import { User } from "../models";
import { verifyAccessToken } from "./tokens";
import { SubmissionEvent } from "./extractionQueue";
import { createUrlSubmission, getSubmissionSnapshot } from "./submissionService";

type Client = { socket: WebSocket; userId: string; lastActivity: number; subscriptions: Set<string> };
const clients = new Set<Client>();
let publisher: Redis | undefined;
let subscriber: Redis | undefined;

export function createSubmissionSocketServer() {
  const server = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  server.on("connection", (socket, request) => void handleConnection(socket, request));
  if (config.REDIS_URL) {
    publisher = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    subscriber = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    void subscriber.subscribe("internstack:submission-events");
    subscriber.on("message", (_channel, payload) => broadcast(JSON.parse(payload) as SubmissionEvent));
  }
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (Date.now() - client.lastActivity > config.WS_IDLE_TIMEOUT_MS && client.subscriptions.size === 0) {
        client.socket.close(1000, "Idle timeout");
        continue;
      }
      if (client.socket.readyState === WebSocket.OPEN) client.socket.ping();
    }
  }, config.WS_HEARTBEAT_INTERVAL_MS);
  server.on("close", () => clearInterval(heartbeat));
  return server;
}

export function upgradeSubmissionSocket(server: WebSocketServer, request: IncomingMessage, socket: import("node:stream").Duplex, head: Buffer) {
  const origin = request.headers.origin;
  if (origin && !config.CLIENT_URLS.includes(origin)) {
    socket.destroy();
    return;
  }
  server.handleUpgrade(request, socket, head, (client) => server.emit("connection", client, request));
}

async function handleConnection(socket: WebSocket, request: IncomingMessage) {
  const pending: Array<Buffer> = [];
  let authenticated = false;
  let processMessage: ((raw: Buffer) => Promise<void>) | undefined;
  socket.on("message", (raw) => {
    const message = Buffer.from(raw as Buffer);
    if (!authenticated) pending.push(message);
    else void processMessage?.(message);
  });
  const userId = await authenticateSocket(request);
  if (!userId) {
    socket.close(1008, "Authentication required");
    return;
  }
  const client: Client = { socket, userId, lastActivity: Date.now(), subscriptions: new Set() };
  clients.add(client);
  const maxLifetime = setTimeout(() => socket.close(1000, "Connection renewal required"), config.WS_MAX_CONNECTION_MS);
  socket.on("pong", () => { client.lastActivity = Date.now(); });
  processMessage = async (raw: Buffer) => {
    client.lastActivity = Date.now();
    try {
      const message = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (message.type === "submit_opportunity") {
        const result = await createUrlSubmission({
          userId,
          sourceUrl: String(message.url ?? ""),
          idempotencyKey: message.idempotencyKey ? String(message.idempotencyKey) : undefined,
        });
        client.subscriptions.add(result.submissionId);
        send(socket, { type: "submission_accepted", requestId: message.requestId, ...result });
      } else if (message.type === "subscribe_submission") {
        const id = String(message.submissionId ?? "");
        client.subscriptions.add(id);
        send(socket, await getSubmissionSnapshot(id, userId));
      } else {
        send(socket, { type: "error", message: "Unsupported message type" });
      }
    } catch (error) {
      send(socket, { type: "error", message: error instanceof Error ? error.message : "Invalid message" });
    }
  };
  authenticated = true;
  for (const raw of pending) await processMessage(raw);
  socket.on("close", () => { clearTimeout(maxLifetime); clients.delete(client); });
}

async function authenticateSocket(request: IncomingMessage) {
  const cookies = request.headers.cookie?.split(";").map((value) => value.trim()) ?? [];
  const token = cookies.find((value) => value.startsWith(`${config.ACCESS_COOKIE_NAME}=`))?.split("=").slice(1).join("=");
  if (!token) return null;
  try {
    const identity = verifyAccessToken(token);
    const user = await User.findById(identity.userId).select("status").lean();
    return user?.status === "active" ? identity.userId : null;
  } catch { return null; }
}

export async function publishSubmissionEvent(event: SubmissionEvent) {
  if (publisher) await publisher.publish("internstack:submission-events", JSON.stringify(event));
  else broadcast(event);
}

function broadcast(event: SubmissionEvent) {
  for (const client of clients) {
    if (!client.subscriptions.has(event.submissionId) || client.socket.readyState !== WebSocket.OPEN) continue;
    send(client.socket, event);
  }
}

function send(socket: WebSocket, value: unknown) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}

export async function closeSubmissionSocketServer(server: WebSocketServer) {
  for (const client of clients) client.socket.close(1012, "Server restarting");
  server.close();
  await subscriber?.quit();
  await publisher?.quit();
  subscriber = undefined;
  publisher = undefined;
}
