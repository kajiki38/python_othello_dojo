# Python×オセロ道場

プログラミング初心者〜中級者向けの、**ブラウザだけで完結する**ゲームプログラミング学習サイトです。
Pythonでオセロ(リバーシ)を1から作りながら、変数・リスト・関数・ループから対戦AIの設計までを学びます。

## 使い方

**`index.html` をブラウザで開くだけ**です(Chrome / Edge / Firefox 推奨)。
インストールは不要ですが、初回のPython実行時に [Pyodide](https://pyodide.org/)(ブラウザ版Python)をCDNから読み込むため、**インターネット接続が必要**です。

ローカルサーバーで開きたい場合(任意):

```
npx serve .
```

## コンテンツ構成

| ページ | 内容 |
|---|---|
| `index.html` | トップページ(カリキュラム一覧・進捗表示) |
| `lessons/lesson01.html` | はじめの一歩 — print・変数・リスト |
| `lessons/lesson02.html` | 盤面を作ろう — 2次元リスト |
| `lessons/lesson03.html` | 石を置くしくみ — 関数・座標・8方向 |
| `lessons/lesson04.html` | 石をひっくり返す — 挟み判定(山場!) |
| `lessons/lesson05.html` | 打てる場所を探す — 合法手・パス |
| `lessons/lesson06.html` | ゲームを完成させる — ゲームループ |
| `lessons/lesson07.html` | 対戦AIを作る — ランダムAI・欲張りAI |
| `lessons/lesson08.html` | AIをもっと強く — 評価関数・重みテーブル |
| `playground.html` | 🎮 クリック対戦 / 🔬 自作AI工房 / 📖 エンジン全ソース |

## 特徴

- **全サンプルコードがその場で実行・編集可能**(Pyodide + CodeMirror)
- レッスン後半は「前回までのコード」を自動読み込みするので、新しい部分だけに集中できる
- エラーは初心者向けのヒント付きで表示、行番号もエディタ基準に自動補正
- 進捗・テーマ(ライト/ダーク)は `localStorage` に保存
- プレイグラウンドでは、レッスンで書いたのと同じ `my_ai(board, color, moves)` 関数を書いて内蔵AI(3段階)と自動対戦できる

## 技術メモ

- 純粋な静的サイト(ビルド不要)。外部依存は CDN の Pyodide v0.26.4 / CodeMirror 5 / Google Fonts のみ
- サイト内の全Pythonサンプル(30ウィジェット+チャレンジ解答+エンジン)は Node + Pyodide の自動テストで実行検証済み
