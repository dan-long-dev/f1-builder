// Headless screenshot of the running app, for checking the look after a change.
// Usage: npm run shot -- [url] [out.png] [width] [height]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4321/';
const out = process.argv[3] ?? 'scratch/shot.png';
const width = Number(process.argv[4] ?? 1400);
const height = Number(process.argv[5] ?? 860);

const candidates = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium'].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__f1ready === true, null, { timeout: 30000 }).catch(() => {
    console.warn('timed out waiting for __f1ready; capturing anyway');
  });
  await page.waitForTimeout(300);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
  if (errors.length) {
    console.error('page errors:');
    for (const e of errors) console.error('  ' + e);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
