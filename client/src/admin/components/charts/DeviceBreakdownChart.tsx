import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Monitor, Smartphone, Tablet, Layers } from 'lucide-react';

interface DeviceData {
  device_type: string;
  count: number;
  percentage: number;
}

interface DeviceBreakdownChartProps {
  data: DeviceData[];
  loading?: boolean;
}

const DEVICE_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode; bgClass: string; textClass: string }
> = {
  desktop: {
    color: '#3b82f6',
    icon: <Monitor className="w-4 h-4" />,
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
  },
  mobile: {
    color: '#10b981',
    icon: <Smartphone className="w-4 h-4" />,
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
  },
  tablet: {
    color: '#facc15',
    icon: <Tablet className="w-4 h-4" />,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
  },
};

export const DeviceBreakdownChart: React.FC<DeviceBreakdownChartProps> = ({
  data,
  loading = false,
}) => {
  // Transform data
  const chartData = data.map((item) => {
    const config = DEVICE_CONFIG[item.device_type] || {
      color: '#666',
      icon: <Layers className="w-4 h-4" />,
      bgClass: 'bg-white/5',
      textClass: 'text-gray-400',
    };
    return {
      name: item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1),
      value: item.count,
      percentage: item.percentage,
      color: config.color,
      device_type: item.device_type,
    };
  });

  const totalSessions = data.reduce((sum, d) => sum + d.count, 0);
  const topDevice = data.length > 0 ? [...data].sort((a, b) => b.percentage - a.percentage)[0] : null;

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="h-5 bg-white/5 rounded w-1/3 mb-6 animate-pulse" />
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-40 h-40 rounded-full border-[20px] border-white/5 animate-pulse" />
          <div className="flex-1 w-full space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-white/[0.02] border border-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Distribuição por dispositivo</h3>
        </div>
        <div className="h-[280px] flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">Sem dados de dispositivo disponíveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h3
          className="text-sm sm:text-base font-semibold text-white"
          title="Como os visitantes acedem ao site. Útil para priorizar otimizações de UI consoante o dispositivo dominante."
        >
          Distribuição por dispositivo
        </h3>
      </div>

      {/* Donut + summary side-by-side on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 mb-5">
        {/* Donut chart with center label */}
        <div className="relative flex-shrink-0">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '8px 12px',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                }}
                formatter={(value, _name, props: any) => [
                  `${Number(value ?? 0).toLocaleString('pt-PT')} (${props.payload.percentage.toFixed(1)}%)`,
                  props.payload.name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Total</p>
            <p className="text-2xl font-bold text-white tracking-tight">
              {totalSessions.toLocaleString('pt-PT')}
            </p>
            <p className="text-[10px] text-gray-500">sessões</p>
          </div>
        </div>

        {/* Top device callout */}
        {topDevice && (
          <div className="flex-1 w-full">
            <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1.5">
                Dispositivo principal
              </p>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${DEVICE_CONFIG[topDevice.device_type]?.bgClass} ${DEVICE_CONFIG[topDevice.device_type]?.textClass}`}
                >
                  {DEVICE_CONFIG[topDevice.device_type]?.icon || <Layers className="w-4 h-4" />}
                </div>
                <p className="text-base font-bold text-white capitalize">{topDevice.device_type}</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${DEVICE_CONFIG[topDevice.device_type]?.textClass || 'text-white'}`}>
                  {topDevice.percentage.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">do tráfego total</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device list with progress bars */}
      <div className="space-y-2">
        {data
          .slice()
          .sort((a, b) => b.percentage - a.percentage)
          .map((device) => {
            const config = DEVICE_CONFIG[device.device_type] || {
              color: '#666',
              icon: <Layers className="w-4 h-4" />,
              bgClass: 'bg-white/5',
              textClass: 'text-gray-400',
            };
            return (
              <div
                key={device.device_type}
                className="group p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgClass} ${config.textClass} flex-shrink-0`}
                    >
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white capitalize">
                        {device.device_type}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {device.count.toLocaleString('pt-PT')} sessões
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base sm:text-lg font-bold ${config.textClass}`}>
                      {device.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${device.percentage}%`,
                      background: `linear-gradient(90deg, ${config.color}aa, ${config.color})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};