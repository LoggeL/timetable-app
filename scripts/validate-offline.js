const puppeteer = require('/home/logge/.openclaw/workspace/node_modules/puppeteer');

const url = process.argv[2] || 'https://timetable.logge.top/';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

async function waitForText(page, text, timeout = 20000) {
  await page.waitForFunction((needle) => document.body?.innerText.includes(needle), { timeout }, text);
}

async function gotoAndStop(page, targetUrl, timeout = 15000) {
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout });
  } catch (error) {
    await page._client().send('Page.stopLoading').catch(() => undefined);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await waitForText(page, 'Festival-Abstimmung');

    await page.evaluate(() => new Promise((resolve, reject) => {
      if (!('serviceWorker' in navigator) || !('caches' in window)) return reject(new Error('serviceWorker/caches unavailable'));
      navigator.serviceWorker.ready.then(async (registration) => {
        registration.active?.postMessage({ type: 'SYNC_VOTES' });
        const start = Date.now();
        while (Date.now() - start < 25000) {
          const keys = await caches.keys();
          if (keys.some((key) => key.startsWith('timetable-offline-v2026-06-19-5'))) return resolve();
          await new Promise((r) => setTimeout(r, 250));
        }
        reject(new Error('expected v5 cache missing'));
      }).catch(reject);
    }));

    if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
      await gotoAndStop(page, url);
      await waitForText(page, 'Festival-Abstimmung');
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 10000 });
    }

    const onlineState = await page.evaluate(async () => ({
      title: document.body.innerText.includes('Festival-Abstimmung'),
      southside: document.body.innerText.includes('Southside'),
      kingKong: document.body.innerText.includes('KING KONG KICKS'),
      offlineReady: document.body.innerText.includes('Offline bereit'),
      controller: Boolean(navigator.serviceWorker.controller),
      cacheKeys: await caches.keys(),
    }));

    await page.setOfflineMode(true);
    await gotoAndStop(page, url);
    await waitForText(page, 'Festival-Abstimmung');
    await waitForText(page, 'KING KONG KICKS');
    const offlineFriday = await page.evaluate(() => ({
      kingKong: document.body.innerText.includes('KING KONG KICKS'),
      dennis: document.body.innerText.includes('DENNIS CONCORDE'),
    }));
    await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Samstag'))?.click());
    await waitForText(page, 'DENNIS CONCORDE');

    const offlineState = await page.evaluate(async (offlineFriday) => ({
      title: document.body.innerText.includes('Festival-Abstimmung'),
      southside: document.body.innerText.includes('Southside'),
      kingKong: offlineFriday.kingKong,
      dennis: document.body.innerText.includes('DENNIS CONCORDE'),
      offlineReady: document.body.innerText.includes('Offline bereit'),
      controller: Boolean(navigator.serviceWorker.controller),
      cacheKeys: await caches.keys(),
      bodyStart: document.body.innerText.slice(0, 300),
      friday: offlineFriday,
    }), offlineFriday);

    await page.type('input[placeholder="z.B. Logge"]', 'Puppeteer');
    await page.click('.act-card');
    const voteQueued = await page.evaluate(() => Boolean(localStorage.getItem('timetable-vote-queue')) || document.body.innerText.includes('wartet'));

    const result = { onlineState, offlineState, voteQueued, errors };
    console.log(JSON.stringify(result, null, 2));

    if (!onlineState.title || !onlineState.controller || !offlineState.title || !offlineState.kingKong || !offlineState.dennis || !offlineState.controller || errors.length) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
