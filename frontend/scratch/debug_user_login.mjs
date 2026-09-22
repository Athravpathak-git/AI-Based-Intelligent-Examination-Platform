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
    const text = msg.text();
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, text);
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err.stack || err.message);
  });

  console.log("--- TEST WITH USER IN LOCALSTORAGE VISITING /login ---");
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(() => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      name: 'Alex Walker',
      email: 'student@exam.com',
      role: 'STUDENT',
      registration_number: 'STU-2026-000005'
    }));
  });

  console.log("Hard refreshing /login with user in localStorage...");
  await page.reload();
  await page.waitForTimeout(3000);

  console.log("Current URL:", page.url());
  await browser.close();
}

run();
