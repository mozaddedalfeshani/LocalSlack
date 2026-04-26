import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { HistoryEntry } from "../types";

export function useHistory(filter = "all") {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const load = useCallback(() => {
    setLoading(true);
    invoke<HistoryEntry[]>("get_history", { filter })
      .then(setEntries)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(load, [load]);
  return {
    entries,
    loading,
    error,
    reload: load,
    clear: () => invoke("clear_history").then(load),
    deleteEntry: (id: string) => invoke("delete_history_entry", { id }).then(load)
  };
}
