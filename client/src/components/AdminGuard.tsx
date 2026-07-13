import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import SignInButtons from "./SignInButtons";

/** Wraps the admin section: requires a signed-in user with the admin role. */
export default function AdminGuard() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-1">
            Buzz<span className="text-purple-400">Rehash</span>
          </h1>
          <p className="text-gray-500 text-sm mb-6">Admin Console</p>
          {user ? (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Signed in as {user.displayName}, but this account doesn't have admin access.
              </p>
              <button
                onClick={() => signOut()}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex justify-center">
              <SignInButtons />
            </div>
          )}
          <p className="mt-6">
            <Link to="/" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              ← Back to the public feed
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
