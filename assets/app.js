/* 共通スクリプト: ナビ生成 / テーマ切替 / 進捗管理 */
(function () {
  "use strict";

  const LESSONS = [
    { id: "lesson01", title: "はじめの一歩", desc: "print・変数・リスト。ブラウザでPythonを動かそう", level: 1, time: "20分" },
    { id: "lesson02", title: "盤面を作ろう", desc: "2次元リストとループで8×8のオセロ盤を表現する", level: 1, time: "25分" },
    { id: "lesson03", title: "石を置くしくみ", desc: "関数と座標系。盤面に石を置けるようにする", level: 1, time: "25分" },
    { id: "lesson04", title: "石をひっくり返す", desc: "オセロの心臓部。8方向に挟んだ石を裏返すロジック", level: 2, time: "35分" },
    { id: "lesson05", title: "打てる場所を探す", desc: "合法手の列挙とパス判定。ルールが完成に近づく", level: 2, time: "25分" },
    { id: "lesson06", title: "ゲームを完成させる", desc: "対戦ループ・終了判定・勝敗発表。1つのゲームが動く", level: 2, time: "30分" },
    { id: "lesson07", title: "対戦AIを作る", desc: "ランダムAIと欲張りAI。AI同士を戦わせて実験する", level: 3, time: "35分" },
    { id: "lesson08", title: "AIをもっと強く", desc: "評価関数と角の戦略。自分だけの改造に挑戦", level: 3, time: "40分+" },
  ];

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
    const cur = document.body.dataset.lesson; // e.g. "lesson03"
    if (!cur) return;
    const progress = getProgress();
    const idx = LESSONS.findIndex((l) => l.id === cur);

    // sidebar
    const aside = document.querySelector(".sidebar");
    if (aside) {
      const items = LESSONS.map((l, i) => {
        const cls = [l.id === cur ? "active" : "", progress[l.id] ? "done" : ""].join(" ").trim();
        return `<li><a class="${cls}" href="${l.id}.html">
          <span class="ln"><span>${i + 1}</span></span><span class="txt">${l.title}</span></a></li>`;
      }).join("");
      aside.innerHTML = `<h4>レッスン一覧</h4><ol>${items}</ol>`;
    }

    // prev / next
    const navHost = document.querySelector(".lesson-nav");
    if (navHost && idx >= 0) {
      let html = "";
      if (idx > 0) {
        const p = LESSONS[idx - 1];
        html += `<a class="prev" href="${p.id}.html"><div class="dir">← 前のレッスン</div><div class="ttl">${idx}. ${p.title}</div></a>`;
      }
      if (idx < LESSONS.length - 1) {
        const n = LESSONS[idx + 1];
        html += `<a class="next" href="${n.id}.html"><div class="dir">次のレッスン →</div><div class="ttl">${idx + 2}. ${n.title}</div></a>`;
      } else {
        html += `<a class="next" href="../playground.html?tab=lab"><div class="dir">卒業制作 →</div><div class="ttl">AI工房で自作AIを試そう</div></a>`;
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
      // re-render sidebar checkmarks only
      const p2 = getProgress();
      document.querySelectorAll(".sidebar a").forEach((a, i) => {
        a.classList.toggle("done", !!p2[LESSONS[i].id]);
      });
    }
  }

  /* ---------- index page ---------- */
  function buildIndex() {
    const grid = document.querySelector(".lesson-grid[data-auto]");
    if (!grid) return;
    const progress = getProgress();
    const lv = { 1: ["lv1", "きほん"], 2: ["lv2", "ステップアップ"], 3: ["lv3", "チャレンジ"] };
    grid.innerHTML = LESSONS.map((l, i) => `
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

    const doneCount = LESSONS.filter((l) => progress[l.id]).length;
    const fill = document.querySelector(".progress-fill");
    const label = document.querySelector(".progress-label");
    if (fill) requestAnimationFrame(() => { fill.style.width = (doneCount / LESSONS.length * 100) + "%"; });
    if (label) label.textContent = `進捗 ${doneCount} / ${LESSONS.length} レッスン`;
  }

  /* ---------- 盤面ビジュアル(共通ビルダー) ----------
     rows: ["...●○...", ...] 形式。文字: . 空 / ● 黒 / ○ 白 / * ヒント / ★ 注目 / × 危険 */
  function buildBoardGrid(rows, cellPx) {
    const grid = document.createElement("div");
    grid.className = "sb";
    if (cellPx) grid.style.setProperty("--sb-cell", cellPx);
    const width = Array.from(rows[0]).length;
    grid.style.gridTemplateColumns = `repeat(${width}, var(--sb-cell, 34px))`;
    for (const row of rows) {
      for (const ch of Array.from(row)) {
        const c = document.createElement("div");
        c.className = "c";
        if (ch === "●") c.innerHTML = '<div class="d B"></div>';
        else if (ch === "○") c.innerHTML = '<div class="d W"></div>';
        else if (ch === "*") c.classList.add("hint");
        else if (ch === "★") c.classList.add("mark");
        else if (ch === "×") c.classList.add("bad");
        grid.append(c);
      }
    }
    return grid;
  }
  window.PGIBoard = { buildBoardGrid };

  /* 本文中の静的図解 <div class="static-board" data-rows="..|.." data-caption="..."> */
  function buildStaticBoards() {
    document.querySelectorAll(".static-board[data-rows]").forEach((host) => {
      const rows = host.dataset.rows.split("|");
      host.append(buildBoardGrid(rows, host.dataset.cell || "34px"));
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
