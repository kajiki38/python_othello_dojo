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

async function testChallenge(path, solutionGetter) {
  await page.goto(ROOT + path, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('.challenge .pyrunner .CodeMirror', { timeout: 60000 });
  await new Promise(r => setTimeout(r, 500));

  const runAndWait = async () => {
    await page.evaluate(() => {
      const w = document.querySelector('.challenge .pyrunner');
      w.scrollIntoView({ block: 'center' });
      w.querySelector('.run-btn').click();
    });
    await page.waitForFunction(() => {
      const w = document.querySelector('.challenge .pyrunner');
      return w.querySelector('.checks.show .checks-head')?.textContent.length > 0;
    }, { timeout: 120000 });
    return page.evaluate(() => {
      const w = document.querySelector('.challenge .pyrunner');
      return {
        head: w.querySelector('.checks-head').textContent,
        rows: [...w.querySelectorAll('.check-row')].map(r => r.textContent),
      };
    });
  };

  // 1. スターターのまま実行 → チェックは走るが不合格がある
  const r1 = await runAndWait();
  console.log('   starter:', r1.head);
  ok('スターター: チェックパネルが表示され不合格あり', r1.rows.length >= 2 && !r1.head.includes('クリア'));

  // 2. 解答例を貼って実行 → 全合格
  const solution = await page.evaluate(solutionGetter);
  ok('解答例をページから取得', !!solution && solution.length > 10);
  await page.evaluate((code) => {
    const w = document.querySelector('.challenge .pyrunner');
    w.querySelector('.CodeMirror').CodeMirror.setValue(code);
  }, solution);
  const r2 = await runAndWait();
  console.log('   solution:', r2.head);
  for (const row of r2.rows) console.log('    ', row);
  ok('解答例: 全テスト合格(クリア表示)', r2.head.includes('クリア'));
}

console.log('=== lesson07 ===');
await testChallenge('/lessons/lesson07.html',
  () => document.querySelector('.challenge .solution .codeblock pre').textContent);

console.log('=== connect4-03 ===');
await testChallenge('/lessons/connect4-03.html',
  () => document.querySelector('.challenge .solution .codeblock pre').textContent);

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
