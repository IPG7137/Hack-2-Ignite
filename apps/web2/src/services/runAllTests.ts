import { runSimilarityTests } from './similarityEngine.test';
import { runPriorityTests } from './priorityEngine.test';
import { runEmergingProblemTests } from './emergingProblemEngine.test';
import { runIncidentGroupingTests } from './incidentGroupingEngine.test';
import { runResolutionVerificationTests } from './resolutionVerificationEngine.test';
import { runAIInsightsTests } from './aiInsightsService.test';
import { runCopilotTests } from './copilotService.test';
import { runGroundingSecurityTests } from './groundingSecurity.test';
import { runAuthServiceTests } from './authService.test';
import { runProfileRoleTests } from './profileRole.test';
import { runRLSSecurityTests } from './rlsSecurity.test';

async function main() {
  console.log('===========================================================');
  console.log('🚀 CIVICRESOLVE TEST SUITE: INTELLIGENCE + SECURITY + RLS');
  console.log('===========================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Phase 3A: Similarity Engine
  const res3A = runSimilarityTests();
  totalPassed += res3A.passed;
  totalFailed += res3A.failed;
  allErrors.push(...res3A.errors);

  // Phase 3B: Priority Engine
  const res3B = runPriorityTests();
  totalPassed += res3B.passed;
  totalFailed += res3B.failed;
  allErrors.push(...res3B.errors);

  // Phase 3C: Emerging Problem Engine
  const res3C = runEmergingProblemTests();
  totalPassed += res3C.passed;
  totalFailed += res3C.failed;
  allErrors.push(...res3C.errors);

  // Phase 3D: Incident Grouping Engine
  const res3D = runIncidentGroupingTests();
  totalPassed += res3D.passed;
  totalFailed += res3D.failed;
  allErrors.push(...res3D.errors);

  // Phase 3E: Resolution Verification Engine
  const res3E = runResolutionVerificationTests();
  totalPassed += res3E.passed;
  totalFailed += res3E.failed;
  allErrors.push(...res3E.errors);

  // Phase 8A: AI Insights Service
  const res8A = runAIInsightsTests();
  totalPassed += res8A.passed;
  totalFailed += res8A.failed;
  allErrors.push(...res8A.errors);

  // Phase 8B: Municipal Copilot Service
  const res8B = await runCopilotTests();
  totalPassed += res8B.passed;
  totalFailed += res8B.failed;
  allErrors.push(...res8B.errors);

  // Phase 8C: Grounding & Security Guard
  const res8C = await runGroundingSecurityTests();
  totalPassed += res8C.passed;
  totalFailed += res8C.failed;
  allErrors.push(...res8C.errors);

  // Phase 9B: Supabase Auth & Session Infrastructure
  const res9B = await runAuthServiceTests();
  totalPassed += res9B.passed;
  totalFailed += res9B.failed;
  allErrors.push(...res9B.errors);

  // Phase 9C: Profiles & User Roles Schema Infrastructure
  const res9C = await runProfileRoleTests();
  totalPassed += res9C.passed;
  totalFailed += res9C.failed;
  allErrors.push(...res9C.errors);

  // Phase 9D: Secure PostgreSQL RLS & Authorization
  const res9D = await runRLSSecurityTests();
  totalPassed += res9D.passed;
  totalFailed += res9D.failed;
  allErrors.push(...res9D.errors);

  console.log('\n===========================================================');
  console.log('📊 FINAL VERIFICATION SCORECARD:');
  console.log(`   3A Similarity:             ${res3A.passed}/${res3A.passed + res3A.failed}`);
  console.log(`   3B Smart Priority:         ${res3B.passed}/${res3B.passed + res3B.failed}`);
  console.log(`   3C Emerging Hotspots:      ${res3C.passed}/${res3C.passed + res3C.failed}`);
  console.log(`   3D Common Incidents:       ${res3D.passed}/${res3D.passed + res3D.failed}`);
  console.log(`   3E Resolution Verification:${res3E.passed}/${res3E.passed + res3E.failed}`);
  console.log(`   8A AI Insights:            ${res8A.passed}/${res8A.passed + res8A.failed}`);
  console.log(`   8B Municipal Copilot:      ${res8B.passed}/${res8B.passed + res8B.failed}`);
  console.log(`   8C Grounding & Security:   ${res8C.passed}/${res8C.passed + res8C.failed}`);
  console.log(`   9B Supabase Auth:          ${res9B.passed}/${res9B.passed + res9B.failed}`);
  console.log(`   9C Profiles & Roles:       ${res9C.passed}/${res9C.passed + res9C.failed}`);
  console.log(`   9D Secure RLS:             ${res9D.passed}/${res9D.passed + res9D.failed}`);
  console.log('-----------------------------------------------------------');
  console.log(`   TOTAL:                     ${totalPassed} PASSED / ${totalFailed} FAILED`);
  console.log('===========================================================');

  if (totalFailed > 0) {
    console.error('❌ Test suite encountered failures:');
    allErrors.forEach((e) => console.error('  ' + e));
    process.exit(1);
  } else {
    console.log('✨ ALL TESTS PASSED CLEANLY! ✨\n');
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
