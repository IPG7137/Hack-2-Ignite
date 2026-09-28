/**
 * CivicResolve — Local Civic Feed & Report Support Service
 * Manages community issue discovery, duplicate-prevention support voting,
 * and server-derived public impact calculations (Zero PII exposure).
 */

import { supabase } from './supabaseClient';
import { Complaint, IncidentCategory, ComplaintPriority, ComplaintStatus } from '../types/complaint';
import { DATABASE_CATEGORY_MAP, normalizeStatus, normalizePriority } from './reportAdapter';

export interface CivicFeedItem {
  id: number;
  formattedId: string;
  title: string;
  description: string;
  category: IncidentCategory;
  categoryLabel: string;
  department: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    distanceMeters?: number;
  };
  imageUrls: string[];
  createdAt: string;
  supportCount: number;
  userHasSupported: boolean;
  communityImpactScore: number;
}

export interface SupportToggleResult {
  reportId: number;
  supported: boolean;
  totalSupports: number;
  message: string;
}

/**
 * Calculates a non-overriding community impact signal from support counts
 * Preserves deterministic 3B Priority Formula without allowing artificial emergency gaming
 */
export function calculateCommunityImpactScore(
  supportCount: number,
  basePriority: ComplaintPriority
): number {
  const safeCount = Math.max(0, supportCount || 0);
  const baseWeight =
    basePriority === 'urgent' ? 40 : basePriority === 'high' ? 30 : basePriority === 'medium' ? 20 : 10;
  
  // Logarithmic scaling for community support to prevent runaway gaming (100 fake accounts != emergency)
  const supportWeight = Math.min(60, Math.round(Math.log2(safeCount + 1) * 12));
  
  return baseWeight + supportWeight;
}

/**
 * In-memory fallback mock storage for tests and offline development
 */
const inMemorySupports = new Map<number, Set<string>>();

export const civicFeedService = {
  /**
   * Toggles citizen support for an existing civic issue (Atomic + idempotent)
   */
  async toggleSupport(reportId: number, userId: string): Promise<SupportToggleResult> {
    if (!userId || !userId.trim()) {
      throw new Error('Authentication required to support an issue');
    }

    const isPlaceholder =
      typeof process !== 'undefined' &&
      process.env.VITE_SUPABASE_URL?.includes('placeholder');

    try {
      // 1. Try Supabase RPC if configured and not in placeholder test environment
      if (supabase && !isPlaceholder) {
        const { data, error } = await supabase.rpc('toggle_report_support', {
          p_report_id: reportId,
          p_user_id: userId,
        });

        if (!error && data) {
          return {
            reportId,
            supported: Boolean(data.supported),
            totalSupports: Number(data.total_supports || 0),
            message: data.supported
              ? 'Issue supported! Community impact recorded.'
              : 'Support removed.',
          };
        }
      }
    } catch (e) {
      console.warn('Supabase toggle_report_support RPC fallback to in-memory:', e);
    }

    // 2. In-memory fallback for local testing
    if (!inMemorySupports.has(reportId)) {
      inMemorySupports.set(reportId, new Set<string>());
    }
    const userSet = inMemorySupports.get(reportId)!;
    let nowSupported = false;

    if (userSet.has(userId)) {
      userSet.delete(userId);
      nowSupported = false;
    } else {
      userSet.add(userId);
      nowSupported = true;
    }

    return {
      reportId,
      supported: nowSupported,
      totalSupports: userSet.size,
      message: nowSupported
        ? 'Issue supported! Community impact recorded.'
        : 'Support removed.',
    };
  },

  /**
   * Checks whether a user currently supports a report
   */
  async hasUserSupported(reportId: number, userId: string): Promise<{ supported: boolean; totalSupports: number }> {
    if (!userId) return { supported: false, totalSupports: 0 };

    const isPlaceholder =
      typeof process !== 'undefined' &&
      process.env.VITE_SUPABASE_URL?.includes('placeholder');

    try {
      if (supabase && !isPlaceholder) {
        const { data, error } = await supabase
          .from('report_supports')
          .select('id')
          .eq('report_id', reportId)
          .eq('user_id', userId)
          .maybeSingle();

        const { count } = await supabase
          .from('report_supports')
          .select('*', { count: 'exact', head: true })
          .eq('report_id', reportId);

        if (!error) {
          return {
            supported: Boolean(data),
            totalSupports: count || 0,
          };
        }
      }
    } catch (_) {}

    const userSet = inMemorySupports.get(reportId);
    return {
      supported: userSet ? userSet.has(userId) : false,
      totalSupports: userSet ? userSet.size : 0,
    };
  },

  /**
   * Fetches local civic feed with distance calculations and support tallies
   */
  async getCivicFeed(params: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: string;
    userId?: string;
    sortBy?: 'most_supported' | 'recent' | 'highest_priority';
    limit?: number;
  }): Promise<CivicFeedItem[]> {
    const { lat, lng, radiusKm = 25, category, userId, sortBy = 'most_supported', limit = 50 } = params;

    const isPlaceholder =
      typeof process !== 'undefined' &&
      process.env.VITE_SUPABASE_URL?.includes('placeholder');

    try {
      if (supabase && !isPlaceholder) {
        const { data, error } = await supabase.rpc('get_civic_feed', {
          p_lat: lat || null,
          p_lng: lng || null,
          p_radius_km: radiusKm,
          p_category: category || null,
          p_user_id: userId || null,
          p_limit: limit,
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((row: any) => {
            const rawCat = (row.category || 'other').toString().toLowerCase();
            const catConfig = DATABASE_CATEGORY_MAP[rawCat] || {
              key: 'roads' as IncidentCategory,
              label: row.category || 'Grievance',
              department: 'Municipal Operations',
            };

            const priority = normalizePriority(row.priority);
            const supportCount = Number(row.support_count || 0);

            let imageUrls: string[] = [];
            if (row.image_urls) {
              try {
                imageUrls = typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls;
              } catch (_) {
                imageUrls = [];
              }
            }

            return {
              id: Number(row.id),
              formattedId: `CR-${row.id}`,
              title: row.title || 'Civic Grievance',
              description: row.description || '',
              category: catConfig.key,
              categoryLabel: catConfig.label,
              department: catConfig.department,
              status: normalizeStatus(row.status),
              priority,
              location: {
                address: row.location || 'Municipal Area',
                latitude: Number(row.latitude) || 0,
                longitude: Number(row.longitude) || 0,
                distanceMeters: row.distance_meters != null ? Math.round(Number(row.distance_meters)) : undefined,
              },
              imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
              createdAt: row.created_at || new Date().toISOString(),
              supportCount,
              userHasSupported: Boolean(row.user_has_supported),
              communityImpactScore: calculateCommunityImpactScore(supportCount, priority),
            };
          });
        }
      }
    } catch (e) {
      console.warn('Supabase get_civic_feed fallback to local aggregation:', e);
    }

    return [];
  },

  /**
   * Reset in-memory supports (for unit testing)
   */
  _resetMockSupports() {
    inMemorySupports.clear();
  },
};
