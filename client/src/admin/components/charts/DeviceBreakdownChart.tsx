import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface DeviceData {
  device_type: string;
  count: number;
  percentage: number;
}

interface DeviceBreakdownChartProps {
  data: DeviceData[];
  loading?: boolean;
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3b82f6',
  mobile: '#10b981',
  tablet: '#f59e0b',
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="w-4 h-4" />,
  mobile: <Smartphone className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />,
};

export const DeviceBreakdownChart: React.FC<DeviceBreakdownChartProps> = ({
  data,
  loading = false,
}) => {
  // Transform data for chart
  const chartData = data.map((item) => ({
    name: item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1),
    value: item.count,
    percentage: item.percentage,
    color: DEVICE_COLORS[item.device_type] || '#666',
  }));

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Device Breakdown</h3>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Device Breakdown</h3>
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-gray-500">No device data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Device Breakdown</h3>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Device Stats List */}
      <div className="mt-6 space-y-3">
        {data.map((device) => (
          <div
            key={device.device_type}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${DEVICE_COLORS[device.device_type]}20` }}
              >
                <div style={{ color: DEVICE_COLORS[device.device_type] }}>
                  {DEVICE_ICONS[device.device_type]}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white capitalize">{device.device_type}</p>
                <p className="text-xs text-gray-400">{device.count.toLocaleString()} sessions</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">{device.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
