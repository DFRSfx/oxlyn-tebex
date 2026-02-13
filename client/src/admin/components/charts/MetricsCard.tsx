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
        // Convert seconds to readable format
        if (val < 60) return `${val}s`;
        if (val < 3600) return `${Math.floor(val / 60)}m ${val % 60}s`;
        return `${Math.floor(val / 3600)}h ${Math.floor((val % 3600) / 60)}m`;
      case 'currency':
        return `€${val.toFixed(2)}`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-400';
    return change > 0 ? 'text-green-500' : 'text-red-500';
  };

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-white/5 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/5 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-bold text-white">{formatValue(value)}</p>

        {change !== undefined && (
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
            {changeLabel && <span className="text-sm text-gray-500">{changeLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
