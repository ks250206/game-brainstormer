# 検証記録 — 2026-11-09

## 機能追加（テーマ・説明ポップアップ・11分類・カイヨワの遊びの地図）

Node 26.13.0 / pnpm 12.18.0（`pnpm install --frozen-lockfile`、依存の追加なし）で実行。
- `pnpm typecheck`：成功。
- `pnpm test`：37件すべて成功（[core-test-results.txt](core-test-results.txt)）。新規：分類の網羅、注釈の網羅と値域、カイヨワの軸・象限、ボードの比率と空白、提案の決定性、手動配置の検証・取り消し、旧JSONの互換。
- `pnpm data:build`：429タグ・203メカニクスすべてが分類・注釈に1件ずつ対応することを生成時に検証。
- `pnpm build`：クライアント・SSR・HTMLプリレンダーの全工程が成功。Astryx PopoverとSegmentedControlもSSR可能。
- React版Playwright E2E：8件成功（既存5件＋テーマ切替と再読み込み後の保持、タグ／メカニクス／分類の説明ポップアップ、遊びの地図の表示・空白からの追加・キーボード配置・自動位置への復帰）。`tests/screenshots.spec.ts` の撮影2件も成功し、`docs/images/react-*.png` を生成。
  - この環境ではプロジェクトのPlaywright 1.65用ブラウザを取得できないため、リポジトリ外の一時設定で起動ファイルだけを同梱済みChromiumに差し替えて実行。テスト内容と `playwright.config.ts` は変更していません。
- ポータブル版 `tests/portable-smoke.py`：16項目すべて成功（分類タイル数の期待値を12に更新）。README用のポータブル版画像を再生成。
- 手動確認：ライト／ダーク／OS追従、ドラッグによる手動配置（クリックだけでは固定されない）、Undo、390px幅でのポップアップとメニュー内テーマ切替。
- 既知の既存事象：Astryx `Button variant="primary"`（「反応を試す」）の背景が透明に描画される。変更前のコミットでも同じであることを確認済みで、今回の変更範囲外。


## 公開準備での追加検証

2026-11-09、Node 26.13.0 / pnpm 12.18.0で実パッケージをインストールし、生成されたlockfileを保存。
- `pnpm install --offline`：成功。Astryxの案内用postinstallは明示的に無効化。
- `pnpm typecheck`：成功。
- `pnpm test`：28件すべて成功。
- `pnpm build`：クライアント・SSR・HTMLプリレンダーの全工程が成功。
- メインReact版の実ブラウザスモークテスト：検索、カード追加、Undo/Redo、再読み込み後のlocalStorage復元、仮説生成が成功。
- 既存のPlaywright E2Eスイート全体は、このローカル環境では未実行。GitHub Actionsの結果を別途確認する。
- ビルド警告：大きなJSチャンク、依存パッケージの `use client` ディレクティブ。ビルドを妨げない。

以下は最初の成果物作成時の記録。上記の追加検証が後の状態です。

## 実行済み

- データ生成: 429タグ、203メカニクス、500融合例、45企画。ID・参照・意味分類を検証。
- Node **22.16.0** の `--experimental-strip-types` を使って共有コアの **28テストが成功**。
- TypeScriptによる共有コアとポータブルレンダラーのstrict型検査が成功。
- ポータブル単体HTMLのビルドが成功。HTML/CSS/JavaScript/データを1ファイルに内包。
- Chromium + Python Playwrightで **16項目のブラウザ検証が成功**。
  検索、429/203件の列挙、章フィルター、カード追加、Undo/Redo、仮説生成と編集、
  テキストのエスケープ、接続、ドラッグ、付箋、複製・削除、JSON書き出し・追加読み込み、
  不正JSONの拒否、ヘルプ、390pxモバイルパネルを確認。
- 実行時の外部リクエスト0件、ブラウザJavaScript例外0件を確認。
- READMEに掲載した4枚の画像は、このポータブル版の実レンダリングから取得。

ブラウザのURLアクセス制限により、`file://` と localhostへのナビゲーションが拒否されました。
そのためHTML全文を Playwright `set_content` で読み込んで検証しています。
このoriginではネイティブlocalStorageが使えず、画像右上に「JSONで保存」と表示されます。
保存・復元のコアはStorage契約のインメモリアダプターで往復テストしましたが、
ブラウザのネイティブlocalStorageをページ再読み込みして確認したものではありません。

機械可読レポート: [portable-test-results.json](portable-test-results.json)

## 未実行・未確認

| 項目 | 理由 / 次の確認 |
|---|---|
| Node 26 / pnpm 12 のインストールと実行 | 作成環境はNode 22。外部パッケージ取得不可 |
| React / Astryx / React Flowの実パッケージに対する完全型検査 | 依存関係をインストールできなかったため |
| Vite Plusの本番SSGビルド、実ハイドレーション | `pnpm install && pnpm typecheck && pnpm build` で確認 |
| メインReact版のE2E | `tests/app.spec.ts` と `tests/screenshots.spec.ts` を実装済み、未実行 |
| GitHubへのpush | 接続ツールは読み取りのみ。ローカルから投入が必要 |
| GitHub Actions / Pages公開 | 未pushなので未実行 |
| 実端末のSafari / iOS | Chromiumの390pxレイアウト検証のみ |

初回のネットワーク利用可能環境で `pnpm-lock.yaml` を生成・コミットし、CIを実行してください。
実行していない項目を「成功」とは扱っていません。
