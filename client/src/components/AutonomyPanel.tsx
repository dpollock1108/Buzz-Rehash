import { useEffect, useState } from "react";
import { getAutonomyStatus, runTickNow, updateAutonomySettings } from "../api/client";
import type { AutonomySettings, TickRun } from "../types";

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}

function RunSummary({ run }: { run: TickRun }) {
  const s = run.summary;
  const parts = [
    s.postsCreated > 0 && `${s.postsCreated} post${s.postsCreated === 1 ? "" : "s"}`,
    s.repliesCreated > 0 && `${s.repliesCreated} repl${s.repliesCreated === 1 ? "y" : "ies"}`,
    s.commentRepliesCreated > 0 && `${s.commentRepliesCreated} comment repl${s.commentRepliesCreated === 1 ? "y" : "ies"}`,
    s.eventProposed && `event proposed: "${s.eventProposed}"`,
  ].filter(Boolean);
  return (
    <div className="text-sm border-t border-gray-700/60 pt-2">
      <div className="flex gap-2 items-baseline">
        <span className="text-gray-500 text-xs">
          {new Date(run.startedAt).toLocaleString()} · {run.trigger}
        </span>
        {!run.finishedAt && <span className="text-yellow-400 text-xs">running…</span>}
      </div>
      <p className="text-gray-300">{parts.length ? parts.join(", ") : "nothing happened"}</p>
      {s.errors.length > 0 && (
        <p className="text-red-400 text-xs mt-0.5">{s.errors.join("; ")}</p>
      )}
    </div>
  );
}

export default function AutonomyPanel() {
  const [settings, setSettings] = useState<AutonomySettings | null>(null);
  const [runs, setRuns] = useState<TickRun[]>([]);
  const [saving, setSaving] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const status = await getAutonomyStatus();
      setSettings(status.settings);
      setRuns(status.recentRuns);
      setTicking(status.tickRunning);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      setSettings(await updateAutonomySettings(settings));
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleTick() {
    setTicking(true);
    setError(null);
    setMessage(null);
    try {
      const run = await runTickNow();
      setMessage(`Tick finished: ${run.summary.details.join("; ") || "nothing to do"}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tick failed");
    } finally {
      setTicking(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">World Tick</h3>
          <p className="text-gray-500 text-sm">
            The autonomous heartbeat: ambient posts, celebrity clapbacks, fan replies, and the
            occasional proposed event.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="accent-purple-500 w-4 h-4"
          />
          <span className={settings.enabled ? "text-green-400 text-sm" : "text-gray-500 text-sm"}>
            {settings.enabled ? "Enabled" : "Disabled"}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <NumberField
          label="Interval (min)"
          value={settings.intervalMinutes}
          onChange={(v) => setSettings({ ...settings, intervalMinutes: v })}
          min={5}
          max={1440}
        />
        <NumberField
          label="Posts / tick"
          value={settings.maxPostsPerTick}
          onChange={(v) => setSettings({ ...settings, maxPostsPerTick: v })}
          min={0}
          max={10}
        />
        <NumberField
          label="Replies / tick"
          value={settings.maxRepliesPerTick}
          onChange={(v) => setSettings({ ...settings, maxRepliesPerTick: v })}
          min={0}
          max={10}
        />
        <NumberField
          label="Comment replies"
          value={settings.maxCommentRepliesPerTick}
          onChange={(v) => setSettings({ ...settings, maxCommentRepliesPerTick: v })}
          min={0}
          max={10}
        />
        <NumberField
          label="Event chance (0-1)"
          value={settings.eventChance}
          onChange={(v) => setSettings({ ...settings, eventChance: v })}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={handleTick}
          disabled={ticking}
          className="border border-purple-500/50 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50 text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {ticking ? "World turning..." : "Run Tick Now"}
        </button>
      </div>
      {message && <p className="mt-3 text-green-400 text-sm">{message}</p>}
      {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

      {runs.length > 0 && (
        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Recent ticks
          </h4>
          {runs.slice(0, 5).map((run) => (
            <RunSummary key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
