import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL = "30d";

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    return new TextEncoder().encode("buzz-rehash-dev-secret-not-for-production");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Short-lived signed payload used to round-trip OIDC state/PKCE through a cookie. */
export async function createTransientToken(data: Record<string, string>): Promise<string> {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyTransientToken(
  token: string
): Promise<Record<string, string> | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as Record<string, string>;
  } catch {
    return null;
  }
}
