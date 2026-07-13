import { useState } from "react";
import { useAuth } from "../auth";

/** Sign-in affordances: SSO when configured, dev login outside production. */
export default function SignInButtons({ compact = false }: { compact?: boolean }) {
  const { oidcConfigured, devLoginAllowed, signInWithSso, signInDev } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleDev() {
    setBusy(true);
    try {
      await signInDev();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex gap-2 ${compact ? "" : "flex-wrap"}`}>
      {oidcConfigured && (
        <button
          onClick={signInWithSso}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          Sign in
        </button>
      )}
      {devLoginAllowed && (
        <button
          onClick={handleDev}
          disabled={busy}
          className={`${
            oidcConfigured
              ? "border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          } disabled:opacity-50 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors`}
        >
          {busy ? "Signing in..." : oidcConfigured ? "Dev login" : "Sign in (dev)"}
        </button>
      )}
      {!oidcConfigured && !devLoginAllowed && (
        <span className="text-gray-500 text-sm">Sign-in is not configured</span>
      )}
    </div>
  );
}
