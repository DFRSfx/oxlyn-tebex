import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

export type MetricHealth = 'good' | 'warning' | 'bad';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
  loading?: boolean;
  /** Plain-language explanation shown on hover over the info icon. */
  tooltip?: string;
  /** Optional health indicator. When set, shows a coloured dot + label. */
  health?: MetricHealth;
  /** Custom label for the health pill. Falls back to a sensible default. */
  healthLabel?: string;
  /**
   * If a higher change is "worse" (e.g. bounce rate going up), set this so the
   * trend pill renders red on positive %, green on negative %.
   */
  invertTrend?: boolean;
}

const HEALTH_CONFIG: Record<MetricHealth, { dot: string; ring: string; bg: string; text: string; label: string }> = {
  good: {
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-500/20',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Bom',
  },
  warning: {
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/20',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'Atenção',
  },
  bad: {
    dot: 'bg-red-400',
    ring: 'ring-red-500/20',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    label: 'Crítico',
  },
};

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'number',
  loading = false,
  tooltip,
  health,
  healthLabel,
  invertTrend = false,
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
        return val.toLocaleString('pt-PT');
    }
  };

  // For "lower-is-better" metrics like bounce rate, flip the colour mapping
  // so a drop reads as green (good).
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const trendIsPositive = invertTrend ? isDown : isUp;
  const trendIsNegative = invertTrend ? isUp : isDown;

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

  const healthCfg = health ? HEALTH_CONFIG[health] : null;

  return (
    <div className="group relative bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 hover:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/5 overflow-visible">
      {/* Decorative gradient orb that fades in on hover */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/[0.06] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Subtle top-left gradient sheen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none rounded-xl" />

      <div className="relative">
        {/* Header: title + (optional) info icon + main icon */}
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-widest truncate">
              {title}
            </h3>
            {tooltip && (
              <InfoTooltip text={tooltip} />
            )}
          </div>
          {icon && (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-500/[0.08] border border-amber-500/10 flex items-center justify-center text-amber-400 transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 break-all">
          {formatValue(value)}
        </p>

        {/* Health pill — sits between value and trend so admins see "is this
            good?" before "did it move?". */}
        {healthCfg && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ${healthCfg.ring} ${healthCfg.bg} ${healthCfg.text} mb-2`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthCfg.dot} animate-pulse`} />
            <span>{healthLabel ?? healthCfg.label}</span>
          </div>
        )}

        {/* Trend pill */}
        {change !== undefined && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${
                trendIsPositive
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  : trendIsNegative
                  ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                  : 'bg-white/[0.03] text-gray-400 ring-white/10'
              }`}
            >
              {isUp ? (
                <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
              ) : isDown ? (
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

/**
 * Small info icon with a hover popover. Pure-CSS via Tailwind group/peer
 * variants — no portal, no JS state. Sits next to the title to explain what
 * the metric means and what counts as "good" vs "bad".
 */
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex group/info">
    <Info
      className="w-3 h-3 text-gray-600 hover:text-gray-300 cursor-help transition-colors flex-shrink-0"
      strokeWidth={2.5}
    />
    <span
      role="tooltip"
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-2.5 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl text-[11px] text-gray-300 leading-relaxed normal-case tracking-normal font-normal opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50"
    >
      {text}
    </span>
  </span>
);
