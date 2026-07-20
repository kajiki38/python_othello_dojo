import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ROOT = 'file:///' + REPO.split(String.fromCharCode(92)).join('/');

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(`  ${cond ? 'OK' : 'NG'} ${name}`); };

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900 });
// クリップボードをスタブしてコピー内容を捕捉
await page.evaluateOnNewDocument(() => {
  window.__copied = null;
  if (!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', { value: {} });
  navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); };
});

for (const [name, path, gameWord] of [
  ['othello', '/playground.html', 'オセロ'],
  ['gomoku', '/playground-gomoku.html', '五目並べ'],
  ['connect4', '/playground-connect4.html', 'コネクトフォー'],
]) {
  console.log(`\n=== ${name} ===`);
  await page.goto(`${ROOT}${path}?tab=lab`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('#lab-run');
    return b && !b.disabled;
  }, { timeout: 120000 });

  ok('観戦前は棋譜ボタンdisabled', await page.evaluate(() => document.querySelector('#lab-copy-kifu').disabled));

  await page.click('#lab-run');
  await page.waitForFunction(() => !document.querySelector('#lab-copy-kifu').disabled, { timeout: 120000 });
  ok('観戦開始で棋譜ボタン有効化', true);

  // 最後まで送ってからコピー
  await page.waitForFunction(() => !document.querySelector('#lab-to-end').disabled, { timeout: 60000 });
  await page.click('#lab-to-end');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#lab-copy-kifu');
  await new Promise(r => setTimeout(r, 300));
  const text = await page.evaluate(() => window.__copied);
  ok('コピー内容あり', !!text);
  const lines = (text || '').split('\n');
  ok(`ヘッダーに種目名(${lines[0]})`, lines[0]?.includes(gameWord) && lines[0]?.includes('あなたのAI'));
  const moveLines = lines.filter(l => /手目/.test(l));
  ok(`着手行が8行以上 (${moveLines.length}行)`, moveLines.length >= 8);
  ok(`結果行あり(${lines[lines.length - 1]})`, /^結果:/.test(lines[lines.length - 1] || ''));
  const logTxt = await page.evaluate(() => document.querySelector('#lab-log').textContent);
  ok('ログに「コピーしました」', logTxt.includes('棋譜をコピーしました'));
}

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
