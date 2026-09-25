import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app";
import { MemoryEmailService } from "../src/services/email";
import { globalLimiter } from "../src/middleware/auth";
import { AuthCode, User } from "../src/models";
import { hashPassword } from "../src/utils";

jest.setTimeout(120_000);

let mongo: MongoMemoryServer | undefined;

const makeUser = (
  email: string,
  password = "correct horse battery staple",
) => ({
  firstName: "Ada",
  lastName: "Lovelace",
  email,
  password,
});

async function createCsrfAgent(app: ReturnType<typeof createApp>) {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf").expect(200);
  return { agent, csrfToken: csrf.body.csrfToken as string };
}

async function registerAndVerify(
  app: ReturnType<typeof createApp>,
  mail: MemoryEmailService,
  user: ReturnType<typeof makeUser>,
) {
  const { agent, csrfToken } = await createCsrfAgent(app);
  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrfToken)
    .send(user)
    .expect(201);
  const code = mail.sent
    .filter((email) => email.purpose === "email_verification")
    .at(-1)?.code;
  await agent
    .post("/api/auth/verify-email")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, code })
    .expect(200);
  return { agent, csrfToken };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1)
    await mongoose.connection.db?.dropDatabase();
  globalLimiter.reset();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("registration is student-only and rejects admin or arbitrary roles", async () => {
  const mail = new MemoryEmailService();
  const app = createApp(mail);
  const student = await createCsrfAgent(app);
  const studentResponse = await student.agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", student.csrfToken)
    .send({ ...makeUser("student@example.com"), role: "student" })
    .expect(201);
  expect(studentResponse.body.user.role).toBe("student");
  expect(studentResponse.body.user.passwordHash).toBeUndefined();

  const suppliedAdmin = await createCsrfAgent(app);
  await suppliedAdmin.agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", suppliedAdmin.csrfToken)
    .send({ ...makeUser("admin@example.com"), role: "admin" })
    .expect(400);

  const invalid = await createCsrfAgent(app);
  await invalid.agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", invalid.csrfToken)
    .send({ ...makeUser("invalid@example.com"), role: "superadmin" })
    .expect(400);

  const withoutRole = await createCsrfAgent(app);
  const defaultResponse = await withoutRole.agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", withoutRole.csrfToken)
    .send(makeUser("default@example.com"))
    .expect(201);
  expect(defaultResponse.body.user.role).toBe("student");
});

test("validation errors identify invalid, missing, and unknown fields", async () => {
  const app = createApp(new MemoryEmailService());
  const { agent, csrfToken } = await createCsrfAgent(app);
  const response = await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: "not-an-email", password: "short", nickname: "extra" })
    .expect(400);

  expect(response.body.error).toMatchObject({
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
  });
  expect(response.body.error.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "firstName" }),
      expect.objectContaining({ path: "lastName" }),
      expect.objectContaining({ path: "email" }),
      expect.objectContaining({ path: "password" }),
      expect.objectContaining({ path: "nickname" }),
    ]),
  );
});

test("verifies, logs in with cookies, reads me, rotates refresh, and logs out", async () => {
  const mail = new MemoryEmailService();
  const app = createApp(mail);
  const user = makeUser("Ada@example.com");
  const { agent, csrfToken } = await registerAndVerify(app, mail, user);
  const login = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, password: user.password })
    .expect(200);
  expect(login.body.access).toBeUndefined();
  expect(String(login.headers["set-cookie"])).toContain("HttpOnly");
  await agent.get("/api/auth/me").expect(200);
  await agent
    .post("/api/auth/refresh")
    .set("X-CSRF-Token", csrfToken)
    .expect(200);
  await agent
    .post("/api/auth/logout")
    .set("X-CSRF-Token", csrfToken)
    .expect(200);
  await agent
    .post("/api/auth/refresh")
    .set("X-CSRF-Token", csrfToken)
    .expect(401);
});

test("completes the existing password reset sequence and revokes sessions", async () => {
  const mail = new MemoryEmailService();
  const app = createApp(mail);
  const user = makeUser("reset@example.com");
  const { agent, csrfToken } = await registerAndVerify(app, mail, user);
  await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send(user)
    .expect(200);
  await agent
    .post("/api/auth/forgot-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email })
    .expect(200);
  const code = mail.sent.find(
    (email) => email.purpose === "password_reset",
  )?.code;
  await agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, code, password: "new password 123" })
    .expect(200);
  await agent
    .post("/api/auth/refresh")
    .set("X-CSRF-Token", csrfToken)
    .expect(401);

  const next = await createCsrfAgent(app);
  await next.agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", next.csrfToken)
    .send({ email: user.email, password: "new password 123" })
    .expect(200);
  await next.agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", next.csrfToken)
    .send({ email: user.email, code, password: "another password 123" })
    .expect(400);
});

test("rejects expired and exhausted reset codes", async () => {
  const mail = new MemoryEmailService();
  const app = createApp(mail);
  const user = makeUser("codes@example.com");
  const { agent, csrfToken } = await registerAndVerify(app, mail, user);
  await agent
    .post("/api/auth/forgot-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email })
    .expect(200);
  const resetCode = mail.sent.find(
    (email) => email.purpose === "password_reset",
  )?.code as string;
  await AuthCode.updateOne(
    { purpose: "password_reset" },
    { $set: { expiresAt: new Date(Date.now() - 1) } },
  );
  await agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, code: resetCode, password: "new password 123" })
    .expect(400);

  await agent
    .post("/api/auth/forgot-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email })
    .expect(200);
  const currentCode = mail.sent
    .filter((email) => email.purpose === "password_reset")
    .at(-1)?.code as string;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await agent
      .post("/api/auth/reset-password")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: user.email, code: "000000", password: "new password 123" })
      .expect(400);
  }
  await agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", csrfToken)
    .send({
      email: user.email,
      code: currentCode,
      password: "new password 123",
    })
    .expect(429);
});

test("uses current database status and role for authorization", async () => {
  const mail = new MemoryEmailService();
  const app = createApp(mail);
  const studentUser = makeUser("current-student@example.com");
  const student = await registerAndVerify(app, mail, studentUser);
  await student.agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", student.csrfToken)
    .send(studentUser)
    .expect(200);
  await student.agent.get("/api/logs").expect(403);

  await User.updateOne(
    { email: studentUser.email },
    { $set: { role: "admin" } },
  );
  await student.agent.get("/api/logs").expect(200);
  await User.updateOne(
    { email: studentUser.email },
    { $set: { status: "suspended" } },
  );
  await student.agent.get("/api/logs").expect(403);

  const adminUser = makeUser("current-admin@example.com");
  await User.create({
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    email: adminUser.email,
    passwordHash: await hashPassword(adminUser.password),
    role: "admin",
    emailVerified: true,
  });
  const admin = await createCsrfAgent(app);
  await admin.agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", admin.csrfToken)
    .send(adminUser)
    .expect(200);
  await admin.agent.get("/api/logs").expect(200);
  await User.updateOne(
    { email: adminUser.email },
    { $set: { role: "student", status: "active" } },
  );
  await admin.agent.get("/api/logs").expect(403);
  await User.updateOne(
    { email: adminUser.email },
    { $set: { status: "deactivated" } },
  );
  await admin.agent.get("/api/auth/me").expect(403);
});
