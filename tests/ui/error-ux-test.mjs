import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ROOT = 'file:///' + REPO.split(String.fromCharCode(92)).join('/');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? 'OK' : 'NG'} ${n}`); };

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 900 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

/* ===== 1. 文法エラーの波線lint(レッスンページ) ===== */
console.log('=== lint(basics-01) ===');
await page.goto(ROOT + '/lessons/basics-01.html', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForSelector('.pyrunner .CodeMirror', { timeout: 60000 });
await new Promise(r => setTimeout(r, 500));
// 壊れたコード(2行目の if にコロンなし)を入れて、1文字タイプして pyodide 読込+lint を起動
await page.evaluate(() => {
  const w = document.querySelector('.pyrunner');
  w.scrollIntoView({ block: 'start' });
  const cm = w.querySelector('.CodeMirror').CodeMirror;
  cm.setValue('x = 1\nif x == 1\n    print(x)\n');
  cm.focus();
  cm.setCursor({ line: 3, ch: 0 });
});
await page.keyboard.type('#');
// pyodide 読込(初回~15s)後に波線マーカーが出るまで待つ
const marker = await page.waitForFunction(() => {
  const w = document.querySelector('.pyrunner');
  const g = w.querySelector('.CodeMirror-lint-marker-error');
  return g ? true : null;
}, { timeout: 120000 }).then(() => true).catch(() => false);
ok('文法エラーで行マーカーが出る', marker);
const res = await page.evaluate(() => {
  const w = document.querySelector('.pyrunner');
  const cm = w.querySelector('.CodeMirror').CodeMirror;
  // マーカーが2行目(index 1)に付いているか: lintマーカーのある行を探す
  const lineEls = [...w.querySelectorAll('.CodeMirror-code > div')];
  let markerLine = -1;
  lineEls.forEach((el, i) => { if (el.querySelector('.CodeMirror-lint-marker-error')) markerLine = i; });
  const squiggle = !!w.querySelector('.CodeMirror-lint-mark-error');
  return { markerLine, squiggle, first: cm.getLine(0) };
});
ok(`マーカーは2行目(実測 line index ${res.markerLine})`, res.markerLine === 1);
ok('波線スパンあり', res.squiggle);
// 直すと消える
await page.evaluate(() => {
  const cm = document.querySelector('.pyrunner .CodeMirror').CodeMirror;
  cm.setValue('x = 1\nif x == 1:\n    print(x)\n');
});
const cleared = await page.waitForFunction(() => {
  const w = document.querySelector('.pyrunner');
  return !w.querySelector('.CodeMirror-lint-marker-error') ? true : null;
}, { timeout: 15000 }).then(() => true).catch(() => false);
ok('直すと波線が消える', cleared);

/* ===== 2. AI工房のエラー行番号(五目並べ) ===== */
console.log('=== AI工房エラー行(playground-gomoku) ===');
await page.goto(ROOT + '/playground-gomoku.html?tab=lab', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => { const b = document.querySelector('#lab-run'); return b && !b.disabled; }, { timeout: 120000 });
await new Promise(r => setTimeout(r, 500));

const runAndLog = async () => {
  await page.click('#lab-run');
  await page.waitForFunction(() => /エラー/.test(document.querySelector('#lab-log').textContent + document.querySelector('#lab-summary').textContent), { timeout: 60000 });
  await new Promise(r => setTimeout(r, 400));
  return page.evaluate(() => document.querySelector('#lab-log').textContent);
};

// 2a. 実行時エラー(2行目で IndexError)
await page.evaluate(() => {
  const cm = document.querySelector('#lab-editor .CodeMirror').CodeMirror;
  cm.setValue('def my_ai(board, color, moves):\n    return board[99][99]\n');
});
let logTxt = await runAndLog();
ok(`実行時エラーに「2行目」が出る (${logTxt.match(/\d+行目[^\n]*/)?.[0] || 'なし'})`, logTxt.includes('2行目'));
ok('該当行がハイライトされる', await page.evaluate(() => !!document.querySelector('#lab-editor .err-line')));
// 編集するとハイライトが消える
await page.evaluate(() => {
  const cm = document.querySelector('#lab-editor .CodeMirror').CodeMirror;
  cm.replaceRange('#', { line: 0, ch: 0 });
});
ok('編集でハイライトが消える', await page.evaluate(() => !document.querySelector('#lab-editor .err-line')));

// 2b. 読み込み時の文法エラー(1行目コロンなし)
await page.evaluate(() => {
  const cm = document.querySelector('#lab-editor .CodeMirror').CodeMirror;
  cm.setValue('def my_ai(board, color, moves)\n    return moves[0]\n');
});
logTxt = await runAndLog();
ok(`文法エラーに行番号が出る (${logTxt.match(/\d+行目[^\n]*/)?.[0] || 'なし'})`, /1行目|2行目/.test(logTxt));

ok('JSエラーなし', errors.length === 0);
if (errors.length) console.log(errors.join('\n'));
await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
