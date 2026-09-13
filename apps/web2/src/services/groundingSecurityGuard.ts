import { Complaint, IncidentCategory } from '../types/complaint';

export interface SanitizedQuery {
  rawQuery: string;
  cleanedQuery: string;
  isSafe: boolean;
  securityViolation?: string;
}

export class GroundingSecurityGuard {
  private static readonly maxQueryLength = 1000;

  // Patterns indicating malicious prompt injection / jailbreak attempts
  private static readonly injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|system|safety)\s+(rules|prompts|directives)/i,
    /you\s+are\s+now\s+(unrestricted|unfiltered|dan|root|jailbroken|godmode)/i,
    /system\s+prompt\s+(override|reveal|leak)/i,
    /reveal\s+(all\s+)?(api\s+keys?|passwords?|secrets?|tokens?|env|credentials)/i,
    /drop\s+table/i,
    /delete\s+from\s+complaints/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
  ];

  // Regex patterns for citizen PII detection
  private static readonly aadharRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  private static readonly phoneRegex = /\b(?:\+91[\s-]?)?[6789]\d{9}\b/g;
  private static readonly emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  /**
   * Sanitizes and inspects an officer query before AI/engine processing.
   */
  public static inspectAndSanitizeQuery(query: string): SanitizedQuery {
    if (!query) {
      return {
        rawQuery: '',
        cleanedQuery: '',
        isSafe: true,
      };
    }

    // 1. Length constraint
    let text = query.slice(0, this.maxQueryLength).trim();

    // 2. Control character removal (preserving regular whitespace and printable ASCII/Unicode)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 3. Prompt injection detection
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(text)) {
        return {
          rawQuery: query,
          cleanedQuery: text,
          isSafe: false,
          securityViolation: 'Prompt injection or unauthorized system override pattern detected.',
        };
      }
    }

    // 4. HTML tag stripping
    const sanitized = text.replace(/<[^>]*>?/gm, '');

    return {
      rawQuery: query,
      cleanedQuery: sanitized,
      isSafe: true,
    };
  }

  /**
   * Masks any citizen Personally Identifiable Information (PII) before surfacing in Copilot responses.
   */
  public static maskPII(text: string): string {
    if (!text) return '';

    let masked = text;

    // Mask Aadhar numbers: XXXX-XXXX-1234
    masked = masked.replace(this.aadharRegex, (match) => {
      const digits = match.replace(/[-\s]/g, '');
      const last4 = digits.slice(-4);
      return `XXXX-XXXX-${last4}`;
    });

    // Mask Indian phone numbers: +91 98*** ****0
    masked = masked.replace(this.phoneRegex, (match) => {
      const digits = match.replace(/\D/g, '');
      const lastDigits = digits.slice(-10);
      return `+91 ${lastDigits.slice(0, 2)}*** ***${lastDigits.slice(-1)}`;
    });

    // Mask Emails: u***@domain.com
    masked = masked.replace(this.emailRegex, (match) => {
      const [user, domain] = match.split('@');
      if (user.length <= 2) return `***@${domain}`;
      return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
    });

    return masked;
  }

  /**
   * Validates a complaint object to ensure corrupt / missing fields do not crash deterministic engines.
   */
  public static sanitizeComplaintForTelemetry(c: Partial<Complaint>): Complaint {
    const safeId = c.id && typeof c.id === 'string' && c.id.trim() ? c.id.trim() : `comp-${c.dbId || 'unknown'}`;
    const safeDbId = typeof c.dbId === 'number' && !isNaN(c.dbId) ? c.dbId : 0;

    const safeLat = typeof c.location?.latitude === 'number' && isFinite(c.location.latitude) ? c.location.latitude : 0;
    const safeLng = typeof c.location?.longitude === 'number' && isFinite(c.location.longitude) ? c.location.longitude : 0;

    const validCategories: IncidentCategory[] = [
      'roads',
      'drainage',
      'waste_management',
      'streetlights',
      'water_sewage',
      'public_safety',
      'parks',
    ];

    const safeCategory: IncidentCategory =
      c.category && validCategories.includes(c.category as IncidentCategory)
        ? (c.category as IncidentCategory)
        : 'roads';

    return {
      id: safeId,
      dbId: safeDbId,
      title: c.title?.trim() || 'Untitled Municipal Grievance',
      description: c.description?.trim() || 'No detailed issue description provided.',
      category: safeCategory,
      categoryLabel: c.categoryLabel?.trim() || 'General Maintenance',
      status: c.status || 'submitted',
      priority: c.priority || 'medium',
      location: {
        address: c.location?.address?.trim() || 'Location Not Recorded',
        landmark: c.location?.landmark?.trim() || '',
        ward: c.location?.ward?.trim() || 'Unassigned Ward',
        zone: c.location?.zone?.trim() || 'General Zone',
        latitude: safeLat,
        longitude: safeLng,
      },
      reporter: {
        name: c.reporter?.name?.trim() || 'Citizen Reporter',
        phone: c.reporter?.phone ? this.maskPII(c.reporter.phone) : '+91 98*** ****0',
        aadharMasked: c.reporter?.aadharMasked || 'XXXX-XXXX-0000',
        verifiedCitizen: Boolean(c.reporter?.verifiedCitizen),
      },
      statusHistory: Array.isArray(c.statusHistory) ? c.statusHistory : [],
      adminNotes: Array.isArray(c.adminNotes) ? c.adminNotes : [],
      sla: {
        targetHours: c.sla?.targetHours || 24,
        deadline: c.sla?.deadline || new Date(Date.now() + 86400000).toISOString(),
        hoursRemaining: typeof c.sla?.hoursRemaining === 'number' ? c.sla.hoursRemaining : 24,
        isOverdue: Boolean(c.sla?.isOverdue),
        slaStatus: c.sla?.slaStatus || 'on_track',
      },
      evidence: {
        before: Array.isArray(c.evidence?.before) ? c.evidence.before : [],
        after: Array.isArray(c.evidence?.after) ? c.evidence.after : [],
      },
      citizenFeedback:
        c.citizenFeedback && typeof c.citizenFeedback.rating === 'number'
          ? {
              rating: Math.max(1, Math.min(5, c.citizenFeedback.rating)),
              comment: c.citizenFeedback.comment ? this.maskPII(c.citizenFeedback.comment) : '',
              satisfied: Boolean(c.citizenFeedback.satisfied),
            }
          : undefined,
      upvotesCount: typeof c.upvotesCount === 'number' ? c.upvotesCount : 0,
      isDuplicateCluster: Boolean(c.isDuplicateCluster),
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
    };
  }
}
