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
 *
 * 盤面ビジュアルのテーマ切替: <body data-board-theme="gomoku|connect4"> を付けると、
 * そのページ内の全ウィジェットの自動盤面検出(BOARD_SCAN)が該当テーマで描画される。
 * 未指定時は既定の "othello"(オセロ盤スタイル)。
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
          loadCss(`${CM_BASE}/addon/hint/show-hint.min.css`),
          loadCss(`${CM_BASE}/addon/lint/lint.min.css`),
        ]);
        await loadJs(`${CM_BASE}/codemirror.min.js`);
        await Promise.all([
          loadJs(`${CM_BASE}/mode/python/python.min.js`),
          loadJs(`${CM_BASE}/addon/edit/matchbrackets.min.js`),
          loadJs(`${CM_BASE}/addon/edit/closebrackets.min.js`),
          loadJs(`${CM_BASE}/addon/comment/comment.min.js`),
          loadJs(`${CM_BASE}/addon/hint/show-hint.min.js`),
          loadJs(`${CM_BASE}/addon/lint/lint.min.js`),
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

  /* ---------- Python入力補完 ----------
   * 候補 = エディタ内(+プリアンブルやエンジンコード)に出てくる単語 + Pythonキーワード/組み込み。
   * 英字・_ を打つたびに自動で出る(文字列・コメント内は出さない)。Ctrl-Spaceでも呼べる。 */
  const PY_WORDS = (
    "False None True and as assert async await break class continue def del elif else except finally " +
    "for from global if import in is lambda nonlocal not or pass raise return try while with yield " +
    "print len range abs min max sum sorted reversed enumerate zip list dict set tuple str int float " +
    "bool round input isinstance type random"
  ).split(/\s+/);

  function pythonHint(cm, extraText) {
    const cur = cm.getCursor();
    const line = cm.getLine(cur.line);
    let start = cur.ch;
    while (start > 0 && /\w/.test(line.charAt(start - 1))) start--;
    const word = line.slice(start, cur.ch);
    if (!word || /^\d/.test(word)) return null;
    const lower = word.toLowerCase();
    const seen = new Set([word]);
    const docList = [], stdList = [];
    // エディタ内+付随コードの単語(自分の変数・関数名)を優先候補に
    const docWords = new Set();
    const re = /[A-Za-z_][A-Za-z0-9_]*/g;
    const text = cm.getValue() + "\n" + (extraText || "");
    let m;
    while ((m = re.exec(text))) docWords.add(m[0]);
    for (const w of [...docWords].sort()) {
      if (!seen.has(w) && w.toLowerCase().startsWith(lower)) { seen.add(w); docList.push(w); }
    }
    for (const w of PY_WORDS) {
      if (!seen.has(w) && w.toLowerCase().startsWith(lower)) { seen.add(w); stdList.push(w); }
    }
    const list = docList.concat(stdList);
    if (!list.length) return null;
    return { list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, cur.ch) };
  }

  function enablePythonHints(cm, getExtra) {
    cm.setOption("hintOptions", {
      hint: (c) => pythonHint(c, getExtra ? getExtra() : ""),
      completeSingle: false,   // 候補が1つでも勝手に確定しない
    });
    cm.addKeyMap({ "Ctrl-Space": (c) => c.showHint() });
    cm.on("inputRead", (c, change) => {
      // 最初のキー入力でPython環境の読み込みを始めておく(文法チェックと初回実行が速くなる)
      ensureLintFn().then(() => { if (c.performLint) c.performLint(); });
      if (c.state.completionActive) return;
      const typed = change.text[change.text.length - 1];
      if (!typed || !/[A-Za-z_]$/.test(typed)) return;
      const tok = c.getTokenAt(c.getCursor());
      if (/\b(string|comment)\b/.test(tok.type || "")) return;
      c.showHint();
    });
    cm.addOverlay(PY_ESCAPE_OVERLAY);   // ついでに \n \t などのエスケープを色分け
    enablePythonLint(cm);               // 文法エラーの波線表示
  }

  /* ---------- 文法エラーの波線表示(lint) ----------
   * Pythonの compile() で文法チェックし、エラー行に赤い波線+日本語ヒントを表示する。
   * Pyodideが未ロードの間は何もしない(最初のキー入力で読み込みが始まる)。 */
  let lintFnPromise = null;
  function ensureLintFn() {
    if (!lintFnPromise) {
      lintFnPromise = ensurePyodide().then((py) => py.runPython(`
def _pgi_lint(src):
    import json
    try:
        compile(src, "<code>", "exec")
        return json.dumps(None)
    except SyntaxError as e:
        return json.dumps({"line": e.lineno or 1, "col": (e.offset or 1) - 1, "msg": e.msg or "syntax error"})
_pgi_lint`));
    }
    return lintFnPromise;
  }

  function friendlySyntax(msg) {
    const hints = [
      [/expected ':'/, "行末の「:」を忘れていませんか?"],
      [/expected an indented block/, "この行の下に字下げ(スペース4つ)したブロックが必要です"],
      [/unexpected indent/, "字下げ(インデント)がずれています"],
      [/unindent does not match/, "字下げの戻し位置がそろっていません"],
      [/never closed/, "カッコや引用符が閉じていません"],
      [/unterminated string/, "文字列の閉じ引用符がありません"],
      [/invalid non-printable character/, "全角スペースが混ざっていそうです。半角スペースに直しましょう"],
      [/Maybe you meant '=='/, "条件の比較は = ではなく == です"],
      [/cannot assign/, "ここでは代入(=)できません。比較なら == です"],
      [/invalid syntax/, "文法エラーです。この行を見直してみましょう"],
    ];
    for (const [re, jp] of hints) if (re.test(msg)) return `${jp}(${msg})`;
    return msg;
  }

  function enablePythonLint(cm) {
    // 注意: lintアドオンは「lintオプションを設定した時点」の gutters を見て行マーカーの有無を決めるため、
    // gutters を必ず先に設定する
    cm.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-lint-markers"]);
    cm.setOption("lint", {
      async: true,
      delay: 600,
      getAnnotations: (text, update, opts, editor) => {
        if (!lintFnPromise || !text.trim()) { update(editor, []); return; }
        lintFnPromise.then((fn) => {
          const res = JSON.parse(fn(text));
          if (!res) { update(editor, []); return; }
          const line = Math.min(Math.max(0, res.line - 1), editor.lineCount() - 1);
          const lineText = editor.getLine(line) || "";
          // SyntaxErrorのoffsetは行末の外を指すことがある。空範囲のマークはCodeMirrorが
          // 自動破棄して波線が出ないため、必ず「1文字ぶんの範囲」に丸める
          let c1 = Math.min(Math.max(0, res.col), Math.max(0, lineText.length - 1));
          let c2 = Math.min(c1 + 1, lineText.length);
          const ann = { severity: "error", message: friendlySyntax(res.msg) };
          if (c2 > c1) {
            ann.from = CodeMirror.Pos(line, c1);
            ann.to = CodeMirror.Pos(line, c2);
          } else {
            // 空行なら行全体(次行の頭まで)をマークする
            ann.from = CodeMirror.Pos(line, 0);
            ann.to = CodeMirror.Pos(Math.min(line + 1, editor.lineCount() - 1), 0);
          }
          update(editor, [ann]);
        }).catch((err) => {
          console.warn("[pgi-lint]", err);   // lint自体の失敗は波線なし扱い(実行は妨げない)
          update(editor, []);
        });
      },
    });
  }

  /* \n \t \\ \x41 あ などのエスケープシーケンスに "escape" トークンを重ねるオーバーレイ。
   * 基底モードのクラスと合成されるため、CSS側で .cm-string.cm-escape に限定すると
   * 「文字列の中のときだけ」色が変わる(コメント内の \n は対象外)。 */
  const PY_ESCAPE_RE = /^\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|N\{[^}]*\}|[0-7]{1,3}|['"abfnrtv\\])/;
  const PY_ESCAPE_OVERLAY = {
    token: (stream) => {
      if (stream.match(PY_ESCAPE_RE)) return "escape";
      while (stream.next() != null) {
        if (stream.peek() === "\\") break;
      }
      return null;
    },
  };

  function buildWidget(el, index) {
    const srcEl = el.querySelector('script[type="text/x-python"]');
    const original = dedent(srcEl ? srcEl.textContent : "");
    if (srcEl) srcEl.remove();

    const name = el.dataset.name || `code${index + 1}.py`;
    const preambleId = el.dataset.preamble || null;
    const checkId = el.dataset.check || null;
    const preambleNote = preambleId ? `<span title="これまでのレッスンで作った関数が自動で読み込まれます">📦 前回までのコード読込み済み</span>` : "";
    const checkNote = checkId ? `<span title="実行すると複数のテストデータで自動チェックされます">🧪 自動チェックつき</span>` : "";

    el.innerHTML = `
      <div class="bar">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="fname">${name} ${preambleNote} ${checkNote}</span>
        <button class="reset-btn" title="コードを最初の状態に戻す">↺ リセット</button>
        <button class="run-btn">▶ 実行</button>
      </div>
      <div class="editor-host"></div>
      <div class="out-label">OUTPUT</div>
      <div class="out"></div>
      <div class="viz"></div>
      <div class="checks"></div>`;

    const host = el.querySelector(".editor-host");
    const out = el.querySelector(".out");
    const viz = el.querySelector(".viz");
    const checks = el.querySelector(".checks");
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
        "Ctrl-/": "toggleComment",
        "Cmd-/": "toggleComment",
        Tab: (cm) => {
          if (cm.somethingSelected()) cm.indentSelection("add");
          else cm.replaceSelection("    ", "end");
        },
      },
    });

    const preHintEl = preambleId ? document.getElementById(preambleId) : null;
    const preHintText = preHintEl ? dedent(preHintEl.textContent) : "";
    enablePythonHints(cm, () => preHintText);

    resetBtn.addEventListener("click", () => {
      cm.setValue(original);
      out.classList.remove("show");
      outLabel.classList.remove("show");
      out.innerHTML = "";
      viz.classList.remove("show");
      viz.innerHTML = "";
      checks.classList.remove("show");
      checks.innerHTML = "";
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
            if (checkId) runChecks(py, ns, checkId, checks, text, code);
          } catch (err) {
            viz.classList.remove("show");
            viz.innerHTML = "";
            checks.classList.remove("show");
            checks.innerHTML = "";
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

  /* ---------- チャレンジの自動チェック ----------
   * data-check="スクリプトid" のウィジェットは、実行成功後に同じ名前空間で
   * <script type="text/x-python" id="..."> のテストコードを流す。
   * テスト側の書き方: _t(名前, 条件, 補足="") を複数回呼ぶ。
   *  - _output: 学習者のprint出力(文字列)
   *  - _source: 実行したコード全文(プリアンブル込み)
   *  - _rerun(src): srcを新しい名前空間で実行し (名前空間dict, 出力文字列) を返す。
   *    「データを差し替えて再実行しても正しいか」の検証(答えの直書き対策)に使う */
  function runChecks(py, ns, checkId, host, outputText, sourceCode) {
    const checkEl = document.getElementById(checkId);
    if (!checkEl) return;
    host.innerHTML = "";
    host.classList.add("show");
    const head = document.createElement("div");
    head.className = "checks-head";
    host.append(head);
    let results = null, error = null;
    try {
      ns.set("_output", outputText);
      ns.set("_source", sourceCode || "");
      const checkCode =
        "_pgi_results = []\n" +
        'def _t(name, cond, detail=""):\n' +
        "    _pgi_results.append((str(name), bool(cond), str(detail)))\n" +
        "def _rerun(src):\n" +
        "    import io, contextlib\n" +
        "    _ns = {}\n" +
        "    _buf = io.StringIO()\n" +
        "    with contextlib.redirect_stdout(_buf):\n" +
        "        exec(src, _ns)\n" +
        "    return _ns, _buf.getvalue()\n" +
        dedent(checkEl.textContent);
      py.runPython(checkCode, { globals: ns });
      results = JSON.parse(py.runPython('__import__("json").dumps(_pgi_results)', { globals: ns }));
    } catch (err) {
      error = String(err.message || err).trim().split("\n").pop();
    }
    if (error || !results || !results.length) {
      head.textContent = "🧪 チェック結果";
      const row = document.createElement("div");
      row.className = "check-row ng";
      row.textContent = error
        ? `⚠ 判定中にエラーが起きました: ${error}(お題の関数名・変数名が合っているか確認してみてください)`
        : "⚠ テストが見つかりませんでした";
      host.append(row);
      return;
    }
    let passed = 0;
    for (const [name, ok, detail] of results) {
      if (ok) passed++;
      const row = document.createElement("div");
      row.className = "check-row " + (ok ? "ok" : "ng");
      row.textContent = `${ok ? "✅" : "❌"} ${name}${!ok && detail ? " — " + detail : ""}`;
      host.append(row);
    }
    head.textContent = passed === results.length
      ? `🎉 チャレンジクリア!(${passed} / ${results.length} 合格)`
      : `🔎 ${passed} / ${results.length} 合格 — あと少し!`;
    head.classList.toggle("all-pass", passed === results.length);
  }

  /* 実行後の名前空間から「盤面らしいリスト」を探して、本物の盤面ビジュアルで表示する
     正方形限定ではない(コネクトフォー 7×6 のような長方形も許容)。
     上限15は、教材が学習者に試すよう勧める最大の盤(本物の五目並べ盤 15×15)。 */
  const BOARD_SCAN = `__import__("json").dumps({ k: ["".join(r) for r in v]
    for k, v in list(globals().items())
    if not k.startswith("_") and isinstance(v, list) and 3 <= len(v) <= 15
    and isinstance(v[0], list) and 3 <= len(v[0]) <= 15
    and all(isinstance(r, list) and len(r) == len(v[0])
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
    // 教材の主役は "board" 変数。学習者が作った盤面っぽい別のリストに枠(4つ)を食われても消えないよう先頭へ
    const names = Object.keys(boards)
      .sort((a, b) => (b === "board") - (a === "board"))
      .slice(0, 4);
    if (!names.length) return;
    const theme = document.body.dataset.boardTheme || "othello";
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
        (nb + nw > 0 ? `<span class="cnt-b">● ${nb}</span><span class="cnt-w">○ ${nw}</span>` : "");
      item.append(label, window.PGIBoard.buildBoardGrid(rows, "30px", theme));
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
      [/IndexError/, "インデックスエラー: リストの範囲外にアクセスしていないか確認しよう(インデックスは0始まり、最大は「長さ − 1」)"],
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
  window.PGI = { ensurePyodide, ensureCodeMirror, dedent, enablePythonHints };
})();
