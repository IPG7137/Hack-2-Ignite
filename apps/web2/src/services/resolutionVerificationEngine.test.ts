import { ResolutionVerificationEngine, ResolutionVerificationResult } from './resolutionVerificationEngine';
import { Complaint } from '../types/complaint';

function createMockComplaint(overrides: Partial<Complaint>): Complaint {
  return {
    id: overrides.id || 'comp-101',
    dbId: overrides.dbId || 101,
    title: overrides.title || 'Pothole on MG Road',
    description: overrides.description || 'Deep dangerous pothole near junction',
    category: overrides.category || 'roads',
    categoryLabel: overrides.categoryLabel || 'Roads & Pavements',
    status: overrides.status || 'resolution_submitted',
    priority: overrides.priority || 'high',
    location: {
      address: 'MG Road, Ward 2',
      landmark: 'Near City Square',
      ward: 'Ward 2',
      zone: 'North Zone',
      latitude: 18.5204,
      longitude: 73.8567,
      ...(overrides.location || {}),
    },
    reporter: {
      name: 'Priya Sharma',
      phone: '+91 98765 00000',
      aadharMasked: 'XXXX-XXXX-9999',
      verifiedCitizen: true,
      ...(overrides.reporter || {}),
    },
    statusHistory: overrides.statusHistory || [],
    adminNotes: overrides.adminNotes || [
      {
        id: 'note-1',
        author: 'Junior Engineer',
        text: 'Bitumen resurfacing completed and asphalt leveled.',
        createdAt: new Date().toISOString(),
        isInternal: false,
      },
    ],
    sla: {
      targetHours: 24,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      hoursRemaining: 24,
      isOverdue: false,
      slaStatus: 'on_track',
      ...(overrides.sla || {}),
    },
    evidence: {
      before: ['https://example.com/pothole_before.jpg'],
      after: ['https://example.com/pothole_after.jpg'],
      ...(overrides.evidence || {}),
    },
    upvotesCount: overrides.upvotesCount || 0,
    isDuplicateCluster: overrides.isDuplicateCluster || false,
    createdAt: overrides.createdAt || new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides,
  };
}

export function runResolutionVerificationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, message?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      failed++;
      const err = `❌ [FAIL] ${testName}: ${message || 'Assertion failed'}`;
      errors.push(err);
      console.error(`  ${err}`);
    }
  }

  console.log('🧪 Starting Phase 3E Resolution Verification Engine Tests...');

  // 1. Valid before + valid after + clear improvement => Strong Resolution Evidence (>= 80)
  {
    const comp = createMockComplaint({
      evidence: {
        before: ['https://example.com/before.jpg'],
        after: ['https://example.com/after.jpg'],
      },
      citizenFeedback: {
        rating: 5,
        comment: 'Great work! The pothole is completely repaired and leveled.',
        satisfied: true,
      },
    });

    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp, {
      isProblemResolvedVisual: true,
      aiConfidence: 0.95,
    });

    assert(result.verificationScore >= 80.0, '1a. Strong resolution evidence score >= 80', `Score was ${result.verificationScore}`);
    assert(result.classification === 'strongResolutionEvidence', '1b. Classified as strongResolutionEvidence');
    assert(result.hasBeforeEvidence && result.hasAfterEvidence, '1c. Recognizes both before and after evidence');
    assert(result.feedbackSentiment === 'positive', '1d. Evaluates positive citizen feedback sentiment');
  }

  // 2. Visual evidence indicates problem remains visible => Low score / Needs Review
  {
    const comp = createMockComplaint({
      evidence: {
        before: ['https://example.com/before.jpg'],
        after: ['https://example.com/after.jpg'],
      },
      citizenFeedback: {
        rating: 2,
        comment: 'Water is still leaking, nothing was fixed!',
        satisfied: false,
      },
    });

    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp, {
      isProblemResolvedVisual: false,
    });

    assert(result.verificationScore < 60.0, '2a. Unresolved visual evidence lowers score below 60', `Score was ${result.verificationScore}`);
    assert(result.needsHumanVerification === true, '2b. Flags needsHumanVerification = true');
    assert(result.improvementAssessment.includes('still be present') || result.improvementAssessment.includes('persist'), '2c. Assessment mentions issue may persist');
  }

  // 3. Missing before evidence => Partial evidence penalty
  {
    const comp = createMockComplaint({
      evidence: {
        before: [],
        after: ['https://example.com/after.jpg'],
      },
    });

    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp);
    assert(result.hasBeforeEvidence === false, '3a. Identifies missing before evidence');
    assert(result.hasAfterEvidence === true, '3b. Identifies present after evidence');
    assert(result.signalBreakdown.evidenceCompleteness === 55.0, '3c. Partial completeness score applied');
  }

  // 4. Missing after evidence => Substantial penalty & human verification flagged
  {
    const comp = createMockComplaint({
      evidence: {
        before: ['https://example.com/before.jpg'],
        after: [],
      },
    });

    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp);
    assert(result.hasAfterEvidence === false, '4a. Identifies missing after evidence');
    assert(result.needsHumanVerification === true, '4b. Missing after evidence mandates human verification');
    assert(result.verificationScore < 50.0, '4c. Score penalized due to missing after proof');
  }

  // 5. No visual evidence attached at all => Safe fallback
  {
    const comp = createMockComplaint({
      evidence: {
        before: [],
        after: [],
      },
    });

    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp);
    assert(!isNaN(result.verificationScore), '5a. Score is not NaN without images');
    assert(result.evidenceAvailability === 'No Visual Evidence', '5b. Identifies no visual evidence');
    assert(result.classification === 'insufficientEvidence', '5c. Classified as insufficientEvidence');
  }

  // 6. Positive citizen feedback (5 stars) strengthens confidence score
  {
    const baseComp = createMockComplaint({
      evidence: { before: ['b.jpg'], after: ['a.jpg'] },
    });
    const ratedComp = createMockComplaint({
      evidence: { before: ['b.jpg'], after: ['a.jpg'] },
      citizenFeedback: { rating: 5, comment: 'Thank you for the quick repair!', satisfied: true },
    });

    const rBase = ResolutionVerificationEngine.evaluateComplaintResolution(baseComp);
    const rRated = ResolutionVerificationEngine.evaluateComplaintResolution(ratedComp);

    assert(rRated.verificationScore >= rBase.verificationScore, '6. 5-star citizen rating increases score');
    assert(rRated.signalBreakdown.citizenFeedback === 100.0, '6b. Feedback score reaches 100');
  }

  // 7. Negative citizen feedback (1 star / complaints) reduces confidence & triggers review
  {
    const baseComp = createMockComplaint({
      evidence: { before: ['b.jpg'], after: ['a.jpg'] },
    });
    const dissatisfiedComp = createMockComplaint({
      evidence: { before: ['b.jpg'], after: ['a.jpg'] },
      citizenFeedback: { rating: 1, comment: 'Not fixed at all, still broken and leaking', satisfied: false },
    });

    const rBase = ResolutionVerificationEngine.evaluateComplaintResolution(baseComp);
    const rDissatisfied = ResolutionVerificationEngine.evaluateComplaintResolution(dissatisfiedComp);

    assert(rDissatisfied.verificationScore < rBase.verificationScore, '7a. Negative feedback applies penalty to score');
    assert(rDissatisfied.feedbackSentiment === 'negative', '7b. Feedback evaluated as negative sentiment');
    assert(rDissatisfied.needsHumanVerification === true, '7c. Dissatisfaction forces human review');
  }

  // 8. No citizen feedback assigns neutral baseline (50.0) without skew
  {
    const comp = createMockComplaint({
      evidence: { before: ['b.jpg'], after: ['a.jpg'] },
      citizenFeedback: undefined,
    });

    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp);
    assert(result.feedbackSentiment === 'none', '8a. Sentiment is none when feedback omitted');
    assert(result.signalBreakdown.citizenFeedback === 50.0, '8b. Feedback score is exactly 50 neutral baseline');
  }

  // 9. Sentiment keyword detection
  {
    assert(ResolutionVerificationEngine.evaluateFeedbackSentiment(null, 'Fixed and clean now') === 'positive', '9a. Positive keyword parsed');
    assert(ResolutionVerificationEngine.evaluateFeedbackSentiment(null, 'Not done, still broken') === 'negative', '9b. Negative keyword parsed');
    assert(ResolutionVerificationEngine.evaluateFeedbackSentiment(null, 'Work is okay') === 'neutral', '9c. Neutral phrase parsed');
    assert(ResolutionVerificationEngine.evaluateFeedbackSentiment(null, '') === 'none', '9d. Empty string gives none');
  }

  // 10. Score bounded 0 - 100 and no NaN/Infinity
  {
    const comp = createMockComplaint({});
    const result = ResolutionVerificationEngine.evaluateComplaintResolution(comp);
    assert(!isNaN(result.verificationScore) && isFinite(result.verificationScore), '10a. Score is finite');
    assert(result.verificationScore >= 0 && result.verificationScore <= 100, '10b. Score bounded between 0 and 100');
  }

  // 11. Conceptual separation: Decision support only, does not alter complaint status
  {
    const comp = createMockComplaint({ status: 'resolution_submitted' });
    ResolutionVerificationEngine.evaluateComplaintResolution(comp);
    assert(comp.status === 'resolution_submitted', '11. Engine does not modify raw complaint status');
  }

  console.log(`✅ Resolution Verification Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = runResolutionVerificationTests();
  if (result.failed > 0) process.exit(1);
}
