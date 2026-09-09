import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { disconnectDatabase } from "../../src/database/prisma.js";
import { createTestApp, resetDatabase, type TestApp } from "../helpers/app.js";

let app: TestApp;

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await app.close();
  await disconnectDatabase();
});

const credentials = {
  name: "Aksh",
  email: "aksh@example.com",
  password: "password123"
};

describe("POST /api/v1/auth/register", () => {
  it("creates an account and never returns the hash", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: credentials
    });

    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("aksh@example.com");
    expect(res.payload).not.toContain("password");
  });

  it("lowercases and trims the email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { ...credentials, email: "  AKSH@Example.COM  " }
    });

    expect(res.json().data.user.email).toBe("aksh@example.com");
  });

  it("rejects a duplicate email with 409", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: credentials
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: credentials
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("rejects an invalid payload with 422 and lists every problem", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "", email: "nope", password: "123" }
    });

    expect(res.statusCode).toBe(422);

    const body = res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveLength(3);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: credentials
    });
  });

  it("returns an access token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: credentials.email, password: credentials.password }
    });

    expect(res.statusCode).toBe(200);
    expect(typeof res.json().data.accessToken).toBe("string");
  });

  it("answers identically for a wrong password and an unknown email", async () => {
    const wrongPassword = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: credentials.email, password: "wrong-password" }
    });

    const unknownEmail = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "nobody@example.com", password: credentials.password }
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
    expect(wrongPassword.json().error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the authenticated user", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: credentials
    });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: credentials.email, password: credentials.password }
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${login.json().data.accessToken}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.user.email).toBe(credentials.email);
  });

  it("rejects a missing token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me" });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("INVALID_TOKEN");
  });

  it("rejects a malformed token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: "Bearer not-a-jwt" }
    });

    expect(res.statusCode).toBe(401);
  });
});
