"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function TaskForm({ members }: { members: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const isGroup = assignedTo === "__all__" || assignedTo === "__leadership__";

    if (isGroup) {
      const groupLabel = assignedTo === "__all__" ? "everyone" : "leadership";
      if (!confirm(`This creates a separate copy of this task for ${groupLabel}. Continue?`)) {
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        assignedTo: isGroup ? undefined : assignedTo || undefined,
        assignToGroup: assignedTo === "__all__" ? "all" : assignedTo === "__leadership__" ? "leadership" : undefined,
        dueDate: dueDate || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't create that task.");
      return;
    }

    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
      <p className="font-voice text-lg text-parchment">New task</p>

      <label className="block">
        <span className="mb-2 block text-sm text-muted">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-muted">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Assign to</span>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          >
            <option value="">Unassigned</option>
            <optgroup label="Groups">
              <option value="__all__">Everyone</option>
              <option value="__leadership__">Leadership (Founder/Council/Junior council)</option>
            </optgroup>
            <optgroup label="Individual">
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Due date (optional)</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-candle">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create task"}
      </button>
    </form>
  );
}
