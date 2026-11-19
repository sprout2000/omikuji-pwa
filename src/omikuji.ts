export type FortuneRank = "大吉" | "中吉" | "小吉" | "吉" | "末吉" | "凶";

export interface Fortune {
  id: string;
  rank: FortuneRank;
  number: number;
  message: string;
  details: { label: string; text: string }[];
  luckyColor: string;
  luckyItem: string;
  drawnAt: string;
}

/** 出現の重み（合計100） */
const RANK_WEIGHTS: [FortuneRank, number][] = [
  ["大吉", 16],
  ["中吉", 20],
  ["小吉", 20],
  ["吉", 22],
  ["末吉", 14],
  ["凶", 8],
];

const MESSAGES: Record<FortuneRank, string[]> = {
  大吉: [
    "天の時、地の利、人の和がそろう吉日。思い切って一歩を踏み出せば、望む以上の実りがあるでしょう。",
    "雲ひとつない空のように、行く手を遮るものはありません。感謝の心を忘れずに。",
  ],
  中吉: [
    "努力が形になり始める時。焦らず歩みを続ければ、良い知らせが届きます。",
    "周りの人の助けが運を開きます。素直に頼ることも大切です。",
  ],
  小吉: [
    "小さな喜びが積み重なる日。身近な幸せに目を向けましょう。",
    "控えめな心がけが吉。欲張らなければ穏やかに過ごせます。",
  ],
  吉: [
    "平穏の中に幸いあり。いつも通りを丁寧に続けることが開運の鍵です。",
    "迷ったときは初心に立ち返りましょう。道はおのずと開けます。",
  ],
  末吉: [
    "今は芽が土の中にある時。じっくり力を蓄えれば、後に大きく花開きます。",
    "物事は後半に向けて良くなります。最後まであきらめないこと。",
  ],
  凶: [
    "今は慎みの時。無理をせず足元を固めれば、災いは転じて福となります。",
    "雨のあとには虹が出るもの。焦らず、心を静かに保ちましょう。",
  ],
};

type Tone = "good" | "mid" | "bad";

const DETAIL_TEXTS: Record<string, Record<Tone, string[]>> = {
  願望: {
    good: ["思いのままに叶う", "人の助けを得て叶う"],
    mid: ["時間はかかるが叶う", "焦らなければ叶う"],
    bad: ["今は控えよ", "望みを小さくすれば吉"],
  },
  待人: {
    good: ["来る、喜びあり", "便りあり、早く来る"],
    mid: ["遅れて来る", "音信あり"],
    bad: ["来ず", "待たずに自ら動け"],
  },
  失物: {
    good: ["すぐに見つかる", "身近なところにあり"],
    mid: ["出るが時間がかかる", "高いところを探せ"],
    bad: ["出にくい", "人に尋ねよ"],
  },
  旅行: {
    good: ["どこへ行っても吉", "東の方角が吉"],
    mid: ["近場ならよし", "連れがあれば吉"],
    bad: ["急ぐ旅は避けよ", "準備を万全に"],
  },
  商売: {
    good: ["大いに利益あり", "新しい事を始めて吉"],
    mid: ["利益は少しずつ", "堅実にせよ"],
    bad: ["損をしやすい、慎め", "今は守りに徹せよ"],
  },
  学問: {
    good: ["努力が実る", "自信を持って励め"],
    mid: ["油断せず続けよ", "基礎を固めよ"],
    bad: ["気を散らすな", "復習を重んじよ"],
  },
  恋愛: {
    good: ["想いが通じる", "良き縁あり"],
    mid: ["誠実さが鍵", "焦らず待て"],
    bad: ["今は自分を磨け", "言葉に気をつけよ"],
  },
  健康: {
    good: ["心身ともに健やか", "活力に満ちる"],
    mid: ["無理をしなければよし", "早寝早起きを心がけよ"],
    bad: ["養生せよ", "食事に気をつけよ"],
  },
};

const LUCKY_COLORS = [
  "赤",
  "白",
  "金",
  "紺",
  "若草色",
  "桜色",
  "山吹色",
  "紫",
  "水色",
  "橙",
];
const LUCKY_ITEMS = [
  "お守り",
  "手鏡",
  "万年筆",
  "和菓子",
  "扇子",
  "手ぬぐい",
  "鈴",
  "本",
  "腕時計",
  "花",
];

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

function toneOf(rank: FortuneRank): Tone[] {
  switch (rank) {
    case "大吉":
      return ["good", "good", "good", "mid"];
    case "中吉":
      return ["good", "good", "mid"];
    case "小吉":
    case "吉":
      return ["good", "mid", "mid"];
    case "末吉":
      return ["mid", "mid", "bad"];
    case "凶":
      return ["mid", "bad", "bad"];
  }
}

function drawRank(): FortuneRank {
  const total = RANK_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [rank, w] of RANK_WEIGHTS) {
    r -= w;
    if (r < 0) return rank;
  }
  // Math.random() は 1 未満なので、ループ内で必ず return される
  /* v8 ignore next -- @preserve */
  return "吉";
}

const KANJI_DIGITS = [
  "〇",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];

/** 1〜99 を漢数字に（例: 23 → 二十三） */
export function toKanjiNumber(n: number): string {
  if (n < 10) return KANJI_DIGITS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens === 1 ? "" : KANJI_DIGITS[tens]}十${ones ? KANJI_DIGITS[ones] : ""}`;
}

export function drawFortune(): Fortune {
  const rank = drawRank();
  const tones = toneOf(rank);
  return {
    id: crypto.randomUUID(),
    rank,
    number: Math.floor(Math.random() * 99) + 1,
    message: pick(MESSAGES[rank]),
    details: Object.entries(DETAIL_TEXTS).map(([label, texts]) => ({
      label,
      text: pick(texts[pick(tones)]),
    })),
    luckyColor: pick(LUCKY_COLORS),
    luckyItem: pick(LUCKY_ITEMS),
    drawnAt: new Date().toISOString(),
  };
}
