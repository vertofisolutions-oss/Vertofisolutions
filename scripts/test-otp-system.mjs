import {
  generateSecureOtp,
  hashOtp,
  createAndSendOtp,
  verifyOtpCode,
  checkRateLimit,
} from "../apps/web-landing/src/lib/otp-service.ts";

async function runOtpTests() {
  console.log("--------------------------------------------------");
  console.log("🧪 RUNNING REAL-TIME EMAIL OTP SYSTEM VERIFICATION");
  console.log("--------------------------------------------------\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Secure OTP Generation
  const otp1 = generateSecureOtp();
  assert(/^\d{6}$/.test(otp1), `Generated OTP "${otp1}" is exactly 6 numeric digits`);

  // Test 2: Unpredictability
  const otp2 = generateSecureOtp();
  assert(otp1 !== otp2, `Successive OTPs are random and unpredictable (${otp1} vs ${otp2})`);

  // Test 3: Hashing
  const hash1 = hashOtp(otp1);
  const hash2 = hashOtp(otp1);
  assert(hash1.length === 64 && hash1 === hash2, `SHA-256 hash is 64 hex chars and deterministic`);
  assert(hash1 !== otp1, `Raw OTP is never exposed as hash`);

  // Test 4: Creation & Email Sending
  const email = `testuser_${Date.now()}@example.com`;
  const { challengeId, resendAfterSeconds, formattedTime } = await createAndSendOtp(email, "EMAIL_VERIFICATION");
  assert(challengeId.startsWith("chal_"), `Generated challenge ID: ${challengeId}`);
  assert(resendAfterSeconds === 60, `Resend cooldown is 60 seconds`);
  assert(typeof formattedTime === "string" && formattedTime.length > 0, `Expiry time formatted correctly: ${formattedTime}`);

  // Test 5: Resend Cooldown Enforcement
  try {
    await createAndSendOtp(email, "EMAIL_VERIFICATION");
    assert(false, "Cooldown did not block immediate resend");
  } catch (err) {
    assert(err.message.includes("COOLDOWN_ACTIVE"), `Immediate resend correctly blocked by 60s cooldown`);
  }

  // Test 6: Invalid Code Attempt
  const badRes = verifyOtpCode(challengeId, "000000", "EMAIL_VERIFICATION");
  assert(!badRes.valid && badRes.reason.includes("Invalid verification code"), `Invalid OTP correctly rejected`);

  // Test 7: Max Attempts (5 failed attempts invalidates OTP)
  const email2 = `testuser2_${Date.now()}@example.com`;
  const challenge2 = await createAndSendOtp(email2, "EMAIL_VERIFICATION");
  for (let i = 0; i < 4; i++) {
    verifyOtpCode(challenge2.challengeId, "111111", "EMAIL_VERIFICATION");
  }
  const fifthFail = verifyOtpCode(challenge2.challengeId, "111111", "EMAIL_VERIFICATION");
  assert(!fifthFail.valid && fifthFail.reason.includes("Too many incorrect attempts"), `Max 5 attempts enforced (OTP invalidated)`);

  // Test 8: Rate Limiting
  const rateLimitKey = `test_limit_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    checkRateLimit(rateLimitKey);
  }
  const blocked = checkRateLimit(rateLimitKey);
  assert(!blocked, `Rate limit enforced after 5 requests`);

  console.log("\n--------------------------------------------------");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("--------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runOtpTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
