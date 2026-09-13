import { useState, useEffect } from 'react';
import { KPISummary, CategoryDistribution, TrendDataPoint, WardPerformance } from '../types/analytics';
import { analyticsService } from '../services/analyticsService';

export function useAnalytics() {
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [wards, setWards] = useState<WardPerformance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [kpiRes, catRes, trendRes, wardRes] = await Promise.all([
          analyticsService.getKPISummary(),
          analyticsService.getCategoryDistributions(),
          analyticsService.getTrendData(),
          analyticsService.getWardPerformances(),
        ]);
        setKpis(kpiRes);
        setCategories(catRes);
        setTrends(trendRes);
        setWards(wardRes);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return { kpis, categories, trends, wards, loading };
}
