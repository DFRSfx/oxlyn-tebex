import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Activity } from 'lucide-react';

interface TimeSeriesData {
  date: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title: string;
  color?: string;
  loading?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  color = '#facc15',
  loading = false,
}) => {
  // Transform data
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    fullDate: item.date,
    value: item.value,
  }));

  // Compute summary stats
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const avg = chartData.length > 0 ? Math.round(total / chartData.length) : 0;
  const max = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 0;

  // Trend: compare first half vs second half average
  let trendPct = 0;
  if (chartData.length >= 4) {
    const half = Math.floor(chartData.length / 2);
    const firstHalfAvg = chartData.slice(0, half).reduce((s, d) => s + d.value, 0) / half;
    const secondHalfAvg = chartData.slice(half).reduce((s, d) => s + d.value, 0) / (chartData.length - half);
    if (firstHalfAvg > 0) {
      trendPct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    }
  }
  const trendUp = trendPct > 0;

  // Unique gradient ID per chart instance to avoid SVG ID collisions
  const gradientId = React.useMemo(
    () => `tsArea-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-white/5 rounded w-1/3 animate-pulse" />
          <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-[260px] sm:h-[300px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-sm animate-pulse">A carregar gráfico...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-[260px] sm:h-[300px] flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">Sem dados disponíveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white truncate">{title}</h3>
        </div>

        {trendPct !== 0 && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${
              trendUp
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                : 'bg-red-500/10 text-red-400 ring-red-500/20'
            }`}
          >
            <TrendingUp className={`w-3 h-3 ${trendUp ? '' : 'rotate-180'}`} strokeWidth={2.5} />
            <span>
              {trendUp ? '+' : ''}
              {trendPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4 sm:mb-5">
        <Stat label="Total" value={total.toLocaleString('pt-PT')} accent={color} hint="Soma de todos os dias do período." />
        <Stat label="Média/dia" value={avg.toLocaleString('pt-PT')} hint="Valor médio diário no período selecionado." />
        <Stat label="Pico" value={max.toLocaleString('pt-PT')} hint="Dia com o valor mais alto no período." />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220} className="-ml-2">
        <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="date"
            stroke="#52525b"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />

          <YAxis
            stroke="#52525b"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />

          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              padding: '10px 12px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            itemStyle={{ color: '#fff', fontSize: '13px', padding: 0 }}
            formatter={(value) => [Number(value ?? 0).toLocaleString('pt-PT'), title]}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            activeDot={{
              r: 5,
              stroke: '#0f0f0f',
              strokeWidth: 3,
              fill: color,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Internal stat tile
function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5" title={hint}>
      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">{label}</p>
      <p
        className="text-sm sm:text-base font-bold truncate"
        style={accent ? { color: accent } : { color: '#ffffff' }}
      >
        {value}
      </p>
    </div>
  );
}