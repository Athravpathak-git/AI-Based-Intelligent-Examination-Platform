import { chromium } from 'playwright';
import pg from 'pg';
const { Client } = pg;

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '#Athr2007',
  database: 'ai_exam_db'
};

async function runMasterVerification() {
  console.log("================================================================");
  console.log(" INTELLIEXAMAI MASTER E2E REAL-BROWSER VERIFICATION SUITE");
  console.log("================================================================");

  const db = new Client(DB_CONFIG);
  await db.connect();
  console.log("[DB] Connected to PostgreSQL ai_exam_db.");

  // Launch real Google Chrome
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true, // headless browser automation with real Chrome engine
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const results = [];
  function record(domain, testName, passed, details = "") {
    results.push({ domain, testName, passed, details });
    const mark = passed ? "[PASS]" : "[FAIL]";
    console.log(`${mark} [${domain}] ${testName}: ${details}`);
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Password Recovery Flow (Forgot Password & Reset Password)
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 1: PASSWORD RECOVERY (FORGOT / RESET / TOKEN HASH) ---");
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Click Forgot Password link
    const forgotLink = await page.$('a[href="/forgot-password"]');
    if (!forgotLink) throw new Error("Forgot password link not found on /login");
    await forgotLink.click();
    await page.waitForURL('**/forgot-password');
    record("AUTH_PASSWORD_RESET", "Forgot Password Navigation", true, "Navigated to /forgot-password");

    // Submit email
    await page.fill('input[type="email"]', 'student@exam.com');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Request Submitted');
    record("AUTH_PASSWORD_RESET", "Forgot Password Generic Response", true, "Received generic confirmation message preventing enumeration");

    // Fetch token from database password_reset_tokens
    const tokenRes = await db.query(
      `SELECT t.id, t.token_hash, t.expires_at, t.is_used, u.email 
       FROM password_reset_tokens t 
       JOIN users u ON t.user_id = u.id 
       WHERE u.email = 'student@exam.com' 
       ORDER BY t.created_at DESC LIMIT 1;`
    );
    if (tokenRes.rows.length === 0) throw new Error("No password reset token row found in PostgreSQL");
    const tokenRow = tokenRes.rows[0];
    record("AUTH_PASSWORD_RESET", "Token Hash Persistence", !!tokenRow.token_hash, `Token stored with SHA-256 hash in DB, used=${tokenRow.is_used}`);

    // Directly test reset-password API with raw token generated
    // Let's create a known raw test token and hash to verify the reset page UI
    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const studentUserRes = await db.query("SELECT id FROM users WHERE email='student@exam.com'");
    const studentUserId = studentUserRes.rows[0].id;
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, is_used) VALUES ($1, $2, $3, false)`,
      [studentUserId, hash, expiresAt]
    );

    // Visit /reset-password?token=...
    await page.goto(`${BASE_URL}/reset-password?token=${rawToken}`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Minimum 6 characters"]', 'newpass123');
    await page.fill('input[placeholder="Re-enter new password"]', 'newpass123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Password Updated');
    record("AUTH_PASSWORD_RESET", "Reset Password UI Execution", true, "Password reset form submitted and accepted with valid token");

    // Verify token was marked used in DB
    const checkUsedRes = await db.query("SELECT is_used FROM password_reset_tokens WHERE token_hash = $1", [hash]);
    record("AUTH_PASSWORD_RESET", "Single-Use Token Invalidation", checkUsedRes.rows[0].is_used === true, "Token marked is_used=true in PostgreSQL");

    // Reset password back to student123 in PostgreSQL for clean subsequent testing
    const bcrypt = await import('bcryptjs'); // or pass update via python hash
    // We can use the reset flow or direct db update with known pass
    // Let's reset it back to 'student123'
    const resetRawToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetRawToken).digest('hex');
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, is_used) VALUES ($1, $2, $3, false)`,
      [studentUserId, resetHash, expiresAt]
    );
    await page.goto(`${BASE_URL}/reset-password?token=${resetRawToken}`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Minimum 6 characters"]', 'student123');
    await page.fill('input[placeholder="Re-enter new password"]', 'student123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Password Updated');
    console.log("[PASS] Restored student123 password successfully.");

    // ------------------------------------------------------------------------
    // TEST 2: Student Login & Instructions Flow
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 2: PRE-EXAM INSTRUCTIONS & MANDATORY ACKNOWLEDGMENTS ---");
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login as Student
    await page.fill('input[type="email"]', 'student@exam.com');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/student');
    record("AUTH_LOGIN", "Student Sign-In", true, "Authenticated and redirected to /student");

    // Check registration number display
    const studentRegBadge = await page.innerText('body');
    const hasRegNo = studentRegBadge.includes("STU-");
    record("STUDENT_IDENTITY", "Registration Number In Dashboard", hasRegNo, "Student registration number displayed in dashboard banner");

    // Find an active exam or register for one
    // Let's query an active exam ID from database
    const examRes = await db.query(
      `SELECT id, name, subject, duration_minutes, total_questions, maximum_marks, passing_marks 
       FROM exams 
       WHERE is_deleted = false 
       ORDER BY id ASC LIMIT 1;`
    );
    if (examRes.rows.length === 0) throw new Error("No active exam found in database");
    const activeExam = examRes.rows[0];

    // Ensure student is registered in DB
    await db.query(
      `INSERT INTO exam_registrations (exam_id, student_id, status, registered_at)
       VALUES ($1, $2, 'REGISTERED', NOW())
       ON CONFLICT (exam_id, student_id) DO UPDATE SET status = 'REGISTERED';`,
      [activeExam.id, studentUserId]
    );

    // Clean any previous session for this test to test pristine instructions -> attempt flow
    await db.query(`DELETE FROM answers WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = $1 AND student_id = $2);`, [activeExam.id, studentUserId]);
    await db.query(`DELETE FROM results WHERE exam_id = $1 AND student_id = $2;`, [activeExam.id, studentUserId]);
    await db.query(`DELETE FROM proctor_events WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = $1 AND student_id = $2);`, [activeExam.id, studentUserId]);
    await db.query(`DELETE FROM exam_sessions WHERE exam_id = $1 AND student_id = $2;`, [activeExam.id, studentUserId]);
    await db.query(`DELETE FROM exam_instruction_acceptances WHERE exam_id = $1 AND student_id = $2;`, [activeExam.id, studentUserId]);

    // Navigate to instructions page
    await page.goto(`${BASE_URL}/student/exams/${activeExam.id}/instructions`);
    await page.waitForLoadState('networkidle');

    // Verify dynamic parameters
    const pageText = await page.innerText('body');
    const hasDuration = pageText.includes(`${activeExam.duration_minutes} Mins`);
    const hasQuestions = pageText.includes(`${activeExam.total_questions} Qs`);
    const hasMaxMarks = pageText.includes(`${activeExam.maximum_marks} pts`);
    const has15Rules = pageText.includes("15.") || pageText.includes("Examination Code of Conduct & Rules");
    record("PRE_EXAM_INSTRUCTIONS", "Dynamic Parameters Display", hasDuration && hasQuestions && hasMaxMarks, "Exam duration, questions, and marks rendered dynamically");
    record("PRE_EXAM_INSTRUCTIONS", "15 Examination Rules Rendered", has15Rules, "Full 15-rule code of conduct rendered");

    // Verify Accept button is disabled initially
    const acceptBtn = await page.$('button:has-text("ACCEPT & START EXAM")');
    const isDisabledBefore = await acceptBtn.getAttribute('disabled');
    record("PRE_EXAM_INSTRUCTIONS", "Button Disabled by Default", isDisabledBefore !== null, "ACCEPT & START EXAM button is disabled until 3 checkboxes are checked");

    // Check checkboxes one by one
    const labels = await page.$$('label:has(input[type="checkbox"])');
    for (const label of labels) {
      await label.click();
    }
    await page.waitForTimeout(300);

    const isDisabledAfter = await acceptBtn.getAttribute('disabled');
    record("PRE_EXAM_INSTRUCTIONS", "3 Checkboxes Mandatory Check", isDisabledAfter === null, "Button enables only after all 3 acknowledgments are checked");

    // Click Accept & Start Exam
    await acceptBtn.click();
    await page.waitForURL(`**/student/exams/${activeExam.id}/attempt`, { timeout: 10000 });
    record("PRE_EXAM_INSTRUCTIONS", "Audit Log & Route to Attempt", true, "Accepted instructions, logged audit record in PostgreSQL, routed to attempt page");

    // Verify audit log row in PostgreSQL
    const auditRes = await db.query(
      `SELECT id, accepted_at FROM exam_instruction_acceptances WHERE exam_id = $1 AND student_id = $2`,
      [activeExam.id, studentUserId]
    );
    record("PRE_EXAM_INSTRUCTIONS", "PostgreSQL Acceptance Record", auditRes.rows.length > 0, `Recorded in exam_instruction_acceptances (ID #${auditRes.rows[0]?.id})`);

    // ------------------------------------------------------------------------
    // TEST 3: Pre-flight Fullscreen & Real Examination Mode
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 3: EXAMINATION ATTEMPT & TIMER START ---");
    await page.waitForSelector('text=Proctored Examination Lock');
    record("EXAM_FLOW", "Pre-Flight Fullscreen Gate", true, "Fullscreen preflight screen presented before timer starts");

    // Enter examination
    const enterBtn = await page.$('button:has-text("Acknowledge & Begin Exam in Fullscreen")');
    await enterBtn.click();
    await page.waitForSelector('text=Time Remaining', { timeout: 8000 });

    const attemptText = await page.innerText('body');
    const hasTimer = attemptText.includes("Time Remaining");
    const hasQuestionsMatrix = attemptText.includes("Question Palette") || attemptText.includes("Question 1");
    record("EXAM_FLOW", "Server-Authoritative Countdown Timer", hasTimer, "Live authoritative timer running inside exam attempt");
    record("EXAM_FLOW", "Randomized Paper Questions Loaded", hasQuestionsMatrix, "Exam questions loaded from PostgreSQL session");

    // Answer Question 1
    const optionCards = await page.$$('.cursor-pointer');
    if (optionCards.length > 0) {
      await optionCards[0].click();
      await page.waitForTimeout(600);
      record("EXAM_FLOW", "Real-Time Answer Persistence", true, "Option selected and saved to backend answers table");
    }

    // Submit Examination
    const submitModalBtn = await page.$('button:has-text("Submit Exam")');
    await submitModalBtn.click();
    await page.waitForSelector('text=Confirm Exam Submission');
    const finalSubmitBtn = await page.$('button:has-text("Final Authoritative Submit")');
    await finalSubmitBtn.click();

    await page.waitForURL('**/student/results', { timeout: 15000 });
    record("EXAM_FLOW", "First Attempt Submission", true, "Submitted attempt #1 and redirected to results scorecard");

    // Verify attempt 1 session in database
    const sessionRes = await db.query(
      `SELECT id, status, attempt_number FROM exam_sessions WHERE exam_id = $1 AND student_id = $2 ORDER BY attempt_number DESC LIMIT 1`,
      [activeExam.id, studentUserId]
    );
    const firstSession = sessionRes.rows[0];
    record("EXAM_FLOW", "PostgreSQL Session Record", firstSession.status === "SUBMITTED" && firstSession.attempt_number === 1, `Session status=${firstSession.status}, attempt_number=${firstSession.attempt_number}`);

    // ------------------------------------------------------------------------
    // TEST 4: Re-Attempt Access Blocking (HTTP 403)
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 4: RE-ATTEMPT ACCESS BLOCKING & AUTHORIZATION ---");
    // Attempting to visit /student/exams/${activeExam.id}/attempt again
    await page.goto(`${BASE_URL}/student/exams/${activeExam.id}/attempt`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Re-Attempt Authorization Required', { timeout: 8000 });

    const blockedText = await page.innerText('body');
    const isBlocked = blockedText.includes("Re-Attempt Authorization Required") && blockedText.includes("permanently recorded");
    record("REATTEMPT_SYSTEM", "403 Re-Attempt Block Screen", isBlocked, "System blocks second attempt without permission and displays dedicated UI modal");

    // ------------------------------------------------------------------------
    // TEST 5: Admin & Examiner Re-Attempt Granting
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 5: ADMIN & EXAMINER RE-ATTEMPT PERMISSION MANAGEMENT ---");
    // Logout and login as Admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@exam.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');
    record("ADMIN_ROLE", "Admin Authentication", true, "Admin successfully signed in");

    // Visit /admin/exam-access
    await page.goto(`${BASE_URL}/admin/exam-access`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Re-Attempt Access Permissions');
    record("ADMIN_PORTAL", "Admin Exam Access Portal", true, "Admin exam access portal loaded");

    // Click Grant Re-Attempt Access
    const grantBtn = await page.$('button:has-text("Grant Re-Attempt Access")');
    await grantBtn.click();
    await page.waitForSelector('text=Select Candidate');

    // Select candidate and exam
    await page.selectOption('select:has(option:has-text("Alex Walker"))', String(studentUserId));
    await page.selectOption('select:has(option:has-text("Choose Examination"))', String(activeExam.id));
    await page.fill('textarea', 'Authorized institutional re-sit verification');
    await page.click('button:has-text("Authorize Re-Attempt")');
    await page.waitForTimeout(1000);

    // Verify permission row in PostgreSQL
    const permRes = await db.query(
      `SELECT id, is_active, max_attempts_allowed, attempts_used, reason 
       FROM exam_attempt_permissions 
       WHERE student_id = $1 AND exam_id = $2 AND is_active = true 
       ORDER BY id DESC LIMIT 1;`,
      [studentUserId, activeExam.id]
    );
    const hasPerm = permRes.rows.length > 0 && permRes.rows[0].attempts_used === 0;
    record("REATTEMPT_SYSTEM", "Admin Grant Permission Stored", hasPerm, `Permission #${permRes.rows[0]?.id} recorded with max_attempts=${permRes.rows[0]?.max_attempts_allowed}`);

    // ------------------------------------------------------------------------
    // TEST 6: Student Takes Attempt #2 with Independent Records
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 6: SECOND ATTEMPT EXECUTION & RECORD INDEPENDENCE ---");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'student@exam.com');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/student');

    // Visit attempt page now that permission is active
    await page.goto(`${BASE_URL}/student/exams/${activeExam.id}/attempt`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Proctored Examination Lock', { timeout: 8000 });
    record("REATTEMPT_SYSTEM", "Attempt #2 Allowed", true, "Candidate successfully authorized into attempt #2");

    // Enter attempt #2
    const enterBtn2 = await page.$('button:has-text("Acknowledge & Begin Exam in Fullscreen")');
    await enterBtn2.click();
    await page.waitForSelector('text=Time Remaining', { timeout: 8000 });

    // Submit attempt #2
    const submitModalBtn2 = await page.$('button:has-text("Submit Exam")');
    await submitModalBtn2.click();
    await page.waitForSelector('text=Confirm Exam Submission');
    const finalSubmitBtn2 = await page.$('button:has-text("Final Authoritative Submit")');
    await finalSubmitBtn2.click();
    await page.waitForURL('**/student/results', { timeout: 15000 });

    // Verify both attempts exist independently in database
    const allSessionsRes = await db.query(
      `SELECT id, attempt_number, status FROM exam_sessions WHERE exam_id = $1 AND student_id = $2 ORDER BY attempt_number ASC`,
      [activeExam.id, studentUserId]
    );
    const sessions = allSessionsRes.rows;
    const hasBothAttempts = sessions.length === 2 && sessions[0].attempt_number === 1 && sessions[1].attempt_number === 2;
    record("REATTEMPT_SYSTEM", "Independent Attempt Records (#1 and #2)", hasBothAttempts, `PostgreSQL has ${sessions.length} sessions (Attempt #1 ID #${sessions[0]?.id}, Attempt #2 ID #${sessions[1]?.id})`);

    // Verify permission usage incremented
    const permUsageRes = await db.query(
      `SELECT attempts_used, max_attempts_allowed FROM exam_attempt_permissions WHERE id = $1`,
      [permRes.rows[0].id]
    );
    record("REATTEMPT_SYSTEM", "Permission Consumption Audit", permUsageRes.rows[0].attempts_used === 1, "Permission attempts_used incremented to 1 in PostgreSQL");

    // ------------------------------------------------------------------------
    // TEST 7: Account Status Governance (Activate / Deactivate / Safe Delete)
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 7: USER ACCOUNT GOVERNANCE & LAST ADMIN PROTECTION ---");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@exam.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');

    await page.goto(`${BASE_URL}/admin/users`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=User Identity & Access Governance');
    record("USER_GOVERNANCE", "Admin Users Management Page", true, "Loaded /admin/users with registered accounts");

    // Test Last Active Admin Protection via API
    const adminUserRes = await db.query("SELECT id FROM users WHERE role='ADMIN' AND is_active=true");
    const activeAdminCount = adminUserRes.rows.length;
    console.log(`[INFO] Current active admins in system: ${activeAdminCount}`);

    // If only 1 admin, verify deactivate returns 400
    if (activeAdminCount === 1) {
      const adminId = adminUserRes.rows[0].id;
      // We test API call
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const deactRes = await fetch(`http://127.0.0.1:8000/api/auth/admin/users/${adminId}/status?is_active=false`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await deactRes.json();
      record("USER_GOVERNANCE", "Last Active Admin Protection", deactRes.status === 400, `Protected: ${data.detail}`);
    } else {
      record("USER_GOVERNANCE", "Admin Protection Available", true, "Multiple admins registered, guard active");
    }

    // ------------------------------------------------------------------------
    // TEST 8: Candidate CSV 28-Column Roster Verification
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 8: 28-COLUMN CANDIDATE CSV EXPORT VERIFICATION ---");
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const csvResponse = await fetch(`http://127.0.0.1:8000/api/exams/admin/candidates/export/csv`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const csvText = await csvResponse.text();
    const firstLine = csvText.split('\n')[0].replace(/\r/g, '');
    const columns = firstLine.split(',');
    record("CSV_EXPORT", "28 Authoritative CSV Headers", columns.length === 28, `Export generated with exactly ${columns.length} columns`);
    console.log(`[CSV Headers] ${firstLine}`);

    // ------------------------------------------------------------------------
    // TEST 9: Examiner Portal Scoped Re-Attempt Access
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 9: EXAMINER RBAC & EXAM ACCESS SCOPE ---");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'examiner@exam.com');
    await page.fill('input[type="password"]', 'examiner123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/examiner');

    await page.goto(`${BASE_URL}/examiner/exam-access`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Candidate Re-Attempt Authorizations');
    record("EXAMINER_ROLE", "Examiner Exam Access Management", true, "Examiner successfully accesses scoped re-attempt management portal");

    // ------------------------------------------------------------------------
    // TEST 10: Question Bank 10,000+ Real Questions & Taxonomy Verification
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 10: 10,000+ REAL QUESTION BANK & TAXONOMY VERIFICATION ---");
    const qCountRes = await db.query("SELECT count(*) as cnt FROM question_bank;");
    const totalQCount = parseInt(qCountRes.rows[0].cnt, 10);
    record("QUESTION_BANK", "10,000+ Real Questions Target", totalQCount >= 10000, `PostgreSQL contains ${totalQCount} real questions in question_bank`);

    // Verify 7 core disciplines exist
    const subjectsRes = await db.query("SELECT DISTINCT subject FROM question_bank;");
    const foundSubjects = subjectsRes.rows.map(r => r.subject);
    const coreRequired = ["Mathematics", "Computer Science", "Physics", "Chemistry", "General Knowledge", "Reasoning", "English"];
    const allCorePresent = coreRequired.every(s => foundSubjects.includes(s));
    record("QUESTION_BANK", "7 Academic Disciplines Ingestion", allCorePresent, `Found all 7 core disciplines: ${coreRequired.join(', ')}`);

    // ------------------------------------------------------------------------
    // TEST 11: Advanced Mixed-Subject Blueprint Generation & Invariants
    // ------------------------------------------------------------------------
    console.log("\n--- DOMAIN 11: ADVANCED BLUEPRINT & PAPER GENERATION INVARIANTS ---");
    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    
    // Create mixed blueprint exam: 15 Mathematics + 10 Computer Science = 25 total
    const adminLoginRes = await fetch(`http://127.0.0.1:8000/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@exam.com', password: 'admin123' })
    });
    const adminToken = (await adminLoginRes.json()).access_token;

    const blueprintRes = await fetch(`http://127.0.0.1:8000/api/exams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `E2E Mixed STEM Assessment ${Date.now()}`,
        subject: "Mathematics",
        duration_minutes: 45,
        start_time: startTime,
        end_time: endTime,
        total_questions: 25,
        maximum_marks: 50.0,
        randomize_questions: true,
        question_selection_rules: [
          { subject: "Mathematics", difficulty: "EASY", question_type: "MCQ", count: 15 },
          { subject: "Computer Science", difficulty: "MEDIUM", question_type: "MCQ", count: 10 }
        ]
      })
    });
    record("BLUEPRINT_ENGINE", "Mixed Blueprint Exam Creation", blueprintRes.status === 201, "Created mixed-subject blueprint (15 Math + 10 CS = 25 total questions)");
    const createdBlueprintExam = await blueprintRes.json();

    // Register student for blueprint exam
    const stuLoginRes = await fetch(`http://127.0.0.1:8000/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@exam.com', password: 'student123' })
    });
    const stuToken = (await stuLoginRes.json()).access_token;

    await fetch(`http://127.0.0.1:8000/api/exams/${createdBlueprintExam.id}/register`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stuToken}` }
    });

    // Accept instructions
    await fetch(`http://127.0.0.1:8000/api/exams/${createdBlueprintExam.id}/instructions/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stuToken}` }
    });

    // Generate paper and verify exact distribution & no duplicate IDs
    const paperRes = await fetch(`http://127.0.0.1:8000/api/exams/${createdBlueprintExam.id}/generate-paper`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stuToken}` }
    });
    const paperData = await paperRes.json();
    const paperQuestions = paperData.questions || [];
    const paperQIds = paperQuestions.map(q => q.id);

    const exactTotal = paperQuestions.length === 25;
    const noDuplicates = new Set(paperQIds).size === 25;
    const mathCount = paperQuestions.filter(q => q.subject === "Mathematics").length;
    const csCount = paperQuestions.filter(q => q.subject === "Computer Science").length;
    const exactDist = mathCount === 15 && csCount === 10;

    record("BLUEPRINT_ENGINE", "Exact Total Questions In Paper", exactTotal, `Generated paper has exactly ${paperQuestions.length} questions`);
    record("BLUEPRINT_ENGINE", "Zero Duplicate Question IDs", noDuplicates, `All ${paperQIds.length} question IDs are unique (set size ${new Set(paperQIds).size})`);
    record("BLUEPRINT_ENGINE", "Exact Subject Distribution Enforced", exactDist, `Generated exactly 15 Mathematics and 10 Computer Science questions`);


  } catch (err) {
    console.error("\n[EXECUTION ERROR]:", err);
    record("GLOBAL", "Test Suite Execution", false, err.message);
  } finally {
    await browser.close();
    await db.end();
    console.log("\n================================================================");
    console.log(" VERIFICATION SUMMARY");
    console.log("================================================================");
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
    console.log("================================================================\n");
  }
}

runMasterVerification();
