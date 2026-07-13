import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import SignInButtons from "./SignInButtons";

export default function PublicLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-white">
            Buzz<span className="text-purple-400">Rehash</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                )}
                <span className="text-gray-300 text-sm">{user.displayName}</span>
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/40 rounded px-2 py-1 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-gray-500 hover:text-white text-sm transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <SignInButtons compact />
            )}
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
