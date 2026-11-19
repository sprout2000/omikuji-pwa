import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_DRAWS, todayKey, useDrawCount } from "./useDrawCount";

const KEY = "omikuji-draws";
const HOUR = 60 * 60 * 1000;

/** 2026-11-19 12:00（ローカル時刻） */
const NOON = new Date(2026, 10, 19, 12, 0, 0);

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null");

describe("todayKey", () => {
  it("ローカル時刻の日付を YYYY-MM-DD で返す", () => {
    expect(todayKey(new Date(2026, 0, 5, 9, 30))).toBe("2026-01-05");
    expect(todayKey(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
  });
});

describe("useDrawCount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
  });

  const drawThreeTimes = (result: {
    current: ReturnType<typeof useDrawCount>;
  }) => {
    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.increment();
    });
  };

  it("上限は 1 日 3 回", () => {
    expect(MAX_DRAWS).toBe(3);
  });

  it("最初は 0 回で、3 回引ける", () => {
    const { result } = renderHook(() => useDrawCount());
    expect(result.current.count).toBe(0);
    expect(result.current.remaining).toBe(3);
    expect(result.current.canDraw).toBe(true);
  });

  it("increment で回数が増え、今日の日付と一緒に保存される", () => {
    const { result } = renderHook(() => useDrawCount());
    act(() => result.current.increment());

    expect(result.current.count).toBe(1);
    expect(result.current.remaining).toBe(2);
    expect(stored()).toEqual({ date: "2026-11-19", count: 1 });
  });

  it("3 回で引けなくなり、それ以上は増えない", () => {
    const { result } = renderHook(() => useDrawCount());
    drawThreeTimes(result);
    expect(result.current.canDraw).toBe(false);

    act(() => result.current.increment());
    expect(result.current.count).toBe(3);
    expect(stored()).toEqual({ date: "2026-11-19", count: 3 });
  });

  it("同じ日なら保存済みの回数を読み込む", () => {
    localStorage.setItem(KEY, JSON.stringify({ date: "2026-11-19", count: 2 }));
    const { result } = renderHook(() => useDrawCount());
    expect(result.current.count).toBe(2);
    expect(result.current.remaining).toBe(1);
  });

  it("前の日に保存された回数は 0 回として扱う", () => {
    localStorage.setItem(KEY, JSON.stringify({ date: "2026-11-18", count: 3 }));
    const { result } = renderHook(() => useDrawCount());
    expect(result.current.count).toBe(0);
    expect(result.current.canDraw).toBe(true);
  });

  it("開いたまま午前 0 時を過ぎると、また引けるようになる", () => {
    const { result } = renderHook(() => useDrawCount());
    drawThreeTimes(result);

    // 23:59 ではまだ引けない
    act(() => {
      vi.advanceTimersByTime(12 * HOUR - 60 * 1000);
    });
    expect(result.current.canDraw).toBe(false);

    // 午前 0 時を過ぎるとタイマーで日付が切り替わる
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.canDraw).toBe(true);
  });

  it("次の日にアプリへ戻ってきたら（visibilitychange）、また引けるようになる", () => {
    const { result } = renderHook(() => useDrawCount());
    drawThreeTimes(result);

    // スリープなどでタイマーが動かないまま翌朝になった想定
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0, 0));
    expect(result.current.canDraw).toBe(false);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.count).toBe(0);
    expect(result.current.canDraw).toBe(true);
  });

  it("次の日に focus が来ても、また引けるようになる", () => {
    const { result } = renderHook(() => useDrawCount());
    drawThreeTimes(result);

    vi.setSystemTime(new Date(2026, 10, 20, 8, 0, 0));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current.canDraw).toBe(true);
  });

  it("日付が変わってから引くと、その日の 1 回目として数える", () => {
    const { result } = renderHook(() => useDrawCount());
    act(() => result.current.increment());

    vi.setSystemTime(new Date(2026, 10, 20, 8, 0, 0));
    act(() => result.current.increment());

    expect(result.current.count).toBe(1);
    expect(stored()).toEqual({ date: "2026-11-20", count: 1 });
  });

  it.each([
    ["JSON でない", "abc"],
    ["回数がマイナス", JSON.stringify({ date: "2026-11-19", count: -1 })],
    ["回数が整数でない", JSON.stringify({ date: "2026-11-19", count: 1.5 })],
    ["日付がない", JSON.stringify({ count: 2 })],
  ])("保存データが不正（%s）なら 0 回として扱う", (_label, value) => {
    localStorage.setItem(KEY, value);
    const { result } = renderHook(() => useDrawCount());
    expect(result.current.count).toBe(0);
  });

  it("上限より大きい値は 3 回に収める", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ date: "2026-11-19", count: 10 }),
    );
    const { result } = renderHook(() => useDrawCount());
    expect(result.current.count).toBe(3);
    expect(result.current.canDraw).toBe(false);
  });

  describe("dev モード（npm run dev）", () => {
    beforeEach(() => {
      vi.stubEnv("MODE", "development");
    });

    it("保存済みの回数を読み込まないので、再読み込みで 3 回に戻る", () => {
      localStorage.setItem(
        KEY,
        JSON.stringify({ date: "2026-11-19", count: 3 }),
      );
      const { result } = renderHook(() => useDrawCount());
      expect(result.current.count).toBe(0);
      expect(result.current.canDraw).toBe(true);
    });

    it("開いている間は回数を数え、3 回で引けなくなる", () => {
      const { result } = renderHook(() => useDrawCount());
      drawThreeTimes(result);
      expect(result.current.canDraw).toBe(false);
    });
  });
});
