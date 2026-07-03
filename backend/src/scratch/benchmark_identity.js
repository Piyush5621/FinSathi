import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { AuthenticationService } from "../modules/identity/services/AuthenticationService.js";
import { OrganizationBootstrapService } from "../modules/identity/services/OrganizationBootstrapService.js";
import { RbacService } from "../modules/identity/services/RbacService.js";
import { SessionService } from "../modules/identity/services/SessionService.js";
import { supabase } from "../config/db.js";

async function runBenchmark() {
  console.log("--- RUNNING IDENTITY PERFORMANCE BENCHMARKS (REMOTE SUPABASE DB) ---");
  
  const suffix = Date.now().toString().slice(-6);
  const testEmail = `bench_user_${suffix}@example.com`;
  const testPhone = `90000${suffix}`;
  const testPassword = "BenchPassword123!";
  const orgName = `Bench Org ${suffix}`;

  const requestInfo = {
    deviceName: "Benchmark Agent",
    ipAddress: "127.0.0.1",
    platform: "node",
    browser: "Node.js v22",
    operatingSystem: "Windows"
  };

  try {
    // 1. Benchmark Registration / Bootstrap
    console.log("\n[1/6] Benchmarking Tenant Registration & Seeding...");
    const regStart = performance.now();
    const regResult = await OrganizationBootstrapService.bootstrap(
      {
        name: "Benchmark User",
        email: testEmail,
        password: testPassword,
        phone: testPhone
      },
      {
        businessName: orgName,
        businessType: "Benchmark",
        city: "Mumbai",
        state: "MH"
      }
    );
    const regEnd = performance.now();
    console.log(`✅ Registration completed in ${(regEnd - regStart).toFixed(2)}ms`);

    // Warm up DB and caches
    console.log("\nWarming up connections...");
    const loginResultWarm = await AuthenticationService.login(testEmail, testPassword, requestInfo);
    let currentToken = loginResultWarm.refreshToken;
    let sessionId = loginResultWarm.session.id;

    // Run loops to calculate averages
    const iterations = 5;
    
    // 2. Login Benchmarking
    console.log(`\n[2/6] Benchmarking Unified Login (${iterations} runs)...`);
    let totalLoginTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const loginRes = await AuthenticationService.login(testEmail, testPassword, requestInfo);
      const end = performance.now();
      totalLoginTime += (end - start);
      
      // Keep session id and token updated
      sessionId = loginRes.session.id;
      currentToken = loginRes.refreshToken;
    }
    const avgLogin = totalLoginTime / iterations;
    console.log(`✅ Average Login latency: ${avgLogin.toFixed(2)}ms`);

    // 3. Refresh Benchmarking
    console.log(`\n[3/6] Benchmarking Token Refresh Rotation (${iterations} runs)...`);
    let totalRefreshTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const refreshRes = await AuthenticationService.refresh(currentToken, requestInfo);
      const end = performance.now();
      totalRefreshTime += (end - start);
      currentToken = refreshRes.refreshToken;
    }
    const avgRefresh = totalRefreshTime / iterations;
    console.log(`✅ Average Token Refresh latency: ${avgRefresh.toFixed(2)}ms`);

    // 4. Permission Matrix Benchmarking
    console.log(`\n[4/6] Benchmarking Permission Matrix Loading (${iterations} runs)...`);
    let totalPermTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await RbacService.getPermissionsMatrix();
      const end = performance.now();
      totalPermTime += (end - start);
    }
    const avgPerm = totalPermTime / iterations;
    console.log(`✅ Average Permission Matrix latency: ${avgPerm.toFixed(2)}ms`);

    // 5. Session Lookup Benchmarking
    console.log(`\n[5/6] Benchmarking Session Lookup (${iterations} runs)...`);
    let totalSessionTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await SessionService.getActiveSessions(regResult.owner.id, null);
      const end = performance.now();
      totalSessionTime += (end - start);
    }
    const avgSession = totalSessionTime / iterations;
    console.log(`✅ Average Session Lookup latency: ${avgSession.toFixed(2)}ms`);

    // 6. Logout Benchmarking
    console.log(`\n[6/6] Benchmarking Logout / Revocation...`);
    const logoutStart = performance.now();
    const actorInfo = {
      organizationId: regResult.organization.id,
      userId: regResult.owner.id,
      staffId: null
    };
    await AuthenticationService.logout(sessionId, actorInfo);
    const logoutEnd = performance.now();
    console.log(`✅ Session revocation completed in ${(logoutEnd - logoutStart).toFixed(2)}ms`);

    console.log("\n--- BENCHMARK RESULTS SUMMARY ---");
    console.log(`Tenant Bootstrap:   ${(regEnd - regStart).toFixed(2)} ms`);
    console.log(`Unified Login:      ${avgLogin.toFixed(2)} ms (avg)`);
    console.log(`Token Refresh:      ${avgRefresh.toFixed(2)} ms (avg)`);
    console.log(`RBAC Matrix Load:   ${avgPerm.toFixed(2)} ms (avg)`);
    console.log(`Session Lookup:     ${avgSession.toFixed(2)} ms (avg)`);
    console.log(`Session Logout:     ${(logoutEnd - logoutStart).toFixed(2)} ms`);
    console.log("---------------------------------\n");

    // Clean up test data
    console.log("Cleaning up benchmark records...");
    await supabase.from("users").delete().eq("id", regResult.owner.id);
    await supabase.from("organizations").delete().eq("id", regResult.organization.id);
    console.log("✅ Cleanup successful.");

  } catch (err) {
    console.error("❌ Benchmark crashed:", err);
  }
}

runBenchmark();
