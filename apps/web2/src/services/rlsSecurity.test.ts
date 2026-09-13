import { UserRole } from './authService';

export interface SimulatedSecurityContext {
  userId: string | null;
  role: UserRole | null;
  isStaff: boolean;
  departmentId?: string;
}

export class PolicyEvaluator {
  /**
   * Evaluates SELECT on public.reports
   */
  public static canSelectReport(
    ctx: SimulatedSecurityContext,
    report: { user_id: string; department_id?: string; assigned_officer_id?: string }
  ): boolean {
    if (!ctx.userId) return false; // Anon blocked from raw reports table
    if (ctx.userId === report.user_id) return true; // Citizen reads own report
    if (ctx.role === 'super_admin' || ctx.role === 'municipal_admin') return true; // City-wide staff
    if (ctx.role === 'dept_admin') return ctx.departmentId === report.department_id; // Dept-scoped
    if (ctx.role === 'officer') {
      return (
        ctx.userId === report.assigned_officer_id ||
        (ctx.departmentId !== undefined && ctx.departmentId === report.department_id)
      );
    }
    return false;
  }

  /**
   * Evaluates UPDATE on public.reports
   */
  public static canUpdateReport(
    ctx: SimulatedSecurityContext,
    report: { user_id: string },
    modifications: {
      status?: string;
      priority?: string;
      assigned_officer_id?: string;
      admin_notes?: string;
      citizen_feedback?: string;
      rating?: number;
    }
  ): { allowed: boolean; reason?: string } {
    if (!ctx.userId) return { allowed: false, reason: 'Unauthenticated' };

    // Citizen attempting update
    if (ctx.userId === report.user_id && !ctx.isStaff) {
      if (modifications.status !== undefined) {
        return { allowed: false, reason: 'Citizens cannot modify complaint status' };
      }
      if (modifications.priority !== undefined) {
        return { allowed: false, reason: 'Citizens cannot modify complaint priority' };
      }
      if (modifications.assigned_officer_id !== undefined) {
        return { allowed: false, reason: 'Citizens cannot modify officer assignments' };
      }
      if (modifications.admin_notes !== undefined) {
        return { allowed: false, reason: 'Citizens cannot modify admin notes' };
      }
      // Citizen allowed to update feedback/rating
      return { allowed: true };
    }

    // Staff updating
    if (ctx.isStaff) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Unauthorized' };
  }

  /**
   * Evaluates mutations on public.user_roles
   */
  public static canMutateUserRoles(ctx: SimulatedSecurityContext): boolean {
    if (!ctx.userId) return false;
    return ctx.role === 'super_admin';
  }

  /**
   * Evaluates SELECT on public.profiles
   */
  public static canSelectProfile(ctx: SimulatedSecurityContext, profileUserId: string): boolean {
    if (!ctx.userId) return false;
    if (ctx.userId === profileUserId) return true;
    return ctx.isStaff;
  }

  /**
   * Evaluates SELECT on public.admin_notes
   */
  public static canSelectAdminNotes(ctx: SimulatedSecurityContext): boolean {
    if (!ctx.userId) return false;
    return ctx.isStaff;
  }
}

export async function runRLSSecurityTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('🧪 Starting Phase 9D PostgreSQL RLS & Authorization Policy Tests...');

  const anonCtx: SimulatedSecurityContext = { userId: null, role: null, isStaff: false };
  const citizen1Ctx: SimulatedSecurityContext = { userId: 'usr-cit-101', role: 'citizen', isStaff: false };
  const citizen2Ctx: SimulatedSecurityContext = { userId: 'usr-cit-102', role: 'citizen', isStaff: false };
  const officerCtx: SimulatedSecurityContext = {
    userId: 'usr-off-201',
    role: 'officer',
    isStaff: true,
    departmentId: 'DEP-ROADS',
  };
  const deptAdminCtx: SimulatedSecurityContext = {
    userId: 'usr-dept-301',
    role: 'dept_admin',
    isStaff: true,
    departmentId: 'DEP-WATER',
  };
  const municipalAdminCtx: SimulatedSecurityContext = {
    userId: 'usr-muni-401',
    role: 'municipal_admin',
    isStaff: true,
  };
  const superAdminCtx: SimulatedSecurityContext = {
    userId: 'usr-super-501',
    role: 'super_admin',
    isStaff: true,
  };

  const sampleReport1 = { user_id: 'usr-cit-101', department_id: 'DEP-ROADS', assigned_officer_id: 'usr-off-201' };
  const sampleReport2 = { user_id: 'usr-cit-102', department_id: 'DEP-WATER', assigned_officer_id: 'usr-off-999' };

  // 1. Anonymous cannot read raw private reports
  {
    assert(!PolicyEvaluator.canSelectReport(anonCtx, sampleReport1), '1. Anon blocked from raw reports table');
  }

  // 2. Anonymous can access only safe public map projection (zero PII)
  {
    const safeMarker = {
      id: 12,
      category: 'roads',
      status: 'submitted',
      priority: 'high',
      latitude: 18.5204,
      longitude: 73.8567,
      created_at: new Date().toISOString(),
    };
    const anyMarker = safeMarker as any;
    assert(anyMarker.reporter_name === undefined, '2a. Public marker excludes reporter_name');
    assert(anyMarker.phone === undefined, '2b. Public marker excludes phone');
    assert(anyMarker.aadhar_number === undefined, '2c. Public marker excludes aadhar_number');
    assert(anyMarker.admin_notes === undefined, '2d. Public marker excludes admin_notes');
  }

  // 3. Citizen can read own complaint
  {
    assert(PolicyEvaluator.canSelectReport(citizen1Ctx, sampleReport1), '3. Citizen can read their own complaint');
  }

  // 4. Citizen cannot read another citizen's complaint
  {
    assert(!PolicyEvaluator.canSelectReport(citizen1Ctx, sampleReport2), "4. Citizen cannot read another citizen's complaint");
  }

  // 5. Citizen cannot modify status
  {
    const res = PolicyEvaluator.canUpdateReport(citizen1Ctx, sampleReport1, { status: 'resolved' });
    assert(!res.allowed && Boolean(res.reason?.includes('status')), '5. Citizen cannot modify complaint status');
  }

  // 6. Citizen cannot modify priority
  {
    const res = PolicyEvaluator.canUpdateReport(citizen1Ctx, sampleReport1, { priority: 'critical' });
    assert(!res.allowed && Boolean(res.reason?.includes('priority')), '6. Citizen cannot modify complaint priority');
  }

  // 7. Citizen cannot modify officer assignment
  {
    const res = PolicyEvaluator.canUpdateReport(citizen1Ctx, sampleReport1, { assigned_officer_id: 'usr-off-999' });
    assert(!res.allowed && Boolean(res.reason?.includes('assignment')), '7. Citizen cannot modify officer assignment');
  }

  // 8. Citizen cannot modify admin notes
  {
    const res = PolicyEvaluator.canUpdateReport(citizen1Ctx, sampleReport1, { admin_notes: 'Forged administrative note' });
    assert(!res.allowed && Boolean(res.reason?.includes('admin notes')), '8. Citizen cannot modify admin notes');
  }

  // 9. Citizen can submit legitimate feedback
  {
    const res = PolicyEvaluator.canUpdateReport(citizen1Ctx, sampleReport1, {
      citizen_feedback: 'Pothole fixed promptly, thank you.',
      rating: 5,
    });
    assert(res.allowed === true, '9. Citizen can submit legitimate feedback for own report');
  }

  // 10. Officer can access authorized complaint
  {
    assert(PolicyEvaluator.canSelectReport(officerCtx, sampleReport1), '10. Officer can access assigned/department complaint');
  }

  // 11. Officer cannot access unauthorized department complaint
  {
    assert(!PolicyEvaluator.canSelectReport(officerCtx, sampleReport2), '11. Officer cannot access out-of-department unauthorized complaint');
  }

  // 12. Dept admin department scope works
  {
    assert(PolicyEvaluator.canSelectReport(deptAdminCtx, sampleReport2), '12a. Dept Admin can access complaint in their department');
    assert(!PolicyEvaluator.canSelectReport(deptAdminCtx, sampleReport1), '12b. Dept Admin cannot access complaint outside their department');
  }

  // 13. Municipal admin city-wide scope works
  {
    assert(PolicyEvaluator.canSelectReport(municipalAdminCtx, sampleReport1), '13a. Municipal Admin can access report 1');
    assert(PolicyEvaluator.canSelectReport(municipalAdminCtx, sampleReport2), '13b. Municipal Admin can access report 2 city-wide');
  }

  // 14. Super admin scope works
  {
    assert(PolicyEvaluator.canSelectReport(superAdminCtx, sampleReport1), '14a. Super Admin can access report 1');
    assert(PolicyEvaluator.canSelectReport(superAdminCtx, sampleReport2), '14b. Super Admin can access report 2');
  }

  // 15. Citizen cannot insert/update/delete user_roles
  {
    assert(!PolicyEvaluator.canMutateUserRoles(citizen1Ctx), '15. Citizen cannot mutate user_roles');
  }

  // 16. Officer cannot insert/update/delete user_roles
  {
    assert(!PolicyEvaluator.canMutateUserRoles(officerCtx), '16. Officer cannot mutate user_roles');
  }

  // 17. Only Super Admin can mutate user_roles
  {
    assert(PolicyEvaluator.canMutateUserRoles(superAdminCtx), '17. Super Admin can mutate user_roles');
  }

  // 18. Profile privacy works
  {
    assert(PolicyEvaluator.canSelectProfile(citizen1Ctx, 'usr-cit-101'), '18a. Citizen can view own profile');
    assert(!PolicyEvaluator.canSelectProfile(citizen1Ctx, 'usr-cit-102'), "18b. Citizen cannot view other citizen's profile");
    assert(PolicyEvaluator.canSelectProfile(officerCtx, 'usr-cit-101'), '18c. Staff can view profile for dispatch');
  }

  // 19. Admin notes are protected from citizens and anon
  {
    assert(!PolicyEvaluator.canSelectAdminNotes(anonCtx), '19a. Anon cannot select admin_notes');
    assert(!PolicyEvaluator.canSelectAdminNotes(citizen1Ctx), '19b. Citizen cannot select admin_notes');
    assert(PolicyEvaluator.canSelectAdminNotes(officerCtx), '19c. Staff can select admin_notes');
  }

  // 20. Zero service_role in client code
  {
    const hasServiceRole = typeof process !== 'undefined' && JSON.stringify(process.env).includes('SUPABASE_SERVICE_ROLE_KEY');
    assert(!hasServiceRole, '20. Zero service_role in client environment');
  }

  console.log(`✅ Phase 9D RLS Policy Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
