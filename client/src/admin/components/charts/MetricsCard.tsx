import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
  loading?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'number',
  loading = false,
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'duration':
        if (val < 60) return `${val}s`;
        if (val < 3600) return `${Math.floor(val / 60)}m ${val % 60}s`;
        return `${Math.floor(val / 3600)}h ${Math.floor((val % 3600) / 60)}m`;
      case 'currency':
        return `€${val.toFixed(2)}`;
      default:
        return val.toLocaleString();
    }
  };

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === undefined || change === 0;

  if (loading) {
    return (
      <div className="relative bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative animate-pulse space-y-4">
          <div className="flex items-start justify-between">
            <div className="h-3 bg-white/5 rounded w-1/2"></div>
            <div className="h-9 w-9 bg-white/5 rounded-lg"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-white/5 rounded w-3/4"></div>
            <div className="h-3 bg-white/5 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 hover:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/5 overflow-hidden">
      {/* Decorative gradient orb that fades in on hover */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/[0.06] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Subtle top-left gradient sheen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header: title + icon */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</h3>
          {icon && (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-500/[0.08] border border-amber-500/10 flex items-center justify-center text-amber-400 transition-transform duration-300 group-hover:scale-110">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 break-all">
          {formatValue(value)}
        </p>

        {/* Trend pill */}
        {change !== undefined && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  : isNegative
                  ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                  : 'bg-white/[0.03] text-gray-400 ring-white/10'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
              ) : isNegative ? (
                <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
              ) : (
                <Minus className="w-3 h-3" strokeWidth={2.5} />
              )}
              <span>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
            </div>
            {changeLabel && (
              <span className="text-xs text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};