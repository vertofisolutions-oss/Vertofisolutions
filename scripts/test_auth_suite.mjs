// Test script for Vertofi Auth Suite
import http from "http";

async function runTests() {
  console.log("=== Starting Vertofi Auth & Access Verification Suite ===");

  const post = (url, body) =>
    new Promise((resolve, reject) => {
      const u = new URL(url);
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          let out = "";
          res.on("data", (c) => (out += c));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(out) });
            } catch {
              resolve({ status: res.statusCode, raw: out });
            }
          });
        }
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });

  let passCount = 0;
  let failCount = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${name} — ${details}`);
      failCount++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Account 1 Correct Credentials (gouthambadiga01@gmail.com / Vertofi@7755)
  // ----------------------------------------------------
  const t1 = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: "gouthambadiga01@gmail.com",
    password: "Vertofi@7755",
  });
  assert(
    t1.status === 200 && t1.body.success === true && t1.body.tokens?.accessToken,
    "Test 1: Correct credentials for Account 1 (gouthambadiga01@gmail.com / Vertofi@7755)",
    JSON.stringify(t1)
  );

  // ----------------------------------------------------
  // Test 2: Account 1 Wrong Password (gouthambadiga01@gmail.com / WrongPassword)
  // ----------------------------------------------------
  const t2 = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: "gouthambadiga01@gmail.com",
    password: "WrongPassword",
  });
  assert(
    t2.status === 401 && t2.body.error === "Incorrect password. Please enter the correct password.",
    "Test 2: Wrong password rejected for Account 1",
    JSON.stringify(t2)
  );

  // ----------------------------------------------------
  // Test 3: Account 2 Correct Credentials (geethikaparvatham@gmail.com / Geethu@1720)
  // ----------------------------------------------------
  const t3 = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: "geethikaparvatham@gmail.com",
    password: "Geethu@1720",
  });
  assert(
    t3.status === 200 && t3.body.success === true && t3.body.tokens?.accessToken,
    "Test 3: Correct credentials for Account 2 (geethikaparvatham@gmail.com / Geethu@1720)",
    JSON.stringify(t3)
  );

  // ----------------------------------------------------
  // Test 4: Account 2 Wrong Password (geethikaparvatham@gmail.com / WrongPassword)
  // ----------------------------------------------------
  const t4 = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: "geethikaparvatham@gmail.com",
    password: "WrongPassword",
  });
  assert(
    t4.status === 401 && t4.body.error === "Incorrect password. Please enter the correct password.",
    "Test 4: Wrong password rejected for Account 2",
    JSON.stringify(t4)
  );

  // ----------------------------------------------------
  // Test 5: Non-Existing Account (randomuser@gmail.com / Anything123)
  // ----------------------------------------------------
  const t5 = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: "randomuser@gmail.com",
    password: "Anything123",
  });
  assert(
    t5.status === 404 && t5.body.error === "No account found with this email or mobile number.",
    "Test 5: Non-existing account rejected with 404 and proper message",
    JSON.stringify(t5)
  );

  // ----------------------------------------------------
  // Test 6: Duplicate Phone Check (Phone: 9876543210)
  // ----------------------------------------------------
  const t6 = await post("http://localhost:3000/api/v1/auth/check-user", {
    mobile: "9876543210",
    email: "different_email_test@example.com",
  });
  assert(
    t6.status === 200 && t6.body.exists === true && t6.body.message.includes("phone"),
    "Test 6: Duplicate phone number blocked",
    JSON.stringify(t6)
  );

  // ----------------------------------------------------
  // Test 7: Duplicate Email Check (Email: gouthambadiga01@gmail.com)
  // ----------------------------------------------------
  const t7 = await post("http://localhost:3000/api/v1/auth/check-user", {
    mobile: "9123456789",
    email: "gouthambadiga01@gmail.com",
  });
  assert(
    t7.status === 200 && t7.body.exists === true && t7.body.message.includes("email"),
    "Test 7: Duplicate email address blocked",
    JSON.stringify(t7)
  );

  // ----------------------------------------------------
  // Test 8: Register New Account & Login
  // ----------------------------------------------------
  const newEmail = `user_${Date.now()}@example.com`;
  const newPhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
  const newPass = "NewUser@123";

  const regRes = await post("http://localhost:3000/api/v1/auth/record-user", {
    name: "New Test User",
    email: newEmail,
    mobile: newPhone,
    password: newPass,
    plan: "GROWTH",
  });
  assert(regRes.status === 200 && regRes.body.success === true, "Test 8a: Account registered on server", JSON.stringify(regRes));

  // Login with correct password
  const t8_login_ok = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: newEmail,
    password: newPass,
  });
  assert(
    t8_login_ok.status === 200 && t8_login_ok.body.success === true && t8_login_ok.body.plan === "GROWTH",
    "Test 8b: New account login with correct password succeeds & retrieves saved plan GROWTH",
    JSON.stringify(t8_login_ok)
  );

  // Login with wrong password
  const t8_login_bad = await post("http://localhost:3000/api/v1/auth/login", {
    identifier: newEmail,
    password: "WrongPassword123",
  });
  assert(
    t8_login_bad.status === 401 && t8_login_bad.body.error === "Incorrect password. Please enter the correct password.",
    "Test 8c: New account login with wrong password rejected",
    JSON.stringify(t8_login_bad)
  );

  console.log(`\n=== Verification Summary: ${passCount} Passed, ${failCount} Failed ===`);
  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
