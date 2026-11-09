# 検証記録 — 2026-11-09

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
