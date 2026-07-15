import { useEffect, useMemo, useState } from "react";
import { listCelebrities } from "../api/client";
import CelebrityCard from "../components/CelebrityCard";
import type { Celebrity } from "../types";

type Tab = "all" | "pending" | "approved" | "retired" | "denied";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "retired", label: "Retired" },
  { key: "denied", label: "Denied" },
];

function matches(tab: Tab, c: Celebrity): boolean {
  switch (tab) {
    case "all":
      return true;
    case "approved":
      return c.status === "approved" && !c.retired;
    case "retired":
      return c.retired;
    case "pending":
      return c.status === "pending";
    case "denied":
      return c.status === "denied";
  }
}

export default function Influencers() {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    // Admins get every status back from this endpoint
    listCelebrities()
      .then(setCelebrities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: 0, pending: 0, approved: 0, retired: 0, denied: 0 };
    for (const cel of celebrities) {
      for (const t of TABS) if (matches(t.key, cel)) c[t.key]++;
    }
    return c;
  }, [celebrities]);

  const shown = celebrities.filter((c) => matches(tab, c));

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Influencers</h2>
        <button
          onClick={load}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-600">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-gray-500">
          {tab === "all"
            ? "No influencers yet. Generate some from the Dashboard."
            : `No ${tab} influencers.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shown.map((c) => (
            <CelebrityCard key={c.id} celebrity={c} />
          ))}
        </div>
      )}
    </div>
  );
}
