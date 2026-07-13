"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TaskComments from "@/components/admin/TaskComments";

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  acceptance_status: "pending" | "accepted" | "proposed_change";
  proposed_due_date: string | null;
  response_message: string | null;
  created_at: string;
};

type CurrentUser = { adminUserId: string; memberId: string | null; role: "owner" | "admin" | "editor" };

// due_date/proposed_due_date are plain "YYYY-MM-DD" dates (no time-of-day),
// but `new Date("YYYY-MM-DD")` parses that as UTC midnight -- displaying it
// with toLocaleDateString then renders in the *local* timezone, which
// silently shifts it a day earlier for anyone west of UTC (e.g. Aug 15
// UTC-midnight shows as "Aug 14" in US timezones). Parsing the parts into
// the local-time Date constructor instead avoids any timezone conversion,
// since a calendar date should always mean the same date everywhere.
function parseDateOnly(dateString: string) {
  const parts = dateString.split("-").map(Number);
  return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

function formatDateOnly(dateString: string) {
  return parseDateOnly(dateString).toLocaleDateString("en-US", { dateStyle: "medium" });
}

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export default function TaskRow({
  task,
  assigneeName,
  assigneeHasLogin,
  assignerName,
  members,
  currentUser,
}: {
  task: Task;
  assigneeName: string | null;
  assigneeHasLogin: boolean;
  assignerName: string;
  members: { id: string; full_name: string }[];
  currentUser: CurrentUser | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [proposedDate, setProposedDate] = useState(task.due_date ?? "");
  const [proposeMessage, setProposeMessage] = useState("");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [status, setStatus] = useState(task.status);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOverdue = task.due_date && task.status !== "done" && parseDateOnly(task.due_date) < new Date();

  const isActualAssignee = Boolean(currentUser) && currentUser!.memberId === task.assigned_to;
  // Owner/admin can only act "on behalf of" the assignee when that person
  // has no login of their own -- if they DO have an account (like Kaya),
  // only they should accept/propose their own task. Otherwise every task
  // assigned to someone with real backend access would show a confusing
  // Accept button to anyone with admin/owner rights, as if it were theirs
  // to accept.
  const canActOnBehalf =
    Boolean(currentUser) && (currentUser!.role === "owner" || currentUser!.role === "admin") && !assigneeHasLogin;
  const canRespondAsAssignee = isActualAssignee || canActOnBehalf;
  const canReassign = Boolean(currentUser) && (currentUser!.role === "owner" || currentUser!.role === "admin");
  const canRespondAsAssigner =
    Boolean(currentUser) && (currentUser!.adminUserId === task.assigned_by || currentUser!.role === "owner");

  async function respond(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/tasks/${task.id}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const responseBody = await res.json().catch(() => null);
      setError(typeof responseBody?.error === "string" ? responseBody.error : "That didn't go through.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAccept() {
    await respond({ action: "accept" });
  }

  async function handleSendProposal() {
    const ok = await respond({ action: "propose", proposedDueDate: proposedDate, message: proposeMessage });
    if (ok) setProposing(false);
  }

  async function handleApproveProposal() {
    await respond({ action: "approve_proposal" });
  }

  async function handleRejectProposal() {
    await respond({ action: "reject_proposal" });
  }

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
            {task.acceptance_status === "pending" ? (
              <span className="ml-2 rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted">
                Awaiting response
              </span>
            ) : null}
            {task.acceptance_status === "proposed_change" ? (
              <span className="ml-2 rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">
                New date proposed
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted">
            {assigneeName ? `Assigned to ${assigneeName}` : "Unassigned"} · Created by {assignerName}
            {task.due_date
              ? ` · Due ${formatDateOnly(task.due_date)}`
              : ""}
          </p>
          {task.description ? <p className="mt-2 text-sm text-muted">{task.description}</p> : null}

          {task.acceptance_status === "pending" && canRespondAsAssignee ? (
            <div className="mt-3">
              {proposing ? (
                <div className="space-y-3 rounded-xl border border-hairline bg-ink p-4">
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Proposed due date</span>
                    <input
                      type="date"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-parchment focus:border-lilac"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Message to {assignerName} (optional)</span>
                    <textarea
                      value={proposeMessage}
                      onChange={(e) => setProposeMessage(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-parchment focus:border-lilac"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSendProposal}
                      disabled={loading || !proposedDate}
                      className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
                    >
                      {loading ? "Sending…" : "Send proposal"}
                    </button>
                    <button onClick={() => setProposing(false)} className="text-xs text-muted hover:text-parchment">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setProposing(true)}
                    className="text-xs text-lilac-soft hover:underline"
                  >
                    Propose new date
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {task.acceptance_status === "pending" && !canRespondAsAssignee ? (
            <div className="mt-3 flex items-center gap-3">
              <p className="text-xs text-muted">
                Waiting on {assigneeName ?? "the assignee"} to accept or propose a different date.
              </p>
              {canReassign ? (
                <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
                  Reassign
                </button>
              ) : null}
            </div>
          ) : null}

          {task.acceptance_status === "proposed_change" ? (
            <div className="mt-3 rounded-xl border border-lilac/30 bg-ink p-4">
              <p className="text-sm text-parchment">
                {assigneeName ?? "The assignee"} proposed{" "}
                <strong>
                  {task.proposed_due_date ? formatDateOnly(task.proposed_due_date) : "a new date"}
                </strong>
                .
              </p>
              {task.response_message ? (
                <p className="mt-1 text-sm text-muted">&ldquo;{task.response_message}&rdquo;</p>
              ) : null}

              {canRespondAsAssigner ? (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleApproveProposal}
                    disabled={loading}
                    className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
                  >
                    Approve new date
                  </button>
                  <button
                    onClick={handleRejectProposal}
                    disabled={loading}
                    className="text-xs text-muted hover:text-parchment"
                  >
                    Keep original date
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">Waiting on {assignerName} to respond.</p>
              )}
            </div>
          ) : null}

          {error ? <p className="mt-2 text-sm text-candle">{error}</p> : null}

          <div className="mt-3">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="text-xs text-lilac-soft hover:underline"
            >
              {showComments ? "Hide comments" : "Comments"}
            </button>
            {showComments ? (
              <div className="mt-2">
                <TaskComments taskId={task.id} currentUserId={currentUser?.adminUserId ?? ""} />
              </div>
            ) : null}
          </div>
        </div>

        {task.acceptance_status === "accepted" ? (
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
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
              Edit
            </button>
            <button onClick={handleDelete} className="text-xs text-candle hover:underline">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
