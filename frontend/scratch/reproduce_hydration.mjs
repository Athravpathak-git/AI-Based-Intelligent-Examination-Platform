import { chromium } from 'playwright';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

async function reproduce() {
  console.log("=== REPRODUCING HYDRATION ERROR ON /login ===");
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', (err) => {
    console.error(`[PAGE ERROR]:`, err.message);
  });

  console.log("\n--- TEST CASE A: First visit to /login (Default state) ---");
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(3000);

  console.log("\n--- TEST CASE B: Hard Refresh on /login ---");
  await page.reload();
  await page.waitForTimeout(3000);

  console.log("\n--- TEST CASE C: Set localStorage language to 'mr' and Hard Refresh ---");
  await page.evaluate(() => {
    localStorage.setItem("intelliexam_preferred_lang", "mr");
  });
  await page.reload();
  await page.waitForTimeout(3000);

  console.log("\n--- TEST CASE D: Visit /register with 'mr' ---");
  await page.goto(`${BASE_URL}/register`);
  await page.waitForTimeout(3000);

  await browser.close();
  console.log("\n=== REPRODUCTION COMPLETE ===");
}

reproduce();
