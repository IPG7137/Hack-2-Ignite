import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, BarChart2, ArrowUpRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Complaint } from '../../types/complaint';

const CATEGORY_NAMES: Record<string, string> = {
  roads: 'Roads & Infrastructure',
  waste_management: 'Solid Waste',
  water_sewage: 'Water Supply',
  streetlights: 'Street Lighting',
  drainage: 'Drainage',
  public_safety: 'Public Safety',
  parks: 'Parks & Spaces',
};

interface IssueTrendsChartProps {
  complaints: Complaint[];
  onViewAnalytics?: () => void;
}

export const IssueTrendsChart: React.FC<IssueTrendsChartProps> = ({ complaints, onViewAnalytics }) => {
  const chartData = useMemo(() => {
    const categoryCounts: Record<string, { total: number; resolved: number; active: number }> = {};

    complaints.forEach((c) => {
      const label = CATEGORY_NAMES[c.category] || c.categoryLabel || c.category;
      if (!categoryCounts[label]) {
        categoryCounts[label] = { total: 0, resolved: 0, active: 0 };
      }
      categoryCounts[label].total += 1;
      if (c.status === 'closed' || c.status === 'verified' || c.status === 'resolution_submitted') {
        categoryCounts[label].resolved += 1;
      } else {
        categoryCounts[label].active += 1;
      }
    });

    return Object.entries(categoryCounts)
      .map(([name, data]) => ({
        name: name.replace(' & Infrastructure', '').replace(' & Sewage', ''),
        fullName: name,
        active: data.active,
        resolved: data.resolved,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [complaints]);

  return (
    <Card className="flex flex-col h-full border-slate-200 bg-white shadow-2xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 text-[#1769D2] flex items-center justify-center">
            <BarChart2 className="w-3.5 h-3.5 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Issue Trends & Volume by Category
            </h3>
            <p className="text-[10px] text-slate-500">Active vs Resolved intake across primary civic domains</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="hidden sm:flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1769D2]" /> Active
          </span>
          <span className="hidden sm:flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" /> Resolved
          </span>
          {onViewAnalytics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAnalytics}
              className="h-6 text-[11px] text-[#1769D2] hover:text-[#123B6D] hover:bg-blue-50 font-bold gap-1 px-1.5"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 min-h-[220px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No grievance records available to plot trends.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748B' }}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-lg border border-slate-700">
                        <div className="font-bold">{data.fullName}</div>
                        <div className="text-blue-300 mt-1">Active: {data.active}</div>
                        <div className="text-emerald-300">Resolved: {data.resolved}</div>
                        <div className="text-slate-400 font-mono mt-0.5 border-t border-slate-700 pt-0.5">
                          Total: {data.total}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="active" stackId="a" fill="#1769D2" radius={[0, 0, 0, 0]} />
              <Bar dataKey="resolved" stackId="a" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
