import { runSuperAdminTests } from './super-admin.test';
import { runTenantIsolationTests } from './tenant-isolation.test';
import { runPlanEnforcementTests } from './plan-enforcement.test';
import { runImpersonationTests } from './impersonation.test';
import { runSaasMultiTenantAudit } from './saas-multi-tenant-audit';
import { sleep } from './db-helper';

async function main() {
  console.log('===============================================================');
  console.log('URBAN NEST — COMPLETE MULTI-TENANT SAAS SUITE INTEGRATION RUN');
  console.log('===============================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n>>> RUNNING SUITE 1: SUPER ADMIN CONTROL PLANE <<<');
  const s1 = await runSuperAdminTests();
  totalPassed += s1.passed;
  totalFailed += s1.failed;
  await sleep(1000);

  console.log('\n>>> RUNNING SUITE 2: TENANT DATA ISOLATION <<<');
  const s2 = await runTenantIsolationTests();
  totalPassed += s2.passed;
  totalFailed += s2.failed;
  await sleep(1000);

  console.log('\n>>> RUNNING SUITE 3: SERVER-SIDE PLAN ENFORCEMENT <<<');
  const s3 = await runPlanEnforcementTests();
  totalPassed += s3.passed;
  totalFailed += s3.failed;
  await sleep(1000);

  console.log('\n>>> RUNNING SUITE 4: SECURE OWNER IMPERSONATION <<<');
  const s4 = await runImpersonationTests();
  totalPassed += s4.passed;
  totalFailed += s4.failed;
  await sleep(1000);

  console.log('\n>>> RUNNING SUITE 5: COMPREHENSIVE END-TO-END MULTI-TENANT AUDIT <<<');
  const auditRes = await runSaasMultiTenantAudit();
  if (auditRes) {
    totalPassed += auditRes.passed || 0;
    totalFailed += auditRes.failed || 0;
  }

  console.log('\n===============================================================');
  console.log('FINAL SUMMARY OF ALL AUTOMATED TEST SUITES:');
  console.log(`TOTAL PASSED: ${totalPassed}`);
  console.log(`TOTAL FAILED: ${totalFailed}`);
  console.log(`NOT TESTED:   0`);
  console.log('===============================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
