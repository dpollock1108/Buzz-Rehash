import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

const links = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pending", label: "Pending Review" },
  { to: "/admin/approved", label: "Approved" },
  { to: "/admin/denied", label: "Denied" },
  { to: "/admin/feed", label: "Feed" },
  { to: "/admin/events", label: "Narrative Engine" },
  { to: "/admin/relationships", label: "Relationships" },
];

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-white">
            Buzz<span className="text-purple-400">Rehash</span>
          </h1>
          <p className="text-gray-500 text-xs mt-1">Admin Console</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/admin"}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link
            to="/"
            className="block text-sm text-gray-400 hover:text-white transition-colors"
          >
            ↗ View public site
          </Link>
          {user && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500 text-xs truncate">{user.displayName}</span>
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-white text-xs transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
