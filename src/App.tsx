import { useEffect, useRef, useState } from "react";
import { drawFortune, type Fortune, toKanjiNumber } from "./omikuji";
import { MAX_DRAWS, useDrawCount } from "./useDrawCount";
import { useHistory } from "./useHistory";

type Phase = "idle" | "shaking" | "stick" | "result";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SHAKE_MS = 1400;
const STICK_MS = 1100;

const rankClass = (rank: Fortune["rank"]) =>
  rank === "大吉" ? "rank-best" : rank === "凶" ? "rank-bad" : "rank-normal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const { history, add, clear } = useHistory();
  const { remaining, canDraw, increment } = useDrawCount();
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const busy = phase === "shaking" || phase === "stick";

  const draw = () => {
    // 引いている途中や今日の回数を使い切ったときはボタンが無効なので、ここへは来ない
    /* v8 ignore next -- @preserve */
    if (busy || !canDraw) return;
    increment();
    const f = drawFortune();
    setFortune(f);
    setShowHistory(false);
    setPhase("shaking");
    navigator.vibrate?.([60, 40, 60, 40, 60]);
    timers.current = [
      window.setTimeout(() => setPhase("stick"), SHAKE_MS),
      window.setTimeout(() => {
        setPhase("result");
        add(f);
      }, SHAKE_MS + STICK_MS),
    ];
  };

  const install = async () => {
    // ボタンは installEvent があるときだけ表示されるので、ここへは来ない
    /* v8 ignore next -- @preserve */
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>おみくじ</h1>
        <div className="header-actions">
          {installEvent && (
            <button type="button" className="ghost" onClick={install}>
              インストール
            </button>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => setShowHistory((v) => !v)}
            disabled={busy}
            aria-pressed={showHistory}
          >
            {showHistory ? "閉じる" : "履歴"}
          </button>
        </div>
      </header>

      <main className="main">
        {showHistory ? (
          <section className="history">
            <h2>これまでのおみくじ</h2>
            {history.length === 0 ? (
              <p className="muted">まだ引いていません。</p>
            ) : (
              <>
                <ul>
                  {history.map((h) => (
                    <li key={h.id}>
                      <span className={`history-rank ${rankClass(h.rank)}`}>
                        {h.rank}
                      </span>
                      <span className="history-no">
                        第{toKanjiNumber(h.number)}番
                      </span>
                      <span className="history-date">
                        {formatDate(h.drawnAt)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="ghost danger" onClick={clear}>
                  履歴を消す
                </button>
              </>
            )}
          </section>
        ) : phase === "result" && fortune ? (
          <section className="slip" key={fortune.id}>
            <div className="slip-head">
              <span className="slip-no">
                第{toKanjiNumber(fortune.number)}番
              </span>
              <span className={`slip-rank ${rankClass(fortune.rank)}`}>
                {fortune.rank}
              </span>
            </div>
            <p className="slip-message">{fortune.message}</p>
            <dl className="slip-details">
              {fortune.details.map((d) => (
                <div key={d.label}>
                  <dt>{d.label}</dt>
                  <dd>{d.text}</dd>
                </div>
              ))}
            </dl>
            <div className="slip-lucky">
              <span>幸運の色：{fortune.luckyColor}</span>
              <span>幸運の品：{fortune.luckyItem}</span>
            </div>
          </section>
        ) : (
          <section className="stage">
            <div
              className={`box ${phase === "shaking" ? "shaking" : ""}`}
              aria-hidden="true"
            >
              <div className={`stick ${phase === "stick" ? "out" : ""}`}>
                {fortune && phase === "stick" && (
                  <span>{toKanjiNumber(fortune.number)}</span>
                )}
              </div>
              <div className="box-body">
                <span>御</span>
                <span>神</span>
                <span>籤</span>
              </div>
            </div>
            <p className="hint">
              {phase === "shaking"
                ? "カラカラ…"
                : phase === "stick"
                  ? `第${fortune ? toKanjiNumber(fortune.number) : /* v8 ignore next -- @preserve */ ""}番`
                  : "心を落ち着けて、ボタンを押してください"}
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p className="remaining" aria-live="polite">
          {canDraw
            ? `今日はあと ${remaining} 回引けます`
            : `今日は ${MAX_DRAWS} 回引きました。また明日引いてください。`}
        </p>
        <button
          type="button"
          className="primary"
          onClick={draw}
          disabled={busy || !canDraw}
        >
          {phase === "result" ? "もう一度引く" : "おみくじを引く"}
        </button>
      </footer>
    </div>
  );
}
