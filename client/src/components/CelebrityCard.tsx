import { Link } from "react-router-dom";
import type { Celebrity } from "../types";
import StatusBadge from "./StatusBadge";

export default function CelebrityCard({ celebrity }: { celebrity: Celebrity }) {
  return (
    <Link
      to={`/admin/celebrities/${celebrity.id}`}
      className="block bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-purple-500/50 hover:bg-gray-800/80 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-semibold text-lg">{celebrity.name}</h3>
          <p className="text-purple-400 text-sm">{celebrity.handle}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {celebrity.retired && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-300 border-gray-500/40">
              retired
            </span>
          )}
          <StatusBadge status={celebrity.status} />
        </div>
      </div>
      <p className="text-gray-400 text-sm line-clamp-2 mb-3">{celebrity.bio}</p>
      {celebrity.attributes.genres && celebrity.attributes.genres.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {celebrity.attributes.genres.map((g) => (
            <span key={g} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
              {g}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
