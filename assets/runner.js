/* pyrunner: ブラウザ内Python実行ウィジェット (CodeMirror + Pyodide)
 *
 * 使い方:
 *   <div class="pyrunner" data-name="hello.py">
 *     <script type="text/x-python">print("hi")</script>
 *   </div>
 *
 * オプション:
 *   data-preamble="共有スニペットのid" — 実行前に見えないコードを流し込む
 *   (ページ内の <script type="text/x-python" id="..."> を参照)
 */
(function () {
  "use strict";

  const CM_BASE = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16";
  const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";

  /* ---------- loaders ---------- */
  function loadCss(href) {
    return new Promise((res, rej) => {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      l.onload = res; l.onerror = rej;
      document.head.append(l);
    });
  }
  function loadJs(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.append(s);
    });
  }

  let cmReady = null;
  function ensureCodeMirror() {
    if (!cmReady) {
      cmReady = (async () => {
        await Promise.all([
          loadCss(`${CM_BASE}/codemirror.min.css`),
          loadCss(`${CM_BASE}/theme/material-darker.min.css`),
        ]);
        await loadJs(`${CM_BASE}/codemirror.min.js`);
        await Promise.all([
          loadJs(`${CM_BASE}/mode/python/python.min.js`),
          loadJs(`${CM_BASE}/addon/edit/matchbrackets.min.js`),
          loadJs(`${CM_BASE}/addon/edit/closebrackets.min.js`),
        ]);
      })();
    }
    return cmReady;
  }

  let pyodideReady = null;
  function statusPill() {
    let pill = document.getElementById("py-status");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "py-status";
      pill.innerHTML = `<span class="spinner"></span><span class="msg"></span>`;
      document.body.append(pill);
    }
    return pill;
  }
  function ensurePyodide() {
    if (!pyodideReady) {
      pyodideReady = (async () => {
        const pill = statusPill();
        pill.querySelector(".msg").textContent = "Python環境を準備中…(初回は10秒ほど)";
        pill.classList.add("show");
        try {
          await loadJs(PYODIDE_URL);
          const py = await loadPyodide();
          pill.querySelector(".msg").textContent = "Python 準備完了 ✓";
          pill.querySelector(".spinner").style.display = "none";
          setTimeout(() => pill.classList.remove("show"), 1800);
          return py;
        } catch (e) {
          pill.querySelector(".msg").textContent = "読み込み失敗。ネット接続を確認して再読み込みしてください";
          pill.querySelector(".spinner").style.display = "none";
          throw e;
        }
      })();
    }
    return pyodideReady;
  }

  /* 直列実行キュー(同時Runの衝突防止) */
  let runQueue = Promise.resolve();

  /* ---------- widget ---------- */
  function dedent(src) {
    src = src.replace(/^\n+/, "").replace(/\s+$/, "");
    const lines = src.split("\n");
    let min = Infinity;
    for (const ln of lines) {
      if (!ln.trim()) continue;
      const m = ln.match(/^[ ]*/)[0].length;
      if (m < min) min = m;
    }
    if (!isFinite(min) || min === 0) return src;
    return lines.map((ln) => ln.slice(min)).join("\n");
  }

  function buildWidget(el, index) {
    const srcEl = el.querySelector('script[type="text/x-python"]');
    const original = dedent(srcEl ? srcEl.textContent : "");
    if (srcEl) srcEl.remove();

    const name = el.dataset.name || `code${index + 1}.py`;
    const preambleId = el.dataset.preamble || null;
    const preambleNote = preambleId ? `<span title="これまでのレッスンで作った関数が自動で読み込まれます">📦 前回までのコード読込み済み</span>` : "";

    el.innerHTML = `
      <div class="bar">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="fname">${name} ${preambleNote}</span>
        <button class="reset-btn" title="コードを最初の状態に戻す">↺ リセット</button>
        <button class="run-btn">▶ 実行</button>
      </div>
      <div class="editor-host"></div>
      <div class="out-label">OUTPUT</div>
      <div class="out"></div>
      <div class="viz"></div>`;

    const host = el.querySelector(".editor-host");
    const out = el.querySelector(".out");
    const viz = el.querySelector(".viz");
    const outLabel = el.querySelector(".out-label");
    const runBtn = el.querySelector(".run-btn");
    const resetBtn = el.querySelector(".reset-btn");

    const cm = CodeMirror(host, {
      value: original,
      mode: "python",
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      matchBrackets: true,
      autoCloseBrackets: true,
      viewportMargin: Infinity,
      extraKeys: {
        "Ctrl-Enter": () => runBtn.click(),
        Tab: (cm) => {
          if (cm.somethingSelected()) cm.indentSelection("add");
          else cm.replaceSelection("    ", "end");
        },
      },
    });

    resetBtn.addEventListener("click", () => {
      cm.setValue(original);
      out.classList.remove("show");
      outLabel.classList.remove("show");
      out.innerHTML = "";
      viz.classList.remove("show");
      viz.innerHTML = "";
    });

    runBtn.addEventListener("click", () => {
      runBtn.disabled = true;
      runBtn.textContent = "⏳ 実行中…";
      out.innerHTML = `<span class="sys">実行しています…</span>`;
      out.classList.add("show");
      outLabel.classList.add("show");

      runQueue = runQueue.then(async () => {
        try {
          const py = await ensurePyodide();
          let code = cm.getValue();
          let lineOffset = 0;   // プリアンブル分の行数(エラー行番号の補正に使う)
          if (preambleId) {
            const pre = document.getElementById(preambleId);
            if (pre) {
              const preCode = dedent(pre.textContent);
              code = preCode + "\n\n" + code;
              lineOffset = preCode.split("\n").length + 1;
            }
          }
          const chunks = [];
          py.setStdout({ batched: (s) => chunks.push(s) });
          py.setStderr({ batched: (s) => chunks.push(s) });
          const ns = py.globals.get("dict")();
          try {
            await py.runPythonAsync(code, { globals: ns });
            const text = chunks.join("\n");
            out.textContent = text.length ? text : "";
            if (!text.length) {
              out.innerHTML = `<span class="sys">(出力はありません — print() を使うとここに表示されます)</span>`;
            }
            renderBoardViz(viz, py, ns);
          } catch (err) {
            viz.classList.remove("show");
            viz.innerHTML = "";
            const doneText = chunks.join("\n");
            out.textContent = doneText ? doneText + "\n" : "";
            const errEl = document.createElement("span");
            errEl.className = "err";
            errEl.textContent = friendlyError(String(err.message || err), lineOffset);
            out.append(errEl);
          } finally {
            ns.destroy();
            py.setStdout({});
            py.setStderr({});
          }
        } catch (e) {
          out.innerHTML = `<span class="err">Python環境の読み込みに失敗しました。ネット接続を確認してページを再読み込みしてください。</span>`;
        } finally {
          runBtn.disabled = false;
          runBtn.textContent = "▶ 実行";
        }
      });
    });
  }

  /* 実行後の名前空間から「盤面らしいリスト」を探して、本物のオセロ盤ビジュアルで表示する */
  const BOARD_SCAN = `__import__("json").dumps({ k: ["".join(r) for r in v]
    for k, v in list(globals().items())
    if not k.startswith("_") and isinstance(v, list) and 3 <= len(v) <= 8
    and all(isinstance(r, list) and len(r) == len(v)
            and all(isinstance(c, str) and len(c) == 1 and c in ".●○*" for c in r) for r in v) })`;

  function renderBoardViz(viz, py, ns) {
    viz.innerHTML = "";
    viz.classList.remove("show");
    if (!window.PGIBoard) return;
    let boards;
    try {
      boards = JSON.parse(py.runPython(BOARD_SCAN, { globals: ns }));
    } catch {
      return;
    }
    const names = Object.keys(boards).slice(0, 4);
    if (!names.length) return;
    for (const name of names) {
      const rows = boards[name];
      const chars = rows.join("");
      const nb = Array.from(chars).filter((c) => c === "●").length;
      const nw = Array.from(chars).filter((c) => c === "○").length;
      const item = document.createElement("div");
      item.className = "viz-item";
      const label = document.createElement("div");
      label.className = "viz-label";
      label.innerHTML = `<span class="vn">${name}</span>` +
        (nb + nw > 0 ? `<span>● ${nb}</span><span>○ ${nw}</span>` : "");
      item.append(label, window.PGIBoard.buildBoardGrid(rows, "30px"));
      viz.append(item);
    }
    viz.classList.add("show");
  }

  /* Pythonのトレースバックから要点だけ抜き出して、初心者向けヒントを添える */
  function friendlyError(msg, lineOffset = 0) {
    if (lineOffset > 0) {
      // プリアンブル分ずれた行番号を、エディタ上の行番号に直す
      msg = msg.replace(/line (\d+)/g, (m, n) => {
        const adj = Number(n) - lineOffset;
        return adj > 0 ? `line ${adj}` : m;
      });
    }
    const lines = msg.trimEnd().split("\n");
    let text = msg.trim();
    if (/^Traceback/.test(lines[0])) {
      // pyodide内部のフレーム(File行+その内容行)を取り除き、ユーザーコード分だけ残す
      const out = [];
      let skip = false;
      for (let i = 1; i < lines.length; i++) {
        const ln = lines[i];
        if (/^\s*File "/.test(ln)) {
          skip = !ln.includes('File "<exec>"');
          if (!skip) out.push(ln.replace(/File "<exec>", /, "").trim());
          continue;
        }
        if (/^\S/.test(ln)) { skip = false; out.push(ln); continue; }  // エラー名の行
        if (!skip) out.push(ln.replace(/^ {4}/, "  "));
      }
      text = out.join("\n").trim() || lines.slice(-2).join("\n");
    }
    const last = lines[lines.length - 1] || "";
    const hints = [
      [/SyntaxError/, "構文エラー: コロン(:)やカッコの閉じ忘れ、全角文字の混入がないか確認しよう"],
      [/IndentationError/, "インデントエラー: 行頭のスペースがずれていないか確認しよう(スペース4つが基本)"],
      [/NameError/, "名前エラー: その変数・関数は定義した?スペルは合ってる?"],
      [/IndexError/, "インデックスエラー: リストの範囲外にアクセスしていないか確認しよう(0〜7の範囲?)"],
      [/TypeError/, "型エラー: 数値と文字列を混ぜていないか、引数の数は合っているか確認しよう"],
    ];
    for (const [re, hint] of hints) {
      if (re.test(last)) { text += `\n\n💡 ${hint}`; break; }
    }
    return text;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // data-manual 付きは自前で管理するウィジェット(プレイグラウンドのAI工房など)なので触らない
    const widgets = Array.from(document.querySelectorAll(".pyrunner:not([data-manual])"));
    if (!widgets.length) return;
    await ensureCodeMirror();
    widgets.forEach(buildWidget);
  });

  /* 他スクリプト(プレイグラウンド)からも使えるように公開 */
  window.PGI = { ensurePyodide, ensureCodeMirror, dedent };
})();
