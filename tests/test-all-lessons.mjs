// 全レッスンの .pyrunner ウィジェットを data-preamble 解決込みで実行検証する
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
  for (const l of lines) {
    if (!l.trim()) continue;
    min = Math.min(min, l.match(/^\s*/)[0].length);
  }
  if (!isFinite(min)) min = 0;
  return lines.map(l => l.slice(min)).join('\n');
}

// ページから preamble(id付き) と pyrunner ウィジェットを抽出
function parsePage(html) {
  const preambles = {};
  for (const m of html.matchAll(/<script type="text\/x-python" id="([^"]+)">([\s\S]*?)<\/script>/g)) {
    preambles[m[1]] = dedent(m[2]);
  }
  const widgets = [];
  const divRe = /<div class="pyrunner"([^>]*)>\s*<script type="text\/x-python">([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(divRe)) {
    const attrs = m[1];
    if (/data-manual/.test(attrs)) continue;
    const name = (attrs.match(/data-name="([^"]+)"/) || [])[1] || 'code.py';
    const pre = (attrs.match(/data-preamble="([^"]+)"/) || [])[1] || null;
    widgets.push({ name, pre, code: dedent(m[2]) });
  }
  return { preambles, widgets };
}

const py = await loadPyodide();
let total = 0, okCount = 0;
const failures = [];

for (const file of readdirSync(LESSONS_DIR).filter(f => f.endsWith('.html')).sort()) {
  const { preambles, widgets } = parsePage(readFileSync(join(LESSONS_DIR, file), 'utf8'));
  for (const w of widgets) {
    total++;
    const preCode = w.pre ? (preambles[w.pre] ?? null) : '';
    if (w.pre && preCode === null) {
      failures.push(`${file} ${w.name}: preamble "${w.pre}" が見つからない`);
      continue;
    }
    const full = (preCode ? preCode + '\n' : '') + w.code;
    try {
      // ウィジェットごとに独立した名前空間で実行(runner.jsと同じ方針)
      py.runPython(`
import io, sys
sys.stdout = io.StringIO()
`);
      const ns = py.globals.get('dict')();
      py.runPython(full, { globals: ns });
      ns.destroy();
      okCount++;
    } catch (e) {
      failures.push(`${file} ${w.name}: ${String(e).split('\n').slice(-3).join(' | ').slice(0, 220)}`);
    }
  }
  process.stdout.write(`${file}: done (累計 ${okCount}/${total})\n`);
}

py.runPython('import sys; sys.stdout = sys.__stdout__');
console.log(`\n==== ${okCount}/${total} widgets OK ====`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(' -', f);
  process.exit(1);
}
