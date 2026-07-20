# tests — 検証ハーネス

サイトの実行検証スイート。Node.js(18+)と、UIテストにはMicrosoft Edgeが必要です。

```
cd tests
npm install
npm test            # 全部(Python実行+UI実操作。10〜20分)
npm run test:python # Pythonエンジン系のみ(数分)
npm run test:ui     # ブラウザ実操作のみ
```

Edgeの場所が既定と違う場合は `EDGE_PATH` 環境変数で指定してください。

## 内容

| スクリプト | 検証内容 |
|---|---|
| `test-all-lessons.mjs` | 全レッスンの実行ウィジェット(プリアンブル解決込み)をpyodideで実行し、例外ゼロを確認(110件) |
| `verify-challenges.mjs` | 全チャレンジで「スターターが例外なく実行できる」「解答例がテスト全件に合格する」を確認。ランダムなバルクテストを含むため、まれな揺れを疑うときは複数回実行 |
| `ui/mobile-audit.mjs` | 主要ページの390px幅で水平オーバーフローがないことを実測 |
| `ui/challenge-ui-test.mjs` | チャレンジの自動判定UI(スターター→不合格表示、解答例→クリア表示) |
| `ui/touch-test.mjs` | 360pxタッチ操作: 着手→AI応手・タブ切替(3種目) |
| `ui/kb-test.mjs` | キーボード操作: 矢印移動・Enter/Space着手・列選択(3種目) |
| `ui/kifu-test.mjs` | 観戦モードの棋譜コピー(クリップボードはスタブ) |
| `ui/hint-test.mjs` | 入力補完(自分の変数・プリアンブル語・エンジン関数・コメント内抑止) |
| `ui/error-ux-test.mjs` | 文法エラーの波線lint+AI工房のエラー行番号・ハイライト |

すべて終了コードで合否を返します(0=パス)。CDN(Pyodide/CodeMirror)に接続できる環境で実行してください。
