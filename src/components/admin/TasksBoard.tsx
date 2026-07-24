"use client";

import { useState } from "react";
import TaskRow from "@/components/admin/TaskRow";

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

type CurrentUser = {
  adminUserId: string;
  memberId: string | null;
  role: "owner" | "admin" | "editor";
  canAssignTasks: boolean;
};

type EnrichedTask = {
  task: Task;
  assigneeName: string | null;
  assigneeHasLogin: boolean;
  assignerName: string;
};

type Filter = "mine" | "all";

/**
 * Client-side My Tasks / All Tasks toggle over the already-fetched task
 * list (page.tsx's server component still does the one Supabase query --
 * this only filters what it already has, no new requests). Split out from
 * page.tsx specifically so it can hold the toggle's useState, which a
 * server component can't.
 */
export default function TasksBoard({
  tasks,
  members,
  currentUser,
}: {
  tasks: EnrichedTask[];
  members: { id: string; full_name: string }[];
  currentUser: CurrentUser | null;
}) {
  // Only evaluated once, at mount, matching the "default to My Tasks if a
  // member profile is linked" spec without re-deciding the default on
  // every currentUser identity change afterward.
  const [filter, setFilter] = useState<Filter>(() => (currentUser?.memberId ? "mine" : "all"));

  // Guarded on currentUser?.memberId (not just checking assigned_to ===
  // null) so a null memberId (no linked member profile) never
  // accidentally matches unassigned tasks, which also have
  // assigned_to === null.
  const filteredTasks =
    filter === "all"
      ? tasks
      : currentUser?.memberId
        ? tasks.filter((t) => t.task.assigned_to === currentUser.memberId)
        : [];

  const emptyMessage =
    filter === "mine" && !currentUser?.memberId
      ? "No linked member profile to filter by."
      : filter === "mine"
        ? "No tasks assigned to you yet."
        : "No tasks yet.";

  return (
    <div>
      <div className="flex gap-2">
        {(["mine", "all"] as Filter[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
              filter === option
                ? "border-lilac bg-lilac text-ink"
                : "border-muted/40 text-muted hover:border-parchment hover:text-parchment"
            }`}
          >
            {option === "mine" ? "My Tasks" : "All Tasks"}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted">{emptyMessage}</p>
        ) : (
          filteredTasks.map(({ task, assigneeName, assigneeHasLogin, assignerName }) => (
            <TaskRow
              key={task.id}
              task={task}
              assigneeName={assigneeName}
              assigneeHasLogin={assigneeHasLogin}
              assignerName={assignerName}
              members={members}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}
