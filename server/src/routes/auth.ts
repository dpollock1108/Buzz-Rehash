import { Router } from "express";
import type { Request, Response } from "express";
import * as oidc from "openid-client";
import { SESSION_COOKIE } from "../middleware/auth.js";
import {
  createSessionToken,
  createTransientToken,
  verifyTransientToken,
} from "../services/session.js";
import { findOrCreateUser } from "../services/user.js";

export const authRouter = Router();

const OIDC_TRANSIENT_COOKIE = "buzz_oidc";

function baseUrl(req: Request): string {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function redirectUri(req: Request): string {
  return `${baseUrl(req)}/api/auth/callback`;
}

function oidcConfigured(): boolean {
  return Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);
}

function devLoginAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "true";
}

let _oidcConfig: oidc.Configuration | null = null;
async function getOidcConfig(): Promise<oidc.Configuration> {
  if (!_oidcConfig) {
    _oidcConfig = await oidc.discovery(
      new URL(process.env.OIDC_ISSUER!),
      process.env.OIDC_CLIENT_ID!,
      process.env.OIDC_CLIENT_SECRET
    );
  }
  return _oidcConfig;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

// Who am I?
authRouter.get("/api/auth/me", (req: Request, res: Response) => {
  res.json({
    user: req.user ?? null,
    oidcConfigured: oidcConfigured(),
    devLoginAllowed: devLoginAllowed(),
  });
});

// Kick off the SSO flow (redirects to the identity provider)
authRouter.get("/api/auth/login", async (req: Request, res: Response) => {
  if (!oidcConfigured()) {
    res.status(400).json({
      error:
        "SSO is not configured. Set OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET, or use dev login.",
    });
    return;
  }
  try {
    const config = await getOidcConfig();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();

    const authUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri(req),
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const transient = await createTransientToken({ codeVerifier, state });
    res.cookie(OIDC_TRANSIENT_COOKIE, transient, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(authUrl.href);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SSO login failed";
    res.status(500).json({ error: message });
  }
});

// Identity provider redirects back here
authRouter.get("/api/auth/callback", async (req: Request, res: Response) => {
  try {
    const transient = req.cookies?.[OIDC_TRANSIENT_COOKIE] as string | undefined;
    const stored = transient ? await verifyTransientToken(transient) : null;
    if (!stored?.codeVerifier || !stored?.state) {
      res.status(400).send("Login session expired — please try signing in again.");
      return;
    }

    const config = await getOidcConfig();
    const currentUrl = new URL(req.originalUrl, baseUrl(req));
    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: stored.codeVerifier,
      expectedState: stored.state,
    });

    const claims = tokens.claims();
    if (!claims?.sub) {
      res.status(500).send("Identity provider returned no subject claim.");
      return;
    }

    const user = findOrCreateUser({
      provider: "oidc",
      subject: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      displayName:
        (typeof claims.name === "string" && claims.name) ||
        (typeof claims.email === "string" && claims.email) ||
        "User",
      avatarUrl: typeof claims.picture === "string" ? claims.picture : undefined,
    });

    setSessionCookie(res, await createSessionToken(user.id));
    res.clearCookie(OIDC_TRANSIENT_COOKIE);
    res.redirect("/");
  } catch (error) {
    console.error("OIDC callback failed:", error);
    res.status(500).send("Sign-in failed. Check the server logs.");
  }
});

// Local development sign-in (no identity provider needed); always an admin
authRouter.post("/api/auth/dev-login", async (req: Request, res: Response) => {
  if (!devLoginAllowed()) {
    res.status(403).json({ error: "Dev login is disabled" });
    return;
  }
  const { name } = (req.body ?? {}) as { name?: string };
  const displayName = name?.trim() || "Dev Admin";
  const user = findOrCreateUser({
    provider: "dev",
    subject: displayName.toLowerCase().replace(/\s+/g, "-"),
    displayName,
  });
  setSessionCookie(res, await createSessionToken(user.id));
  res.json({ user });
});

authRouter.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});
