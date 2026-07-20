// チャレンジ検証ハーネス:
//   1) スターター+チェックが例外なく実行できる(不合格はあってよい)
//   2) 解答例+チェックで全テスト合格
// 使い方: node verify-challenges.mjs lesson03.html basics-01.html ...(省略時: data-check を含む全レッスン)
import { loadPyodide } from 'pyodide';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_DIR = join(REPO, 'lessons');

function dedent(src) {
  const lines = src.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  let min = Infinity;
  for (const l of lines) { if (l.trim()) min = Math.min(min, l.match(/^\s*/)[0].length); }
  if (!isFinite(min)) min = 0;
  return lines.map(l => l.slice(min)).join('\n');
}
const unescapeHtml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function parse(html, file) {
  const preambles = {};
  for (const m of html.matchAll(/<script type="text\/x-python" id="([^"]+)">([\s\S]*?)<\/script>/g)) {
    preambles[m[1]] = dedent(m[2]);
  }
  const cm = html.match(/<div class="pyrunner"([^>]*data-check="([^"]+)"[^>]*)>\s*<script type="text\/x-python">([\s\S]*?)<\/script>/);
  if (!cm) throw new Error(`${file}: data-check付きpyrunnerが見つからない`);
  const attrs = cm[1], checkId = cm[2], starter = dedent(cm[3]);
  const preId = (attrs.match(/data-preamble="([^"]+)"/) || [])[1] || null;
  const check = preambles[checkId];
  if (!check) throw new Error(`${file}: チェックスクリプト id="${checkId}" が見つからない`);
  const solM = html.match(/<div class="challenge">[\s\S]*?<details class="solution">[\s\S]*?<pre>([\s\S]*?)<\/pre>/);
  if (!solM) throw new Error(`${file}: 解答例<pre>が見つからない`);
  const solution = dedent(unescapeHtml(solM[1]));
  const pre = preId ? preambles[preId] : '';
  if (preId && pre === undefined) throw new Error(`${file}: preamble "${preId}" が見つからない`);
  return { pre: pre || '', starter, check, solution };
}

const HELPER = '_pgi_results = []\ndef _t(name, cond, detail=""):\n    _pgi_results.append((str(name), bool(cond), str(detail)))\n'
  + 'def _rerun(src):\n    import io, contextlib\n    _ns = {}\n    _buf = io.StringIO()\n'
  + '    with contextlib.redirect_stdout(_buf):\n        exec(src, _ns)\n    return _ns, _buf.getvalue()\n';

const py = await loadPyodide();

async function runCase(pre, code, check) {
  const ns = py.globals.get('dict')();
  const full = (pre ? pre + '\n\n' : '') + code;
  try {
    py.runPython('import io, sys\nsys.stdout = io.StringIO()', { globals: ns });
    await py.runPythonAsync(full, { globals: ns });
    const output = py.runPython('sys.stdout.getvalue()', { globals: ns });
    py.runPython('sys.stdout = sys.__stdout__', { globals: ns });
    ns.set('_output', output);
    ns.set('_source', full);
    py.runPython(HELPER + check, { globals: ns });
    return JSON.parse(py.runPython('__import__("json").dumps(_pgi_results)', { globals: ns }));
  } finally {
    try { py.runPython('import sys\nsys.stdout = sys.__stdout__', { globals: ns }); } catch {}
    ns.destroy();
  }
}

let files = process.argv.slice(2);
if (!files.length) {
  files = readdirSync(LESSONS_DIR).filter(f => f.endsWith('.html'))
    .filter(f => readFileSync(join(LESSONS_DIR, f), 'utf8').includes('data-check'));
}

let failCount = 0;
for (const file of files.sort()) {
  const html = readFileSync(join(LESSONS_DIR, file), 'utf8');
  try {
    const { pre, starter, check, solution } = parse(html, file);
    // 1) スターター: 例外なく走ること(テスト不合格はOK)
    let starterInfo;
    try {
      const r = await runCase(pre, starter, check);
      starterInfo = `starter OK (${r.filter(x => x[1]).length}/${r.length}件パス)`;
    } catch (e) {
      failCount++;
      starterInfo = `starter CRASH: ${String(e).split('\n').filter(l => l.trim()).pop()}`;
    }
    // 2) 解答例: 全テスト合格
    let solInfo;
    try {
      const r = await runCase(pre, solution, check);
      const ng = r.filter(x => !x[1]);
      if (!r.length) { failCount++; solInfo = 'solution NG: テストが1件も実行されていない'; }
      else if (ng.length) { failCount++; solInfo = `solution NG: ${ng.map(x => x[0] + (x[2] ? `(${x[2]})` : '')).join(' / ')}`; }
      else solInfo = `solution OK (${r.length}/${r.length}件合格)`;
    } catch (e) {
      failCount++;
      solInfo = `solution CRASH: ${String(e).split('\n').filter(l => l.trim()).pop()}`;
    }
    console.log(`${file}: ${starterInfo} | ${solInfo}`);
  } catch (e) {
    failCount++;
    console.log(`${file}: PARSE ERROR - ${e.message}`);
  }
}
console.log(failCount ? `\n==== NG (${failCount}件の問題) ====` : '\n==== ALL OK ====');
process.exit(failCount ? 1 : 0);
