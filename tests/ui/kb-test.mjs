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

// --- オセロ: 矢印移動+Enter着手 ---
console.log('=== othello ===');
await page.goto(ROOT + '/playground.html', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => { const b = document.querySelector('#btn-new'); return b && !b.disabled; }, { timeout: 120000 });
await page.click('#btn-new');
await page.waitForFunction(() => document.querySelectorAll('#board .sq.can').length > 0, { timeout: 30000 });
await page.evaluate(() => document.querySelector('#board').focus());
ok('フォーカスでカーソル表示', await page.evaluate(() => !!document.querySelector('#board .sq.kb')));
// (3,3)開始 → 合法手までカーソルを動かして着手。初期盤面では (3,2)(黒番) が合法
await page.keyboard.press('ArrowUp');   // (3,2)
const onCan = await page.evaluate(() => {
  const kb = document.querySelector('#board .sq.kb');
  return kb && { x: kb.dataset.x, y: kb.dataset.y, can: kb.classList.contains('can') };
});
console.log('  cursor at', JSON.stringify(onCan));
const before = await page.evaluate(() => document.querySelectorAll('#board .disc').length);
await page.keyboard.press('Enter');
let after = before, t = 0;
while (t++ < 20) { await new Promise(r => setTimeout(r, 500)); after = await page.evaluate(() => document.querySelectorAll('#board .disc').length); if (after > before) break; }
ok(`Enterで着手→石が増えた (${before}→${after})`, after > before);
await page.evaluate(() => document.querySelector('#board').blur());
ok('blurでカーソル消える', await page.evaluate(() => !document.querySelector('#board .sq.kb')));

// --- 五目並べ: 中央からEnter ---
console.log('=== gomoku ===');
await page.goto(ROOT + '/playground-gomoku.html', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => { const b = document.querySelector('#btn-new'); return b && !b.disabled; }, { timeout: 120000 });
await page.click('#btn-new');
await page.waitForFunction(() => document.querySelectorAll('#board .c.can').length > 0, { timeout: 30000 });
await page.evaluate(() => document.querySelector('#board').focus());
await page.keyboard.press('ArrowLeft');   // (6,7) — 中央から1つ左
const gb = await page.evaluate(() => document.querySelectorAll('#board .d').length);
await page.keyboard.press(' ');           // Spaceでも着手できる
let ga = gb; t = 0;
while (t++ < 20) { await new Promise(r => setTimeout(r, 500)); ga = await page.evaluate(() => document.querySelectorAll('#board .d').length); if (ga >= gb + 2) break; }
ok(`Spaceで着手→AI応手 (${gb}→${ga})`, ga >= gb + 2);

// --- コネクトフォー: ←→で列選択、Enterで落下 ---
console.log('=== connect4 ===');
await page.goto(ROOT + '/playground-connect4.html', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => { const b = document.querySelector('#btn-new'); return b && !b.disabled; }, { timeout: 120000 });
await page.click('#btn-new');
await page.waitForFunction(() => document.querySelectorAll('#board .c.can').length > 0, { timeout: 30000 });
await page.evaluate(() => document.querySelector('#board').focus());
ok('フォーカスで列3ハイライト', await page.evaluate(() => [...document.querySelectorAll('#board .c.hot')].every(c => c.dataset.x === '3') && document.querySelectorAll('#board .c.hot').length > 0));
await page.keyboard.press('ArrowRight');
ok('→で列4へ', await page.evaluate(() => [...document.querySelectorAll('#board .c.hot')].some(c => c.dataset.x === '4')));
const cb = await page.evaluate(() => document.querySelectorAll('#board .d').length);
await page.keyboard.press('Enter');
let ca = cb; t = 0;
while (t++ < 20) { await new Promise(r => setTimeout(r, 500)); ca = await page.evaluate(() => document.querySelectorAll('#board .d').length); if (ca >= cb + 2) break; }
ok(`Enterで落下→AI応手 (${cb}→${ca})`, ca >= cb + 2);

ok('JSエラーなし', errors.length === 0);
if (errors.length) console.log(errors.join('\n'));
await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
