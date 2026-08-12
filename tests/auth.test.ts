import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app";
import { MemoryEmailService } from "../src/services/email";
import { globalLimiter } from "../src/middleware/auth";

let mongo: MongoMemoryServer;
let mail: MemoryEmailService;
const user = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "Ada@example.com",
  password: "correct horse battery staple",
};
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  globalLimiter.reset();
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
test("registers only students and does not expose secrets", async () => {
  mail = new MemoryEmailService();
  const response = await request(createApp(mail))
    .post("/api/auth/register")
    .send({ ...user, role: "admin" });
  expect(response.status).toBe(201);
  expect(response.body.user.role).toBe("student");
  expect(response.body.user.passwordHash).toBeUndefined();
  expect(mail.sent[0].email).toBe("ada@example.com");
});
test("verifies, logs in with cookies, reads me, and rotates refresh", async () => {
  mail = new MemoryEmailService();
  const app = createApp(mail);
  await request(app).post("/api/auth/register").send(user);
  await request(app)
    .post("/api/auth/verify-email")
    .send({ email: user.email, code: mail.sent[0].code })
    .expect(200);
  const agent = request.agent(app);
  const login = await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password })
    .expect(200);
  expect(login.body.access).toBeUndefined();
  expect(String(login.headers["set-cookie"])).toContain("HttpOnly");
  await agent.get("/api/auth/me").expect(200);
  await agent.post("/api/auth/refresh").expect(200);
});
