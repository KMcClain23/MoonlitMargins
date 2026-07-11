"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-candle hover:underline disabled:opacity-50"
        >
          Yes
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-muted hover:underline">
          No
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-xs text-muted hover:text-candle">
      Delete
    </button>
  );
}
