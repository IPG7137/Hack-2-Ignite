import { useState, useEffect } from 'react';
import { KPISummary, CategoryDistribution, TrendDataPoint, WardPerformance } from '../types/analytics';
import { analyticsService } from '../services/analyticsService';
import { Complaint } from '../types/complaint';

export function useAnalytics(preloadedComplaints?: Complaint[]) {
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [wards, setWards] = useState<WardPerformance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await analyticsService.getAllAnalytics(preloadedComplaints);
        if (isMounted) {
          setKpis(data.kpis);
          setCategories(data.categories);
          setTrends(data.trends);
          setWards(data.wards);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();

    return () => {
      isMounted = false;
    };
  }, [preloadedComplaints]);

  return { kpis, categories, trends, wards, loading };
}
