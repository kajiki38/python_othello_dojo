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
await page.setViewport({ width: 1200, height: 900 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

const hintItems = () => page.evaluate(() =>
  [...document.querySelectorAll('ul.CodeMirror-hints li')].map(li => li.textContent));

// === レッスンページ ===
console.log('=== lesson03(pyrunnerエディタ) ===');
await page.goto(ROOT + '/lessons/lesson03.html', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForSelector('.pyrunner .CodeMirror', { timeout: 60000 });
await new Promise(r => setTimeout(r, 800));

// 1. "pr" → print が候補に出る
await page.evaluate(() => {
  const cm = document.querySelector('.pyrunner .CodeMirror').CodeMirror;
  cm.setValue('');
  cm.focus();
  cm.setCursor({ line: 0, ch: 0 });
});
await page.keyboard.type('pr', { delay: 80 });
await new Promise(r => setTimeout(r, 400));
let items = await hintItems();
ok(`"pr" で print が候補に出る [${items.slice(0, 4)}]`, items.includes('print'));

// 2. Enterで確定して print になる
await page.keyboard.press('Enter');
const line0 = await page.evaluate(() => document.querySelector('.pyrunner .CodeMirror').CodeMirror.getLine(0));
ok(`Enterで確定 → "${line0}"`, line0 === 'print');

// 3. 自分の変数 hoge が "h" で候補に出る
await page.evaluate(() => {
  const cm = document.querySelector('.pyrunner .CodeMirror').CodeMirror;
  cm.setValue('hoge = 1\n');
  cm.focus();
  cm.setCursor({ line: 1, ch: 0 });
});
await page.keyboard.type('h', { delay: 80 });
await new Promise(r => setTimeout(r, 400));
items = await hintItems();
ok(`"h" で hoge が候補に出る [${items.slice(0, 4)}]`, items.includes('hoge'));
await page.keyboard.press('Escape');

// 4. プリアンブル(前レッスンのコード)の単語も候補に出る
//    directions.py ウィジェット(data-preamble="pre")で、preの中の単語を1つ試す
const preWord = await page.evaluate(() => {
  const pre = document.getElementById('pre');
  const m = (pre ? pre.textContent : '').match(/def (\w+)/);
  return m ? m[1] : null;
});
if (preWord) {
  await page.evaluate(() => {
    const cms = document.querySelectorAll('.pyrunner .CodeMirror');
    const cm = cms[1].CodeMirror;   // 2つ目のウィジェット(preamble付き)
    cm.setValue('');
    cm.focus();
    cm.setCursor({ line: 0, ch: 0 });
  });
  await page.keyboard.type(preWord.slice(0, 2), { delay: 80 });
  await new Promise(r => setTimeout(r, 400));
  items = await hintItems();
  ok(`プリアンブルの "${preWord}" が候補に出る`, items.includes(preWord));
  await page.keyboard.press('Escape');
} else {
  console.log('  (preなし: スキップ)');
}

// 5. コメント内では補完が出ない
await page.evaluate(() => {
  const cm = document.querySelector('.pyrunner .CodeMirror').CodeMirror;
  cm.setValue('# ');
  cm.focus();
  cm.setCursor({ line: 0, ch: 2 });
});
await page.keyboard.type('pr', { delay: 80 });
await new Promise(r => setTimeout(r, 400));
items = await hintItems();
ok('コメント内では出ない', items.length === 0);

// === AI工房(エンジン関数の補完) ===
console.log('=== playground-gomoku AI工房 ===');
await page.goto(ROOT + '/playground-gomoku.html?tab=lab', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForSelector('#lab-editor .CodeMirror', { timeout: 60000 });
await new Promise(r => setTimeout(r, 800));
await page.evaluate(() => {
  const cm = document.querySelector('#lab-editor .CodeMirror').CodeMirror;
  cm.setValue('');
  cm.focus();
  cm.setCursor({ line: 0, ch: 0 });
});
await page.keyboard.type('find', { delay: 60 });
await new Promise(r => setTimeout(r, 400));
items = await hintItems();
ok(`エンジンの find_winning_move が候補に出る [${items.slice(0, 3)}]`, items.some(w => w.startsWith('find_winning')));
await page.keyboard.press('Escape');

ok('JSエラーなし', errors.length === 0);
if (errors.length) console.log(errors.join('\n'));
await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
