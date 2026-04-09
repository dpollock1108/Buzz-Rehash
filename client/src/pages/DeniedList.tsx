import { useEffect, useState } from "react";
import { listCelebrities } from "../api/client";
import type { Celebrity } from "../types";
import CelebrityCard from "../components/CelebrityCard";

export default function DeniedList() {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCelebrities("denied")
      .then(setCelebrities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl">
      <h2 className="text-3xl font-bold text-white mb-6">Denied Celebrities</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : celebrities.length === 0 ? (
        <p className="text-gray-500">No denied celebrities.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {celebrities.map((c) => (
            <CelebrityCard key={c.id} celebrity={c} />
          ))}
        </div>
      )}
    </div>
  );
}
