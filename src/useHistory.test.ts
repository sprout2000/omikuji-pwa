import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { drawFortune } from "./omikuji";
import { useHistory } from "./useHistory";

const KEY = "omikuji-history";

describe("useHistory", () => {
  it("最初は空", () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
  });

  it("追加したものが先頭に入り、localStorage に保存される", () => {
    const { result } = renderHook(() => useHistory());
    const first = drawFortune();
    const second = drawFortune();

    act(() => result.current.add(first));
    act(() => result.current.add(second));

    expect(result.current.history.map((h) => h.id)).toEqual([
      second.id,
      first.id,
    ]);
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    expect(stored.map((h: { id: string }) => h.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("最大 20 件まで保持し、古いものから消える", () => {
    const { result } = renderHook(() => useHistory());
    const fortunes = Array.from({ length: 25 }, () => drawFortune());

    act(() => {
      for (const f of fortunes) result.current.add(f);
    });

    expect(result.current.history).toHaveLength(20);
    expect(result.current.history[0].id).toBe(fortunes[24].id);
    expect(result.current.history[19].id).toBe(fortunes[5].id);
  });

  it("保存済みの履歴を読み込む", () => {
    const saved = [drawFortune(), drawFortune()];
    localStorage.setItem(KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual(saved);
  });

  it("壊れたデータが保存されていても空として扱う", () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
  });

  it("clear で履歴と保存データが空になる", () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.add(drawFortune()));
    act(() => result.current.clear());

    expect(result.current.history).toEqual([]);
    expect(localStorage.getItem(KEY)).toBe("[]");
  });
});
