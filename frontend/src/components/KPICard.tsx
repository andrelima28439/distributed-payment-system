'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KPICardProps } from '@/types';

export default function KPICard({ title, value, subtitle, trend, trendValue, icon, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-800 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-800 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="card hover:border-gray-700 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-gray-800 text-gray-400">
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-100 mb-1">
        {value}
      </div>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-success-400' : trend === 'down' ? 'text-danger-400' : 'text-gray-400'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {trendValue}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-gray-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
