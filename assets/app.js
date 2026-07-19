/* 共通スクリプト: ナビ生成 / テーマ切替 / 進捗管理 */
(function () {
  "use strict";

  const TRACKS = [
    {
      key: "basics",
      label: "Pythonのきほん",
      icon: "🐍",
      desc: "全4レッスンでゲーム作りに必要なPython文法を身につける共通コース。ここを終えれば、3つの種目のどれからでも始められます。",
      graduation: { href: "../index.html#lessons", dir: "コース修了 →", ttl: "好きな種目を選ぼう" },
      lessons: [
        { id: "basics-01", title: "はじめてのPython", desc: "print・計算・変数。ブラウザでPythonを動かそう", level: 1, time: "15分" },
        { id: "basics-02", title: "リストとくり返し", desc: "ゲーム盤の正体はリスト。インデックスとforループ", level: 1, time: "20分" },
        { id: "basics-03", title: "条件分岐", desc: "if・比較・and/or。勝敗判定と盤内チェックの土台", level: 1, time: "20分" },
        { id: "basics-04", title: "関数", desc: "def・引数・戻り値・タプル。ゲームの部品を作る", level: 1, time: "20分" },
      ],
    },
    {
      key: "othello",
      label: "オセロ",
      icon: "🟩",
      desc: "全7レッスンでオセロを一から実装。ルール実装からAI開発まで、オセロ道場の看板コース。",
      graduation: { href: "../playground.html?tab=lab", dir: "卒業制作 →", ttl: "AI工房で自作AIを試そう" },
      lessons: [
        { id: "lesson02", title: "盤面を作ろう", desc: "2次元リストと二重ループで8×8のオセロ盤を表現する", level: 1, time: "25分" },
        { id: "lesson03", title: "石を置くしくみ", desc: "関数と座標系。盤面に石を置けるようにする", level: 1, time: "25分" },
        { id: "lesson04", title: "石をひっくり返す", desc: "オセロの心臓部。8方向に挟んだ石を裏返すロジック", level: 2, time: "35分" },
        { id: "lesson05", title: "打てる場所を探す", desc: "合法手の列挙とパス判定。ルールが完成に近づく", level: 2, time: "25分" },
        { id: "lesson06", title: "ゲームを完成させる", desc: "対戦ループ・終了判定・勝敗発表。1つのゲームが動く", level: 2, time: "30分" },
        { id: "lesson07", title: "対戦AIを作る", desc: "ランダムAIと欲張りAI。AI同士を戦わせて実験する", level: 3, time: "35分" },
        { id: "lesson08", title: "AIをもっと強く", desc: "評価関数と角の戦略。自分だけの改造に挑戦", level: 3, time: "40分+" },
      ],
    },
    {
      key: "gomoku",
      label: "五目並べ",
      icon: "🟫",
      desc: "全6レッスンで五目並べを実装。盤面表現から5つ並び判定、対戦AIと先読み強化まで。",
      graduation: { href: "../playground-gomoku.html?tab=lab", dir: "卒業制作 →", ttl: "AI工房で自作AIを試そう" },
      lessons: [
        { id: "gomoku-01", title: "盤面を作ろう", desc: "9×9の盤面を2次元リストで表現する", level: 1, time: "20分" },
        { id: "gomoku-02", title: "石を置くしくみ", desc: "座標と手番。盤面に交互に石を置けるようにする", level: 1, time: "20分" },
        { id: "gomoku-03", title: "5つ並びの判定", desc: "縦・横・斜め2方向、4つの軸で連続を数える", level: 2, time: "30分" },
        { id: "gomoku-04", title: "ゲームを完成させる", desc: "対戦ループと勝敗判定。1局を最後まで打ち切る", level: 2, time: "25分" },
        { id: "gomoku-05", title: "対戦AIを作る", desc: "勝てる手・防ぐべき手を読むAIを作って対戦させる", level: 3, time: "30分" },
        { id: "gomoku-06", title: "AIをもっと強く", desc: "ダブルリーチの先読み。1手読みAIの壁を越える", level: 3, time: "35分" },
      ],
    },
    {
      key: "connect4",
      label: "コネクトフォー",
      icon: "🟦",
      desc: "全6レッスンでコネクトフォーを実装。重力で落ちる盤面から4つ並び判定、対戦AIと先読み強化まで。",
      graduation: { href: "../playground-connect4.html?tab=lab", dir: "卒業制作 →", ttl: "AI工房で自作AIを試そう" },
      lessons: [
        { id: "connect4-01", title: "盤面を作ろう", desc: "横7×縦6の盤面。正方形ではない盤の座標に慣れる", level: 1, time: "20分" },
        { id: "connect4-02", title: "重力で列に落とす", desc: "座標を直接指定できない。列の一番下の空きを探す", level: 1, time: "25分" },
        { id: "connect4-03", title: "4つ並びの判定", desc: "縦・横・斜め2方向、4つの軸で連続を数える", level: 2, time: "30分" },
        { id: "connect4-04", title: "ゲームを完成させる", desc: "対戦ループと勝敗判定。1局を最後まで打ち切る", level: 2, time: "25分" },
        { id: "connect4-05", title: "対戦AIを作る", desc: "勝てる手・防ぐべき手を読むAIを作って対戦させる", level: 3, time: "30分" },
        { id: "connect4-06", title: "AIをもっと強く", desc: "うっかり手の回避とダブルリーチの先読み", level: 3, time: "35分" },
      ],
    },
  ];

  function trackOf(id) {
    return TRACKS.find((t) => t.lessons.some((l) => l.id === id));
  }

  const PROGRESS_KEY = "pgi-progress";
  const THEME_KEY = "pgi-theme";

  /* ---------- theme ---------- */
  function currentTheme() {
    const param = new URLSearchParams(location.search).get("theme");
    if (param === "light" || param === "dark") return param;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    const btn = document.querySelector(".theme-toggle");
    if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
  }
  applyTheme(currentTheme());

  /* ---------- progress ---------- */
  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }
    catch { return {}; }
  }
  function setDone(id, done) {
    const p = getProgress();
    if (done) p[id] = true; else delete p[id];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }

  /* ---------- header ---------- */
  function pagePath() {
    // lesson pages live in lessons/, others at root
    return location.pathname.includes("/lessons/") ? "../" : "./";
  }

  function buildHeader() {
    const root = pagePath();
    const page = document.body.dataset.page || "";
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="inner">
        <a class="brand" href="${root}index.html">
          <span class="logo"><i></i><i></i><i></i><i></i></span>
          <span>Python×オセロ道場</span>
        </a>
        <nav class="nav-links">
          <a href="${root}index.html" data-page="home">ホーム</a>
          <a href="${root}index.html#lessons" data-page="lessons">レッスン</a>
          <a href="${root}playground.html" data-page="playground" class="keep">プレイグラウンド</a>
          <button class="theme-toggle keep" title="テーマ切替" aria-label="テーマ切替">🌙</button>
        </nav>
      </div>`;
    document.body.prepend(header);
    header.querySelectorAll("a[data-page]").forEach((a) => {
      if (a.dataset.page === page) a.classList.add("active");
    });
    header.querySelector(".theme-toggle").addEventListener("click", () => {
      const next = (document.documentElement.dataset.theme === "dark") ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
    applyTheme(currentTheme());
  }

  /* ---------- footer ---------- */
  function buildFooter() {
    const f = document.createElement("footer");
    f.className = "site-footer";
    f.innerHTML = `
      <div class="brand-mini">Python×オセロ道場</div>
      <div>ブラウザだけで学べる、ゲームプログラミング入門。コードはすべてあなたの手で動かせます。</div>`;
    document.body.append(f);
  }

  /* ---------- lesson sidebar & nav ---------- */
  function buildLessonChrome() {
    const cur = document.body.dataset.lesson; // e.g. "lesson03" / "gomoku-02"
    if (!cur) return;
    const track = trackOf(cur);
    // TRACKS未登録のID(追加忘れ・タイポ)でも完了ボタンだけは生かし、警告で気づけるようにする
    if (!track) console.warn(`[pgi] 未登録のレッスンID: ${cur} — assets/app.js の TRACKS に追加した?`);
    const lessons = track ? track.lessons : [];
    const progress = getProgress();
    const idx = lessons.findIndex((l) => l.id === cur);

    // sidebar
    const aside = document.querySelector(".sidebar");
    if (aside && track) {
      const items = lessons.map((l, i) => {
        const cls = [l.id === cur ? "active" : "", progress[l.id] ? "done" : ""].join(" ").trim();
        return `<li><a class="${cls}" data-lid="${l.id}" href="${l.id}.html">
          <span class="ln"><span>${i + 1}</span></span><span class="txt">${l.title}</span></a></li>`;
      }).join("");
      const others = TRACKS.filter((t) => t.key !== track.key).map((t) => {
        const first = t.lessons[0];
        return `<a href="${first.id}.html"><span class="ti">${t.icon}</span>${t.label}</a>`;
      }).join("");
      aside.innerHTML = `<h4>${track.label} レッスン一覧</h4><ol>${items}</ol>` +
        `<div class="sidebar-tracks"><h4>他のコース</h4>${others}</div>`;
    }

    // prev / next
    const navHost = document.querySelector(".lesson-nav");
    if (navHost && idx >= 0) {
      let html = "";
      if (idx > 0) {
        const p = lessons[idx - 1];
        html += `<a class="prev" href="${p.id}.html"><div class="dir">← 前のレッスン</div><div class="ttl">${idx}. ${p.title}</div></a>`;
      }
      if (idx < lessons.length - 1) {
        const n = lessons[idx + 1];
        html += `<a class="next" href="${n.id}.html"><div class="dir">次のレッスン →</div><div class="ttl">${idx + 2}. ${n.title}</div></a>`;
      } else {
        const g = track.graduation;
        html += `<a class="next" href="${g.href}"><div class="dir">${g.dir}</div><div class="ttl">${g.ttl}</div></a>`;
      }
      navHost.innerHTML = html;
    }

    // complete button
    const row = document.querySelector(".complete-row");
    if (row) {
      const btn = document.createElement("button");
      btn.className = "btn btn-complete";
      const render = () => {
        const done = !!getProgress()[cur];
        btn.classList.toggle("done", done);
        btn.textContent = done ? "✓ レッスン完了！おつかれさま" : "このレッスンを完了にする";
      };
      btn.addEventListener("click", () => {
        setDone(cur, !getProgress()[cur]);
        render();
        buildLessonChrome0();
      });
      render();
      row.append(btn);
    }

    function buildLessonChrome0() {
      // re-render sidebar checkmarks only(位置対応ではなく data-lid で対応付ける)
      const p2 = getProgress();
      document.querySelectorAll(".sidebar ol a[data-lid]").forEach((a) => {
        a.classList.toggle("done", !!p2[a.dataset.lid]);
      });
    }
  }

  /* ---------- index page ---------- */
  function buildIndex() {
    const host = document.querySelector("[data-auto-tracks]");
    if (!host) return;
    const progress = getProgress();
    const lv = { 1: ["lv1", "きほん"], 2: ["lv2", "ステップアップ"], 3: ["lv3", "チャレンジ"] };

    const doneOf = (track) => track.lessons.filter((l) => progress[l.id]).length;
    const totalDone = TRACKS.reduce((s, t) => s + doneOf(t), 0);
    const totalCount = TRACKS.reduce((s, t) => s + t.lessons.length, 0);

    const blockOf = (track) => {
      const doneCount = doneOf(track);
      const pct = Math.round((doneCount / track.lessons.length) * 100);
      const cards = track.lessons.map((l, i) => `
        <a class="lesson-card ${progress[l.id] ? "done" : ""}" href="lessons/${l.id}.html">
          <span class="num">${String(i + 1).padStart(2, "0")}</span>
          <span>
            <h3>${l.title}</h3>
            <p>${l.desc}</p>
            <span class="meta">
              <span class="tag ${lv[l.level][0]}">${lv[l.level][1]}</span>
              <span class="tag">⏱ ${l.time}</span>
            </span>
          </span>
          <span class="done-mark">✓ 完了</span>
        </a>`).join("");
      return `
        <div class="track-block">
          <div class="track-head">
            <h3><span class="track-icon">${track.icon}</span>${track.label}</h3>
            <div class="track-progress">
              <span class="progress-label track-progress-label">${doneCount} / ${track.lessons.length}</span>
              <div class="progress-track track-progress-track"><div class="progress-fill" data-w="${pct}"></div></div>
            </div>
          </div>
          <p class="track-desc">${track.desc}</p>
          <div class="lesson-grid">${cards}</div>
        </div>`;
    };
    // 基礎コースは常に表示、3種目はタブで選んで切り替える(対等な分岐)
    const TAB_KEY = "pgi-index-track";
    const basicsHtml = TRACKS.filter((t) => t.key === "basics").map(blockOf).join("");
    const games = TRACKS.filter((t) => t.key !== "basics");
    let selected = localStorage.getItem(TAB_KEY);
    if (!games.some((t) => t.key === selected)) selected = games[0].key;
    const tabs = games.map((t) => `
      <button class="track-tab ${t.key === selected ? "active" : ""}" data-track="${t.key}" role="tab" aria-selected="${t.key === selected}">
        <span class="ti">${t.icon}</span>${t.label}
        <span class="track-tab-count">${doneOf(t)}/${t.lessons.length}</span>
      </button>`).join("");
    const panes = games.map((t) => `
      <div class="track-pane ${t.key === selected ? "active" : ""}" data-track-pane="${t.key}">${blockOf(t)}</div>`).join("");
    host.innerHTML = basicsHtml +
      `<div class="track-switch"><h3 class="track-switch-label">種目を選ぶ</h3><div class="track-tabs" role="tablist">${tabs}</div>${panes}</div>`;

    host.querySelectorAll(".track-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.track;
        localStorage.setItem(TAB_KEY, key);
        host.querySelectorAll(".track-tab").forEach((b) => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        host.querySelectorAll(".track-pane").forEach((p) => p.classList.toggle("active", p.dataset.trackPane === key));
      });
    });

    const fill = document.querySelector(".progress-wrap .progress-fill");
    const label = document.querySelector(".progress-wrap .progress-label");
    if (label) label.textContent = `全体の進捗 ${totalDone} / ${totalCount} レッスン`;
    // 挿入直後の1フレーム後に幅を入れると、CSSトランジションで伸びるアニメーションになる
    requestAnimationFrame(() => {
      host.querySelectorAll(".track-progress-track .progress-fill").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      });
      if (fill) fill.style.width = (totalDone / totalCount * 100) + "%";
    });
  }

  /* ---------- 盤面ビジュアル(共通ビルダー) ----------
     rows: ["...●○...", ...] 形式。文字: . 空 / ● 黒 / ○ 白 / * ヒント / ★ 注目 / × 危険
     theme: "othello"(既定・塗りつぶし) / "gomoku"(交点表示) / "connect4"(色違いの塗りつぶし) */
  function buildBoardGrid(rows, cellPx, theme) {
    theme = theme || "othello";
    const grid = document.createElement("div");
    grid.className = theme === "othello" ? "sb" : `sb sb-${theme}`;
    if (cellPx) grid.style.setProperty("--sb-cell", cellPx);
    const width = Array.from(rows[0]).length;
    const height = rows.length;
    grid.style.gridTemplateColumns = `repeat(${width}, var(--sb-cell, 34px))`;
    rows.forEach((row, r) => {
      Array.from(row).forEach((ch, c) => {
        const cell = document.createElement("div");
        cell.className = "c";
        if (theme === "gomoku") {
          if (r === 0) cell.classList.add("edge-t");
          if (r === height - 1) cell.classList.add("edge-b");
          if (c === 0) cell.classList.add("edge-l");
          if (c === width - 1) cell.classList.add("edge-r");
          const lh = document.createElement("span");
          lh.className = "gl gl-h";
          const lv2 = document.createElement("span");
          lv2.className = "gl gl-v";
          cell.append(lh, lv2);
        }
        if (ch === "●") cell.insertAdjacentHTML("beforeend", '<div class="d B"></div>');
        else if (ch === "○") cell.insertAdjacentHTML("beforeend", '<div class="d W"></div>');
        else if (ch === "*") cell.classList.add("hint");
        else if (ch === "★") cell.classList.add("mark");
        else if (ch === "×") cell.classList.add("bad");
        grid.append(cell);
      });
    });
    return grid;
  }
  window.PGIBoard = { buildBoardGrid };

  /* 本文中の静的図解 <div class="static-board" data-rows="..|.." data-caption="..." data-theme="gomoku"> */
  function buildStaticBoards() {
    document.querySelectorAll(".static-board[data-rows]").forEach((host) => {
      const rows = host.dataset.rows.split("|");
      // テーマは要素指定がなければページの盤面テーマ(body[data-board-theme])に従う。runner.js の自動ビジュアルと同じ解決順
      host.append(buildBoardGrid(rows, host.dataset.cell || "34px", host.dataset.theme || document.body.dataset.boardTheme));
      if (host.dataset.caption) {
        const cap = document.createElement("div");
        cap.className = "sb-caption";
        cap.textContent = host.dataset.caption;
        host.append(cap);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildHeader();
    buildLessonChrome();
    buildIndex();
    buildStaticBoards();
    buildFooter();
  });
})();
