import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "C:\\Users\\Shree\\Desktop\\AI BASED EXAMINATION PLATFORM\\frontend\\scratch\\screenshots";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runUIVerification() {
  console.log("================================================================");
  console.log(" INTELLIEXAMAI VISUAL UI REDESIGN & HYDRATION VERIFIER");
  console.log("================================================================");

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const hydrationErrors = [];

  function attachListeners(page) {
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('did not match') || text.toLowerCase().includes('server/client')) {
        hydrationErrors.push(text);
        console.warn(`[HYDRATION WARNING] ${text}`);
      }
    });

    page.on('pageerror', (err) => {
      console.error(`[PAGE ERROR] ${err.message}`);
      if (err.message.toLowerCase().includes('hydration')) {
        hydrationErrors.push(err.message);
      }
    });
  }

  async function checkPage(page, name, url, screenshotName) {
    console.log(`\n--- Checking ${name} at ${url} ---`);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Check body background
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`  Body background: ${bodyBg}`);

    // Check for any legacy burgundy or plum colors in computed styles
    const legacyElements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const found = [];
      for (const el of all) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        // #6E2638 = rgb(110, 38, 56)
        // #4A2545 = rgb(74, 37, 69)
        // #211A24 = rgb(33, 26, 36)
        if (bg.includes('110, 38, 56') || color.includes('110, 38, 56') ||
            bg.includes('74, 37, 69') || color.includes('74, 37, 69') ||
            bg.includes('33, 26, 36') || color.includes('33, 26, 36')) {
          found.push({ tag: el.tagName, className: el.className, bg, color });
        }
      }
      return found;
    });

    if (legacyElements.length > 0) {
      console.warn(`  [WARN] Found ${legacyElements.length} elements with legacy colors:`, legacyElements.slice(0, 3));
    } else {
      console.log(`  [PASS] Zero legacy burgundy/plum elements.`);
    }

    const shotPath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`  Screenshot saved: ${screenshotName}.png`);
  }

  try {
    // -------------------------------------------------------------
    // Context 1: Public Pages & Student Flow
    // -------------------------------------------------------------
    const studentContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const studentPage = await studentContext.newPage();
    attachListeners(studentPage);

    await checkPage(studentPage, "Home Page", "/", "01_home_page");
    await checkPage(studentPage, "Login Page", "/login", "02_login_page");
    await checkPage(studentPage, "Register Page", "/register", "03_register_page");
    await checkPage(studentPage, "Forgot Password", "/forgot-password", "04_forgot_password");

    console.log("\n=== LOGGING IN AS STUDENT ===");
    await studentPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await studentPage.waitForTimeout(1000);
    await studentPage.fill('input[type="email"]', 'student@exam.com');
    await studentPage.fill('input[type="password"]', 'student123');
    await studentPage.click('button[type="submit"]');
    await studentPage.waitForURL('**/student', { timeout: 15000 });
    await checkPage(studentPage, "Student Dashboard", "/student", "05_student_dashboard");
    await checkPage(studentPage, "Student Profile", "/student/profile", "06_student_profile");
    await checkPage(studentPage, "Student Results", "/student/results", "07_student_results");
    await studentContext.close();

    // -------------------------------------------------------------
    // Context 2: Examiner Flow
    // -------------------------------------------------------------
    console.log("\n=== LOGGING IN AS EXAMINER ===");
    const examinerContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const examinerPage = await examinerContext.newPage();
    attachListeners(examinerPage);

    await examinerPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await examinerPage.waitForTimeout(1000);
    // Click Examiner tab
    const examinerTab = await examinerPage.$('button:has-text("Examiner")');
    if (examinerTab) await examinerTab.click();
    await examinerPage.fill('input[type="email"]', 'examiner@exam.com');
    await examinerPage.fill('input[type="password"]', 'examiner123');
    await examinerPage.click('button[type="submit"]');
    await examinerPage.waitForURL('**/examiner', { timeout: 15000 });

    await checkPage(examinerPage, "Examiner Control Center", "/examiner", "08_examiner_dashboard");
    await checkPage(examinerPage, "Examiner Exams", "/examiner/exams", "09_examiner_exams");
    await checkPage(examinerPage, "Examiner Questions", "/examiner/questions", "10_examiner_questions");
    await checkPage(examinerPage, "Examiner Results", "/examiner/results", "11_examiner_results");
    await checkPage(examinerPage, "Examiner Exam Access / Re-attempt", "/examiner/exam-access", "12_examiner_exam_access");
    await examinerContext.close();

    // -------------------------------------------------------------
    // Context 3: Admin Flow
    // -------------------------------------------------------------
    console.log("\n=== LOGGING IN AS ADMIN ===");
    const adminContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const adminPage = await adminContext.newPage();
    attachListeners(adminPage);

    await adminPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(1000);
    const adminTab = await adminPage.$('button:has-text("Admin")');
    if (adminTab) await adminTab.click();
    await adminPage.fill('input[type="email"]', 'admin@exam.com');
    await adminPage.fill('input[type="password"]', 'admin123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('**/admin', { timeout: 15000 });

    await checkPage(adminPage, "Admin Console", "/admin", "13_admin_dashboard");
    await checkPage(adminPage, "Admin Candidates", "/admin/candidates", "14_admin_candidates");
    await checkPage(adminPage, "Admin Users", "/admin/users", "15_admin_users");
    await adminContext.close();

    console.log("\n================================================================");
    console.log(` HYDRATION CHECK SUMMARY: ${hydrationErrors.length} hydration errors`);
    if (hydrationErrors.length > 0) {
      console.warn("Hydration error details:", hydrationErrors);
    } else {
      console.log(" [SUCCESS] Zero hydration mismatch errors detected across ALL portals!");
    }
    console.log("================================================================");

  } catch (err) {
    console.error("Verification failed with exception:", err);
  } finally {
    await browser.close();
  }
}

runUIVerification();
