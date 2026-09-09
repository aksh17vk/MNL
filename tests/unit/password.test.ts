import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../../src/lib/password.js";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const stored = await hashPassword("password123");

    await expect(verifyPassword("password123", stored)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("password123");

    await expect(verifyPassword("password124", stored)).resolves.toBe(false);
  });

  it("salts each hash, so the same password hashes differently", async () => {
    const a = await hashPassword("password123");
    const b = await hashPassword("password123");

    expect(a).not.toBe(b);
  });

  it("never stores the plaintext", async () => {
    const stored = await hashPassword("password123");

    expect(stored).not.toContain("password123");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("returns false for a malformed stored value instead of throwing", async () => {
    await expect(verifyPassword("password123", "garbage")).resolves.toBe(false);
    await expect(verifyPassword("password123", "scrypt$1$2$3")).resolves.toBe(
      false
    );
    await expect(
      verifyPassword("password123", "scrypt$x$y$z$00$00")
    ).resolves.toBe(false);
  });
});
