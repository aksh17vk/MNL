import { prisma } from "../../database/prisma.js";
import type { User } from "../../generated/prisma/client.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import type { AuthTokenPayload } from "../../types/auth.js";
import type { LoginBody, PublicUser, RegisterBody } from "./auth.schema.js";

/** Signs an access token. Injected so the service stays independent of Fastify. */
export type TokenSigner = (payload: AuthTokenPayload) => string;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export async function registerUser(input: RegisterBody): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true }
  });

  if (existing) {
    throw new ConflictError(
      "An account with this email already exists",
      "EMAIL_ALREADY_REGISTERED"
    );
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password)
    }
  });

  return toPublicUser(user);
}

export async function loginUser(
  input: LoginBody,
  signToken: TokenSigner
): Promise<{ accessToken: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for unknown email and wrong password — no account enumeration.
  const invalid = new UnauthorizedError(
    "Invalid email or password",
    "INVALID_CREDENTIALS"
  );

  if (!user) {
    // Still spend the hashing time so response timing does not leak existence.
    await verifyPassword(input.password, "scrypt$16384$8$1$00$00");
    throw invalid;
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw invalid;
  }

  return {
    accessToken: signToken({ sub: user.id, email: user.email }),
    user: toPublicUser(user)
  };
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("User", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}
