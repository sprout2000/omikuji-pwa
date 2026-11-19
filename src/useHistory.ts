import { useCallback, useState } from "react";
import type { Fortune } from "./omikuji";

const KEY = "omikuji-history";
const MAX = 20;

function load(): Fortune[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Fortune[]) : [];
  } catch {
    return [];
  }
}

function save(list: Fortune[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 保存できない環境では無視 */
  }
}

export function useHistory() {
  const [history, setHistory] = useState<Fortune[]>(load);

  const add = useCallback((f: Fortune) => {
    setHistory((prev) => {
      const next = [f, ...prev].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    save([]);
  }, []);

  return { history, add, clear };
}
