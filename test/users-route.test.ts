import { describe, expect, it } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("POST /api/users", () => {
  const testEmail = `eko-${Date.now()}@localhost`;

  it("should successfully register a new user", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: testEmail,
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ data: "OK" });

    // Verify user in DB
    const [savedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail));

    expect(savedUser).toBeDefined();
    expect(savedUser.name).toBe("Eko");
    expect(savedUser.email).toBe(testEmail);
    // Password must be bcrypt hash
    expect(savedUser.password).not.toBe("rahasia");
    const isPasswordValid = await Bun.password.verify("rahasia", savedUser.password);
    expect(isPasswordValid).toBe(true);
  });

  it("should fail when email is already registered", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko Duplicate",
          email: testEmail,
          password: "rahasia-lain",
        }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Email sudah terdaftar" });
  });
});

describe("POST /api/users/login", () => {
  const loginEmail = `login-${Date.now()}@localhost`;
  const loginPassword = "password123";

  it("should successfully login and return a session token", async () => {
    // 1. Register user first
    const regRes = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Login User",
          email: loginEmail,
          password: loginPassword,
        }),
      })
    );
    expect(regRes.status).toBe(200);

    // 2. Login
    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })
    );

    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe("string");
    // Verify UUID format
    expect(body.data).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // 3. Verify session in DB
    const [savedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, body.data));

    expect(savedSession).toBeDefined();
    expect(savedSession.token).toBe(body.data);
  });

  it("should fail when email is not registered", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unknown-email@localhost",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Email atau password salah" });
  });

  it("should fail when password is wrong", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: "wrongpassword",
        }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Email atau password salah" });
  });
});
