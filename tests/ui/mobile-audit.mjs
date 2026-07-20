import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ROOT = 'file:///' + REPO.split(String.fromCharCode(92)).join('/');

const PAGES = [
  '/index.html',
  '/lessons/basics-01.html',
  '/lessons/lesson03.html',
  '/lessons/gomoku-04.html',
  '/playground.html',
  '/playground-gomoku.html',
  '/playground-connect4.html',
];

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

let failed = false;
for (const p of PAGES) {
  await page.goto(ROOT + p, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    // 画面幅からはみ出す要素を列挙(祖先がoverflow隠し/スクロールなら許容)
    const bad = [];
    const scrollable = (el) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const o = getComputedStyle(a).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1 && !scrollable(el)) {
        const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
        bad.push(`${el.tagName.toLowerCase()}${cls} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
      }
    }
    return { vw, sw, media620: matchMedia('(max-width: 620px)').matches, bad: [...new Set(bad)].slice(0, 12) };
  });
  console.log(`\n=== ${p} ===`);
  console.log(`viewport=${res.vw} scrollWidth=${res.sw} overflow=${res.sw > res.vw ? 'YES +' + (res.sw - res.vw) + 'px' : 'no'} media620=${res.media620}`);
  for (const b of res.bad) console.log('  ', b);
  if (res.sw > res.vw) failed = true;
}
await browser.close();
console.log(failed ? '\n==== NG(オーバーフローあり)====' : '\n==== ALL OK ====');
process.exit(failed ? 1 : 0);
