import { describe, expect, it, vi } from "vitest";
import { drawFortune, type FortuneRank, toKanjiNumber } from "./omikuji";

const ALL_RANKS: FortuneRank[] = ["大吉", "中吉", "小吉", "吉", "末吉", "凶"];
const LABELS = ["願望", "待人", "失物", "旅行", "商売", "学問", "恋愛", "健康"];

describe("toKanjiNumber", () => {
  it.each([
    [1, "一"],
    [9, "九"],
    [10, "十"],
    [11, "十一"],
    [20, "二十"],
    [23, "二十三"],
    [64, "六十四"],
    [99, "九十九"],
  ])("%i → %s", (n, expected) => {
    expect(toKanjiNumber(n)).toBe(expected);
  });
});

describe("drawFortune", () => {
  it("必要な項目がすべてそろっている", () => {
    const f = drawFortune();
    expect(ALL_RANKS).toContain(f.rank);
    expect(f.id).toEqual(expect.any(String));
    expect(f.message.length).toBeGreaterThan(0);
    expect(f.luckyColor.length).toBeGreaterThan(0);
    expect(f.luckyItem.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(f.drawnAt))).toBe(false);
  });

  it("8 つの項目が決まった順番で並ぶ", () => {
    const f = drawFortune();
    expect(f.details.map((d) => d.label)).toEqual(LABELS);
    for (const d of f.details) {
      expect(d.text.length).toBeGreaterThan(0);
    }
  });

  it("毎回ちがう id が振られる", () => {
    const ids = new Set(Array.from({ length: 50 }, () => drawFortune().id));
    expect(ids.size).toBe(50);
  });

  it("番号は 1〜99 の範囲に収まる", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(drawFortune().number).toBe(1);

    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(drawFortune().number).toBe(99);
  });

  // 重み: 大吉16 / 中吉20 / 小吉20 / 吉22 / 末吉14 / 凶8（累積 16, 36, 56, 78, 92, 100）
  it.each<[number, FortuneRank]>([
    [0, "大吉"],
    [0.1, "大吉"],
    [0.3, "中吉"],
    [0.5, "小吉"],
    [0.7, "吉"],
    [0.85, "末吉"],
    [0.95, "凶"],
    [0.999999, "凶"],
  ])("Math.random() = %f のとき %s", (r, expected) => {
    vi.spyOn(Math, "random").mockReturnValue(r);
    expect(drawFortune().rank).toBe(expected);
  });

  it("たくさん引くとすべての運勢が出る", () => {
    const seen = new Set(
      Array.from({ length: 2000 }, () => drawFortune().rank),
    );
    expect([...seen].sort()).toEqual([...ALL_RANKS].sort());
  });
});
