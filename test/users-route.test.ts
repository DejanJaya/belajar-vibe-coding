import { describe, expect, it, beforeAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users } from "../src/db/schema";
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
