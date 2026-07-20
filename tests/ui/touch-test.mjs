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
await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

async function tapEl(handle) {
  await handle.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 300));
  await handle.tap();
}

// [名前, パス, セル, 石, タップ対象の選び方]
const GAMES = [
  ['othello', '/playground.html', '.sq', '.disc', 'can'],
  ['gomoku', '/playground-gomoku.html', '.c', '.d', 'empty'],
  ['connect4', '/playground-connect4.html', '.c', '.d', 'empty'],
];

for (const [name, path, cellSel, discSel, pick] of GAMES) {
  console.log(`\n=== ${name} (360px touch) ===`);
  await page.goto(ROOT + path, { waitUntil: 'networkidle2', timeout: 90000 });

  await page.waitForFunction(() => {
    const b = document.querySelector('#btn-new');
    return b && !b.disabled;
  }, { timeout: 90000 });
  ok('pyodide読み込み・新しいゲーム有効', true);

  await tapEl(await page.$('#btn-new'));
  await page.waitForFunction((sel) => document.querySelectorAll('#board ' + sel).length > 0, { timeout: 30000 }, cellSel);
  await new Promise(r => setTimeout(r, 1000));
  const discCount = () => page.evaluate((sel) => document.querySelectorAll('#board ' + sel).length, discSel);
  const before = await discCount();

  if (pick === 'can') {
    // 合法手セル(ヒント)が出るまで待つ。出なければ状態を表示
    const appeared = await page.waitForFunction(
      () => document.querySelectorAll('#board .sq.can').length > 0,
      { timeout: 15000 }).then(() => true).catch(() => false);
    if (!appeared) {
      const diag = await page.evaluate(() => ({
        msg: document.querySelector('#pg-msg')?.textContent,
        discs: document.querySelectorAll('#board .disc').length,
        hints: document.querySelector('#chk-hints')?.checked,
      }));
      console.log('  diag:', JSON.stringify(diag));
    }
  }
  const cell = await page.evaluateHandle(([cellSel, pick]) => {
    const cells = [...document.querySelectorAll('#board ' + cellSel)];
    if (pick === 'can') return cells.find(c => c.classList.contains('can'));
    const empties = cells.filter(c => !c.querySelector('.d'));
    return empties[Math.floor(empties.length / 2)];
  }, [cellSel, pick]);
  ok('タップ対象セルあり', !!(cell.asElement && cell.asElement()));

  await tapEl(cell.asElement());
  let after = before, tries = 0;
  while (tries++ < 24) {
    await new Promise(r => setTimeout(r, 500));
    after = await discCount();
    if (after >= before + 2) break;
  }
  ok(`タップで着手→AI応手 (石 ${before}→${after})`, after >= before + 2);

  const tabs = await page.$$('.pg-tabs button');
  await tapEl(tabs[1]);
  await new Promise(r => setTimeout(r, 800));
  ok('AI工房タブ表示', await page.evaluate(() => document.querySelector('#pane-lab').classList.contains('active')));
  await tapEl(tabs[2]);
  await new Promise(r => setTimeout(r, 800));
  ok('エンジンのコードタブ表示', await page.evaluate(() => document.querySelector('#pane-source').classList.contains('active')));
  await tapEl(tabs[0]);
  await new Promise(r => setTimeout(r, 400));
  ok('対戦タブへ復帰', await page.evaluate(() => document.querySelector('#pane-play').classList.contains('active')));
}

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
