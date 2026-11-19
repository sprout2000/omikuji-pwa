import { useCallback, useEffect, useState } from "react";

/** 1 日に引ける回数 */
export const MAX_DRAWS = 3;

const KEY = "omikuji-draws";

interface DrawState {
  /** 端末のローカル時刻での日付（YYYY-MM-DD） */
  date: string;
  count: number;
}

/** 端末のローカル時刻での日付を YYYY-MM-DD で返す */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 次の午前 0 時までのミリ秒 */
function msUntilNextDay(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * `npm run dev`（MODE が development）のときは保存済みの回数を読み込まない。
 * 再読み込みすれば 3 回のリミットが戻るので、動作確認がしやすい。
 * 本番ビルドとテスト（MODE が test）では読み込む。
 */
function isDevMode(): boolean {
  return import.meta.env.MODE === "development";
}

function load(): DrawState {
  if (isDevMode()) return { date: todayKey(), count: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<DrawState>;
      if (
        typeof data.date === "string" &&
        typeof data.count === "number" &&
        Number.isInteger(data.count) &&
        data.count >= 0
      ) {
        return { date: data.date, count: Math.min(data.count, MAX_DRAWS) };
      }
    }
  } catch {
    /* 壊れたデータは無視 */
  }
  return { date: todayKey(), count: 0 };
}

function save(state: DrawState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 保存できない環境では無視 */
  }
}

/**
 * 今日引いた回数を数える。日付が変わると 0 回に戻る。
 * 回数は localStorage に保存するので、再読み込みしても戻らない（dev モードを除く）。
 */
export function useDrawCount() {
  const [state, setState] = useState<DrawState>(load);
  const [today, setToday] = useState<string>(() => todayKey());

  // 開いたまま日付をまたいだときや、スリープ・別アプリから戻ったときに日付を確かめ直す
  useEffect(() => {
    const refresh = () => setToday(todayKey());

    // 次の午前 0 時にタイマーを張り、動いたらまた次の午前 0 時に張り直す。
    // タイマーが少し早く動いても日付が変わっているよう、1 秒余裕を持たせる。
    let timer = 0;
    const scheduleNextDay = () => {
      timer = window.setTimeout(() => {
        refresh();
        scheduleNextDay();
      }, msUntilNextDay() + 1000);
    };
    scheduleNextDay();

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const increment = useCallback(() => {
    const now = todayKey();
    setToday(now);
    setState((prev) => {
      const base = prev.date === now ? prev.count : 0;
      const next = { date: now, count: Math.min(base + 1, MAX_DRAWS) };
      save(next);
      return next;
    });
  }, []);

  const count = state.date === today ? state.count : 0;
  const remaining = MAX_DRAWS - count;
  return { count, remaining, canDraw: remaining > 0, increment };
}
