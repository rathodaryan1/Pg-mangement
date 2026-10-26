import dotenv from 'dotenv';
dotenv.config();
import { runSuperAdminTests } from './super-admin.test';
import { runTenantIsolationTests } from './tenant-isolation.test';
import { runPlanEnforcementTests } from './plan-enforcement.test';
import { runImpersonationTests } from './impersonation.test';
import { runSaasMultiTenantAudit } from './saas-multi-tenant-audit';
import { runRazorpayIntegrationTests } from './razorpay-integration.test';
import { sleep } from './db-helper';

interface SuiteResultSummary {
  name: string;
  type: 'DATABASE_INTEGRATION' | 'GATEWAY_LIVE_SERVICE' | 'CRYPTOGRAPHIC_SECURITY' | 'MOCK_FREE_API';
  passed: number;
  failed: number;
  blocked: number;
  notTested: number;
  error?: string;
}

async function main() {
  console.log('=================================================================================');
  console.log('  URBAN NEST — COMPREHENSIVE END-TO-END MULTI-TENANT VERIFICATION RUNNER         ');
  console.log('  Execution Environment: Node ' + process.version + ' (Platform: ' + process.platform + ')');
  console.log('  Database Target: ' + (process.env.DATABASE_URL ? 'Connected PostgreSQL Cluster' : 'LOCAL/NOT SET'));
  console.log('=================================================================================\n');

  const suiteSummaries: SuiteResultSummary[] = [];

  const runSuiteSafely = async (
    name: string,
    type: SuiteResultSummary['type'],
    runnerFn: () => Promise<any>
  ) => {
    console.log(`\n>>> [SUITE] ${name} (${type}) <<<`);
    try {
      const res = await runnerFn();
      const passed = res?.passed ?? 0;
      const failed = res?.failed ?? 0;
      const blocked = res?.blocked ?? 0;
      const notTested = res?.notTested ?? 0;

      suiteSummaries.push({ name, type, passed, failed, blocked, notTested });
      return { passed, failed, blocked, notTested };
    } catch (err: any) {
      console.error(`❌ Suite "${name}" failed with uncaught exception:`, err);
      suiteSummaries.push({
        name,
        type,
        passed: 0,
        failed: 1,
        blocked: 0,
        notTested: 0,
        error: err.message || String(err),
      });
      return { passed: 0, failed: 1, blocked: 0, notTested: 0 };
    }
  };

  // 1. Super Admin Control Plane
  await runSuiteSafely('Super Admin Control Plane', 'DATABASE_INTEGRATION', runSuperAdminTests);
  await sleep(1000);

  // 2. Tenant Data Isolation
  await runSuiteSafely('Tenant Data Isolation', 'DATABASE_INTEGRATION', runTenantIsolationTests);
  await sleep(1000);

  // 3. Plan Enforcement
  await runSuiteSafely('Server-Side Plan Enforcement', 'DATABASE_INTEGRATION', runPlanEnforcementTests);
  await sleep(1000);

  // 4. Impersonation
  await runSuiteSafely('Secure Owner Impersonation', 'DATABASE_INTEGRATION', runImpersonationTests);
  await sleep(1000);

  // 5. SaaS Multi-Tenant Audit
  await runSuiteSafely('SaaS Multi-Tenant Audit', 'DATABASE_INTEGRATION', runSaasMultiTenantAudit);
  await sleep(1000);

  // 6. Phase 1 Critical Fixes
  await runSuiteSafely('Phase 1 Critical Fixes (Payments, Gate, Docs)', 'CRYPTOGRAPHIC_SECURITY', async () => {
    const { runPhase1CriticalTests } = await import('./phase1-critical-fixes.test');
    return runPhase1CriticalTests();
  });
  await sleep(1000);

  // 7. Phase 2 Full Functionality & Isolation
  await runSuiteSafely('Phase 2 Full Functionality & Isolation', 'MOCK_FREE_API', async () => {
    const { runPhase2FunctionalityTests } = await import('./phase2-functionality.test');
    return runPhase2FunctionalityTests();
  });
  await sleep(1000);

  // 8. Razorpay Live Gateway & Cryptographic Signature Verification
  await runSuiteSafely('Razorpay Gateway & Cryptographic Verification', 'GATEWAY_LIVE_SERVICE', runRazorpayIntegrationTests);

  // Comprehensive Accounting
  let totalPassed = 0;
  let totalFailed = 0;
  let totalBlocked = 0;
  let totalNotTested = 0;

  console.log('\n=================================================================================');
  console.log('  URBAN NEST MASTER TEST SUITE EXECUTION REPORT                                  ');
  console.log('=================================================================================');
  console.log(
    'Suite Name'.padEnd(45) +
      'Type'.padEnd(25) +
      'PASS'.padEnd(8) +
      'FAIL'.padEnd(8) +
      'BLOCKED'.padEnd(10) +
      'NOT TESTED'
  );
  console.log('-'.repeat(105));

  for (const s of suiteSummaries) {
    totalPassed += s.passed;
    totalFailed += s.failed;
    totalBlocked += s.blocked;
    totalNotTested += s.notTested;

    console.log(
      s.name.padEnd(45) +
        s.type.padEnd(25) +
        String(s.passed).padEnd(8) +
        String(s.failed).padEnd(8) +
        String(s.blocked).padEnd(10) +
        String(s.notTested)
    );
    if (s.error) {
      console.log(`  └─ ERROR: ${s.error}`);
    }
  }

  console.log('='.repeat(105));
  console.log(`TOTAL PASSED:     ${totalPassed}`);
  console.log(`TOTAL FAILED:     ${totalFailed}`);
  console.log(`TOTAL BLOCKED:    ${totalBlocked}`);
  console.log(`TOTAL NOT TESTED: ${totalNotTested}`);
  console.log('=================================================================================\n');

  if (totalFailed > 0) {
    console.error(`💥 EXECUTION FAILED: ${totalFailed} test(s) or suite(s) failed.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL SUITES PASSED END-TO-END WITH ZERO REGRESSIONS.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
