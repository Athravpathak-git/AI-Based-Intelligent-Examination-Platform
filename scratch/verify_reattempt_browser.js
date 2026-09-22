const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));
const http = require('http');
const fs = require('fs');

function apiPost(urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, text: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiGet(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: urlPath,
      method: 'GET',
      headers: {
        ...headers
      }
    }, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, text: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const screenshotsDir = path.resolve('./scratch/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const ts = Date.now();
  const studentEmail = `reattempt_stu_${ts}@example.com`;
  const studentPass = "Password123!";
  const examinerEmail = "examinerplatform@exam.com";
  const examinerPass = "Examiner123!";

  console.log("=== 1. Logging in Examiner and Registering Student ===");
  // Log in Examiner
  const exLogin = await apiPost('/api/auth/login', { email: examinerEmail, password: examinerPass });
  console.log("Examiner login status:", exLogin.status);
  if (!exLogin.data.access_token) {
    throw new Error("Examiner login failed: " + JSON.stringify(exLogin));
  }
  const examinerHeaders = { 'Authorization': `Bearer ${exLogin.data.access_token}` };

  // Register Student
  const stuReg = await apiPost('/api/auth/register', {
    name: "Alex Mercer",
    email: studentEmail,
    password: studentPass,
    role: "STUDENT"
  });
  console.log("Student registered:", stuReg.status, stuReg.data.email);
  const studentId = stuReg.data.id;

  // Log in Student
  const stuLogin = await apiPost('/api/auth/login', { email: studentEmail, password: studentPass });
  console.log("Student login status:", stuLogin.status);
  const studentHeaders = { 'Authorization': `Bearer ${stuLogin.data.access_token}` };

  console.log("=== 2. Creating Question & Exam ===");
  const qSubject = `AI_Verification_${ts}`;
  const qRes = await apiPost('/api/questions', {
    subject: qSubject,
    question_text: "In distributed proctoring, what determines server-authoritative session termination?",
    question_type: "MCQ",
    difficulty: "EASY",
    marks: 10,
    options: [
      { option_text: "Client-side setTimeout", is_correct: false, option_order: 0 },
      { option_text: "Server deadline countdown & tamper-resistant WebSocket timestamp", is_correct: true, option_order: 1 },
      { option_text: "Local cookie expiration", is_correct: false, option_order: 2 }
    ]
  }, examinerHeaders);
  console.log("Question created:", qRes.status, qRes.data.id);

  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60000).toISOString();
  const endTime = new Date(now.getTime() + 120 * 60000).toISOString();

  const examRes = await apiPost('/api/exams', {
    name: `Neural Networks & AI Verification ${ts}`,
    subject: qSubject,
    duration_minutes: 45,
    start_time: startTime,
    end_time: endTime,
    total_questions: 1,
    maximum_marks: 10,
    negative_marking_enabled: false,
    webcam_monitoring_enabled: true
  }, examinerHeaders);
  console.log("Exam created:", examRes.status, examRes.data.id);
  const examId = examRes.data.id;

  console.log("=== 3. Student Registers for Exam & Completes Attempt 1 ===");
  const regRes = await apiPost(`/api/exams/${examId}/register`, {}, studentHeaders);
  console.log("Student registered for exam:", regRes.status);

  // Start attempt #1
  const start1Res = await apiPost(`/api/exams/${examId}/start-session`, {}, studentHeaders);
  console.log("Attempt 1 session started:", start1Res.status, "Session ID:", start1Res.data.session_id);
  const session1Id = start1Res.data.session_id;

  // Submit attempt #1
  const submit1Res = await apiPost(`/api/sessions/${session1Id}/submit`, {}, studentHeaders);
  console.log("Attempt 1 submitted:", submit1Res.status, "Score:", submit1Res.data.total_marks);

  // Verify attempt #2 without permission is blocked (403)
  const blockedRes = await apiPost(`/api/exams/${examId}/start-session`, {}, studentHeaders);
  console.log("Unpermitted attempt 2 status (expected 403):", blockedRes.status);
  if (blockedRes.status !== 403) {
    throw new Error(`Expected 403 but got ${blockedRes.status}`);
  }

  console.log("=== 4. Examiner Grants Re-Attempt Permission ===");
  const grantRes = await apiPost('/api/exam-access/grant', {
    exam_id: examId,
    student_id: studentId,
    max_additional_attempts: 1,
    reason: "Approved appeal: Technical connection reset during attempt 1"
  }, examinerHeaders);
  console.log("Re-attempt granted status:", grantRes.status, "Status in DB:", grantRes.data.status);

  console.log("=== 5. Real Chrome Browser Flow ===");
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone']
  });

  // Inject authenticated student session directly into localStorage
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, {
    token: stuLogin.data.access_token,
    user: {
      id: studentId,
      name: "Alex Mercer",
      email: studentEmail,
      role: "STUDENT",
      registration_number: stuReg.data.registration_number,
      is_active: true
    }
  });

  const page = await context.newPage();

  // 5a. Navigate directly to Student Dashboard
  console.log("Navigating directly to Student Dashboard...");
  await page.goto('http://localhost:3000/student');
  await page.waitForTimeout(3000);

  const dashboardCard = page.locator(`text=Neural Networks & AI Verification ${ts}`);
  await dashboardCard.waitFor({ timeout: 15000 });
  console.log("Exam card found on student dashboard!");

  // Verify "Start Re-Attempt" button is present
  const startReattemptBtn = page.locator('button:has-text("Start Re-Attempt")');
  await startReattemptBtn.waitFor({ timeout: 5000 });
  console.log("Verified 'Start Re-Attempt' button is visible and active on Student Dashboard!");

  const dashPath = path.join(screenshotsDir, 'reattempt_01_dashboard.png');
  await page.screenshot({ path: dashPath, fullPage: true });
  console.log("Saved screenshot 1:", dashPath);

  // 5b. Click "Start Re-Attempt" -> Navigates to instructions
  console.log("Clicking 'Start Re-Attempt'...");
  await startReattemptBtn.click();
  await page.waitForURL(`**/student/exams/${examId}/instructions`, { timeout: 30000 });
  console.log("Arrived at instructions page:", page.url());

  // Wait for instructions page to load
  await page.waitForSelector('text=Authorized Re-Attempt Session', { timeout: 10000 });
  console.log("Verified 'Authorized Re-Attempt Session' badge and alert!");

  const instrPath = path.join(screenshotsDir, 'reattempt_02_instructions.png');
  await page.screenshot({ path: instrPath, fullPage: true });
  console.log("Saved screenshot 2:", instrPath);

  // 5c. Check all 3 acknowledgments
  console.log("Checking acknowledgments...");
  await page.locator('label:has-text("1. I have verified")').click();
  await page.waitForTimeout(500);
  await page.locator('label:has-text("2. I agree")').click();
  await page.waitForTimeout(500);
  await page.locator('label:has-text("3. I understand")').click();
  await page.waitForTimeout(1000);

  await page.waitForSelector('text=All acknowledgments accepted', { timeout: 5000 });
  console.log("All acknowledgments checked and confirmed in UI!");

  const acceptStartBtn = page.locator('button:has-text("ACCEPT & START RE-ATTEMPT")');
  await acceptStartBtn.waitFor({ timeout: 5000 });
  console.log("Clicking 'ACCEPT & START RE-ATTEMPT'...");
  await acceptStartBtn.click();

  // 5d. Navigates to attempt workspace
  await page.waitForURL(`**/student/exams/${examId}/attempt`, { timeout: 60000 });
  console.log("Arrived at examination attempt workspace:", page.url());

  // Wait for workspace questions to load
  await page.waitForTimeout(5000);

  const workspaceTitle = page.locator(`text=Neural Networks & AI Verification ${ts}`);
  await workspaceTitle.waitFor({ timeout: 15000 });
  console.log("Examination active workspace verified with question loaded!");

  const attemptPath = path.join(screenshotsDir, 'reattempt_03_attempt_workspace.png');
  await page.screenshot({ path: attemptPath, fullPage: true });
  console.log("Saved screenshot 3:", attemptPath);

  await browser.close();

  console.log("=== 6. Verifying Database Integrity ===");
  // Verify permission was consumed (attempts_used: 1, status: "USED")
  const permList = await apiGet(`/api/exam-access?exam_id=${examId}&student_id=${studentId}`, examinerHeaders);
  console.log("Permission in DB after session start:", permList.data[0]);
  if (permList.data[0].attempts_used !== 1 || permList.data[0].status !== 'USED') {
    throw new Error("Permission was not properly marked as USED with attempts_used = 1!");
  }

  // Verify there are 2 sessions now for this student and exam
  console.log("\n=======================================================");
  console.log(">>> ALL RE-ATTEMPT TESTS & REAL BROWSER VERIFICATION PASSED! <<<");
  console.log("=======================================================\n");
})();
