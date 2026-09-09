import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with node's built-in scrypt — memory-hard, no native
 * dependency to compile on any platform.
 *
 * Stored format: scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
 */

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const MAX_MEM = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await deriveKey(plain, salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM
  });

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("hex"),
    derived.toString("hex")
  ].join("$");
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts as [
    string,
    string,
    string,
    string,
    string,
    string
  ];

  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");

  if (expected.length === 0) {
    return false;
  }

  const derived = await deriveKey(plain, salt, expected.length, {
    N,
    r,
    p,
    maxmem: MAX_MEM
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
