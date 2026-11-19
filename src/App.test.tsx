import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

/** App.tsx の SHAKE_MS (1400) + STICK_MS (1100) */
const SHAKE_MS = 1400;
const STICK_MS = 1100;

const drawButton = () =>
  screen.getByRole("button", { name: /おみくじを引く|もう一度引く/ });
/** おみくじを引いて、結果が出るまで時間を進める */
const drawOnce = () => {
  fireEvent.click(drawButton());
  act(() => {
    vi.advanceTimersByTime(SHAKE_MS + STICK_MS);
  });
};

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2026-11-19 12:00（ローカル時刻）に固定
    vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
    // Math.random を 0 に固定 → 大吉・第一番
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("最初は御神籤箱と「おみくじを引く」ボタンが表示される", () => {
    render(<App />);
    expect(
      screen.getByText("心を落ち着けて、ボタンを押してください"),
    ).toBeInTheDocument();
    expect(drawButton()).toHaveTextContent("おみくじを引く");
    expect(drawButton()).toBeEnabled();
  });

  it("引く → 揺れる → 番号が出る → 結果、の順に進む", () => {
    render(<App />);
    fireEvent.click(drawButton());

    // 揺れている間はボタンが押せない
    expect(screen.getByText("カラカラ…")).toBeInTheDocument();
    expect(drawButton()).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(SHAKE_MS);
    });
    expect(screen.getByText("第一番")).toBeInTheDocument();
    expect(drawButton()).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(STICK_MS);
    });
    expect(screen.getByText("大吉")).toBeInTheDocument();
    expect(screen.getByText("第一番")).toBeInTheDocument();
    expect(screen.getByText("願望")).toBeInTheDocument();
    expect(screen.getByText("健康")).toBeInTheDocument();
    expect(drawButton()).toHaveTextContent("もう一度引く");
    expect(drawButton()).toBeEnabled();
  });

  // Math.random の値と運勢: 0 → 大吉 / 0.3 → 中吉 / 0.95 → 凶
  it.each([
    [0, "大吉", "rank-best"],
    [0.3, "中吉", "rank-normal"],
    [0.95, "凶", "rank-bad"],
  ])(
    "Math.random() = %f のとき %s は %s で表示される",
    (r, rank, className) => {
      vi.spyOn(Math, "random").mockReturnValue(r);
      render(<App />);
      fireEvent.click(drawButton());
      act(() => {
        vi.advanceTimersByTime(SHAKE_MS + STICK_MS);
      });

      expect(screen.getByText(rank)).toHaveClass("slip-rank", className);
    },
  );

  it("結果が出たら履歴に保存される", () => {
    render(<App />);
    fireEvent.click(drawButton());
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS + STICK_MS);
    });

    const stored = JSON.parse(localStorage.getItem("omikuji-history") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].rank).toBe("大吉");
  });

  it("結果が出る前は履歴に保存されない", () => {
    render(<App />);
    fireEvent.click(drawButton());
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS);
    });

    expect(localStorage.getItem("omikuji-history")).toBeNull();
  });

  it("履歴が空のときはメッセージが出る", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "履歴" }));

    expect(screen.getByText("まだ引いていません。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  it("引いた結果が履歴に並び、消すこともできる", () => {
    render(<App />);
    fireEvent.click(drawButton());
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS + STICK_MS);
    });

    fireEvent.click(screen.getByRole("button", { name: "履歴" }));
    expect(screen.getByText("これまでのおみくじ")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "履歴を消す" }));
    expect(screen.getByText("まだ引いていません。")).toBeInTheDocument();
  });

  it("beforeinstallprompt が来たらインストールボタンが出る", () => {
    render(<App />);
    expect(
      screen.queryByRole("button", { name: "インストール" }),
    ).not.toBeInTheDocument();

    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(
      screen.getByRole("button", { name: "インストール" }),
    ).toBeInTheDocument();
  });

  it("インストールボタンを押すとプロンプトが出て、ボタンが消える", async () => {
    render(<App />);

    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "インストール" }));
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "インストール" }),
    ).not.toBeInTheDocument();
  });

  it("appinstalled が来たらインストールボタンが消える", () => {
    render(<App />);

    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(
      screen.getByRole("button", { name: "インストール" }),
    ).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(
      screen.queryByRole("button", { name: "インストール" }),
    ).not.toBeInTheDocument();
  });

  describe("1 日に引ける回数の制限", () => {
    const HOUR = 60 * 60 * 1000;

    it("最初は「今日はあと 3 回」と表示され、リセットボタンはない", () => {
      render(<App />);
      expect(screen.getByText("今日はあと 3 回引けます")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "リセット" }),
      ).not.toBeInTheDocument();
    });

    it("引くたびに残りの回数が減る", () => {
      render(<App />);
      drawOnce();
      expect(screen.getByText("今日はあと 2 回引けます")).toBeInTheDocument();
      drawOnce();
      expect(screen.getByText("今日はあと 1 回引けます")).toBeInTheDocument();
    });

    it("3 回引くと、その日はもう引けない", () => {
      render(<App />);
      drawOnce();
      drawOnce();
      drawOnce();

      expect(
        screen.getByText("今日は 3 回引きました。また明日引いてください。"),
      ).toBeInTheDocument();
      expect(drawButton()).toBeDisabled();

      // 押しても何も起きず、履歴も 3 件のまま
      fireEvent.click(drawButton());
      expect(screen.queryByText("カラカラ…")).not.toBeInTheDocument();
      expect(
        JSON.parse(localStorage.getItem("omikuji-history") ?? "[]"),
      ).toHaveLength(3);
    });

    it("開いたまま次の日になると、また 3 回引ける", () => {
      render(<App />);
      drawOnce();
      drawOnce();
      drawOnce();
      expect(drawButton()).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(12 * HOUR);
      });

      expect(screen.getByText("今日はあと 3 回引けます")).toBeInTheDocument();
      expect(drawButton()).toBeEnabled();
    });

    it("同じ日に開き直しても回数は引き継がれる", () => {
      const { unmount } = render(<App />);
      drawOnce();
      drawOnce();
      unmount();

      render(<App />);
      expect(screen.getByText("今日はあと 1 回引けます")).toBeInTheDocument();
    });

    it("次の日に開き直すと、また 3 回引ける", () => {
      const { unmount } = render(<App />);
      drawOnce();
      drawOnce();
      drawOnce();
      unmount();

      vi.setSystemTime(new Date(2026, 10, 20, 8, 0, 0));
      render(<App />);
      expect(screen.getByText("今日はあと 3 回引けます")).toBeInTheDocument();
      expect(drawButton()).toBeEnabled();
    });

    it("回数は引き始めた時点で数える（途中で再読み込みしても戻らない）", () => {
      render(<App />);
      fireEvent.click(drawButton());

      expect(
        JSON.parse(localStorage.getItem("omikuji-draws") ?? "null"),
      ).toEqual({
        date: "2026-11-19",
        count: 1,
      });
    });
  });
});
