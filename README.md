# おみくじ PWA

Vite + React + TypeScript で作ったおみくじアプリです。PWA としてホーム画面にインストールでき、オフラインでも動きます。

## 機能

- 御神籤箱を振る → 番号の棒が出る → おみくじの紙が開くアニメーション
- 運勢は 大吉・中吉・小吉・吉・末吉・凶（重み付き抽選）
- 願望・待人・失物・旅行・商売・学問・恋愛・健康、幸運の色・品
- 引いた履歴を最新 20 件まで保存（localStorage）
- 1 日に 3 回まで引ける（端末の時刻で午前 0 時に回数が戻る。再読み込みしても戻らない。ただし `npm run dev` のときは再読み込みで戻る）
- 対応ブラウザではヘッダーに「インストール」ボタンを表示

## 使い方

```sh
npm install
npm run dev       # 開発サーバー
npm run build     # 本番ビルド（dist/）
npm run preview   # ビルド結果を確認（Service Worker はこちらで動作確認）
npm test          # テスト（ウォッチモード）
npm run test:run  # テストを 1 回だけ実行
npm run coverage  # カバレッジ付きでテスト（coverage/index.html に詳細）
```

## 主なファイル

- `src/omikuji.ts` … 運勢の確率・文言（ここを編集すれば内容を変えられます）
- `src/App.tsx` … 画面とアニメーションの流れ
- `src/useHistory.ts` … 履歴の保存
- `src/useDrawCount.ts` … 1 日に引いた回数の管理（上限は `MAX_DRAWS`）
- `vite.config.ts` … PWA マニフェスト設定（vite-plugin-pwa）と Vitest の設定
- `src/*.test.ts(x)` … Vitest + Testing Library のテスト
