# Buzz Rehash — Mobile Porting Plan

Goal: put the public Buzz Rehash experience (feed, celebrity profiles, likes, comments,
sign-in) on phones. The admin console stays web-only — it's a desk tool.

## Why the codebase is already mobile-ready

The phase 3 work was deliberately shaped for this:

- **API-first.** Every feature is an HTTP endpoint; the web client is just one consumer.
  A mobile app calls the exact same `/api/*` routes.
- **Token auth already works.** The auth middleware accepts `Authorization: Bearer <jwt>`
  in addition to the session cookie — mobile clients skip cookies entirely and store the
  JWT in secure storage (Keychain / Keystore).
- **SSO is OIDC.** OIDC has a first-class native flow (authorization code + PKCE, no client
  secret on the device). We already use PKCE on the web side.
- **Shared types.** `server/src/types.ts` and `client/src/types.ts` are already near-identical;
  step 0 below extracts them into a shared package the mobile app imports too.

## Recommendation: two stages

### Stage A — PWA (days of work, ship first)

Make the existing public site installable and phone-polished before writing any native code:

1. Add `vite-plugin-pwa`: manifest (name, icons, theme color), service worker for
   offline shell + cached feed.
2. Audit the public pages at 375px width; the feed is already a single column, so this is
   mostly tap-target and safe-area work.
3. Deploy behind HTTPS (required for install prompts and the OIDC redirect anyway).

What a PWA can't do well: push notifications on iOS are limited, no App Store presence,
no native share sheet integration. That's what Stage B is for. Nothing in Stage A is
throwaway — the same API and auth serve both.

### Stage B — React Native via Expo (the real app)

**Why Expo/React Native over the alternatives:**

| Option | Verdict |
|---|---|
| **Expo (React Native)** | ✅ Reuses React knowledge and the TS types; one codebase for iOS+Android; EAS handles builds/signing/updates; `expo-auth-session` does OIDC PKCE out of the box |
| Flutter | Solid, but a new language (Dart) and zero reuse from this repo |
| Native Swift/Kotlin | Two codebases; only worth it if the app needs heavy platform APIs — it doesn't |
| Capacitor (wrap the web app) | Fastest but feels like a website in a shell; feed scroll performance and gestures suffer |

**Monorepo layout** (extends the existing npm workspaces):

```
buzz-rehash/
  server/          existing API
  client/          existing web (admin + public)
  packages/
    shared/        extracted types + a typed API client (fetch wrapper)
  mobile/          Expo app
```

Step 0 is extracting `packages/shared`: the `types.ts` definitions plus a typed API client
parameterized by base URL and a token provider. The web client swaps its hand-rolled
`api/client.ts` for it; the mobile app gets it for free.

**App structure (Expo Router):**

- `(tabs)/feed` — infinite-scroll feed (`FlashList`), pull-to-refresh, like/comment
- `(tabs)/celebrities` — cast grid → profile screens (bio, associations, posts)
- `(tabs)/profile` — sign in/out, notification settings
- Comment thread as a bottom sheet over the feed

**Auth flow on mobile:**

1. `expo-auth-session` runs the OIDC authorization-code + PKCE flow against the same
   provider (redirect URI like `buzzrehash://auth`, registered with the provider).
2. New endpoint `POST /api/auth/token`: exchanges the provider's `id_token` for a Buzz
   Rehash JWT (verify signature against the provider's JWKS, then `findOrCreateUser` —
   the same function the web callback uses).
3. Store the JWT with `expo-secure-store`; send it as `Authorization: Bearer` on every
   request. The middleware already accepts this.

**Push notifications** (the feature that makes mobile worth it):

- `expo-notifications` + a `device_tokens` table (`user_id`, `expo_push_token`, `platform`).
- Notify on: new post from a followed celebrity (needs a small `follows` table),
  replies to your comment, and "drama alerts" when a big event resolves.
- Server sends via Expo's push API — no raw APNs/FCM plumbing.

**API additions mobile will want** (all cheap):

- Cursor-based pagination on `/api/posts` (`?before=<created_at>` — offset pagination
  breaks with infinite scroll as new posts land)
- `follows` table + `POST /api/celebrities/:id/follow`
- ETag or `updated_at` support on the feed for cheap refresh checks

### Effort sketch

| Milestone | Scope |
|---|---|
| A: PWA | manifest + service worker + mobile audit — a weekend |
| B0: shared package | extract types + API client, both web/mobile consume — 1-2 days |
| B1: read-only app | tabs, feed, profiles against prod API — ~1 week |
| B2: auth + engagement | OIDC PKCE, token endpoint, likes/comments — ~1 week |
| B3: push + follows | notifications, follow model, App Store submission — 1-2 weeks |

### Prerequisites before Stage B starts

1. API deployed to a public HTTPS URL (see ARCHITECTURE.md cloud plan) — a phone can't
   reach `localhost:3001`.
2. An OIDC provider registered with the mobile redirect URI added.
3. Apple Developer ($99/yr) and Google Play ($25 one-time) accounts for store distribution;
   TestFlight/internal testing first.
