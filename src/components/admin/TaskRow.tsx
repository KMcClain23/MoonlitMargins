"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  created_at: string;
};

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export default function TaskRow({
  task,
  assigneeName,
  assignerName,
  members,
}: {
  task: Task;
  assigneeName: string | null;
  assignerName: string;
  members: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [status, setStatus] = useState(task.status);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  async function persist(next: Partial<{ status: Task["status"] }>) {
    const res = await fetch(`/api/admin/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
        status: next.status ?? status,
      }),
    });
    if (res.ok) router.refresh();
    return res.ok;
  }

  async function handleStatusChange(newStatus: Task["status"]) {
    setStatus(newStatus);
    await persist({ status: newStatus });
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    const ok = await persist({});
    setLoading(false);
    if (ok) {
      setEditing(false);
    } else {
      setError("Couldn't save changes.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    const res = await fetch(`/api/admin/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Description</span>
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
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-muted">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-candle">{error}</p> : null}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-muted hover:text-parchment">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-parchment">
            {task.title}
            {isOverdue ? (
              <span className="ml-2 rounded-full border border-candle/40 px-2 py-0.5 text-[10px] text-candle">
                Overdue
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted">
            {assigneeName ? `Assigned to ${assigneeName}` : "Unassigned"} · Created by {assignerName}
            {task.due_date
              ? ` · Due ${new Date(task.due_date).toLocaleDateString("en-US", { dateStyle: "medium" })}`
              : ""}
          </p>
          {task.description ? <p className="mt-2 text-sm text-muted">{task.description}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as Task["status"])}
            className="rounded-full border border-hairline bg-ink px-3 py-1 text-xs text-parchment focus:border-lilac"
          >
            {(Object.keys(STATUS_LABELS) as Task["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
            Edit
          </button>
          <button onClick={handleDelete} className="text-xs text-candle hover:underline">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
