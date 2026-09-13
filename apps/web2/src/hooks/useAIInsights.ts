import { useState, useEffect } from 'react';
import { AIOperationalInsight } from '../types/ai';
import { aiService } from '../services/aiService';

export function useAIInsights() {
  const [insights, setInsights] = useState<AIOperationalInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await aiService.getOperationalInsights();
        setInsights(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const acknowledge = async (id: string) => {
    await aiService.acknowledgeInsight(id);
    setInsights((prev) =>
      prev.map((item) => (item.id === id ? { ...item, acknowledged: true } : item))
    );
  };

  return {
    insights,
    loading,
    acknowledge,
  };
}
