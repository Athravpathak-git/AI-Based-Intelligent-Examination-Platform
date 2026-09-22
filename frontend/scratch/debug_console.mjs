import { chromium } from 'playwright';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', async (msg) => {
    const args = await Promise.all(msg.args().map(a => a.jsonValue().catch(() => a.toString())));
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]`, msg.text(), 'ARGS:', JSON.stringify(args));
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err.stack || err.message);
  });

  console.log("Loading /login with empty localStorage...");
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(2000);

  console.log("\nSetting localStorage language to 'mr'...");
  await page.evaluate(() => localStorage.setItem('intelliexam_preferred_lang', 'mr'));
  
  console.log("\nReloading /login (simulating Ctrl+Shift+R)...");
  await page.reload();
  await page.waitForTimeout(3000);

  console.log("\nChecking text of key elements on page:");
  const titleText = await page.innerText('h1');
  console.log("H1 text:", titleText);

  const langBtnText = await page.innerText('#language-switcher-container button');
  console.log("Language button text:", langBtnText);

  await browser.close();
}

run();
