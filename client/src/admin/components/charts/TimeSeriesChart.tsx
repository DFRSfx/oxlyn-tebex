import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

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
  // Transform data to format Recharts expects
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    value: item.value,
  }));

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fill: '#999', fontSize: 12 }}
            tickLine={false}
          />

          <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} tickLine={false} />

          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: color }}
          />

          <Legend
            wrapperStyle={{ color: '#999', fontSize: '14px' }}
            iconType="line"
            iconSize={14}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            fill="url(#colorValue)"
            name={title}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
