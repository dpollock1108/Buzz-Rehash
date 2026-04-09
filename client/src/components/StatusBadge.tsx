import type { CelebrityStatus } from "../types";

const styles: Record<CelebrityStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  denied: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function StatusBadge({ status }: { status: CelebrityStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {status}
    </span>
  );
}
