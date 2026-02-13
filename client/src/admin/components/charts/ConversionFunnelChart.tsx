import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunnelData {
  funnel_stage: 'view' | 'cart' | 'purchase';
  count: number;
  unique_sessions: number;
}

interface ConversionFunnelChartProps {
  data: FunnelData[];
  loading?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  view: 'Package Views',
  cart: 'Added to Cart',
  purchase: 'Purchases',
};

const STAGE_COLORS: Record<string, string> = {
  view: '#3b82f6',
  cart: '#facc15',
  purchase: '#10b981',
};

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({
  data,
  loading = false,
}) => {
  // Transform data for chart
  const chartData = data
    .sort((a, b) => {
      const order = ['view', 'cart', 'purchase'];
      return order.indexOf(a.funnel_stage) - order.indexOf(b.funnel_stage);
    })
    .map((item) => ({
      stage: STAGE_LABELS[item.funnel_stage] || item.funnel_stage,
      count: item.count,
      sessions: item.unique_sessions,
      color: STAGE_COLORS[item.funnel_stage] || '#666',
    }));

  // Calculate conversion rates
  const viewCount = data.find((d) => d.funnel_stage === 'view')?.count || 0;
  const cartCount = data.find((d) => d.funnel_stage === 'cart')?.count || 0;
  const purchaseCount = data.find((d) => d.funnel_stage === 'purchase')?.count || 0;

  const viewToCart = viewCount > 0 ? ((cartCount / viewCount) * 100).toFixed(1) : '0.0';
  const cartToPurchase = cartCount > 0 ? ((purchaseCount / cartCount) * 100).toFixed(1) : '0.0';
  const viewToPurchase = viewCount > 0 ? ((purchaseCount / viewCount) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-gray-500">No funnel data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

          <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} tickLine={false} />

          <YAxis
            type="category"
            dataKey="stage"
            stroke="#666"
            tick={{ fill: '#999', fontSize: 12 }}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
            labelStyle={{ color: '#999' }}
            formatter={(value: number, name: string) => {
              if (name === 'count') return [value.toLocaleString(), 'Events'];
              if (name === 'sessions') return [value.toLocaleString(), 'Sessions'];
              return [value, name];
            }}
          />

          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion Rate Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">View → Cart</p>
          <p className="text-lg font-bold text-amber-500">{viewToCart}%</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Cart → Purchase</p>
          <p className="text-lg font-bold text-green-500">{cartToPurchase}%</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Overall Conversion</p>
          <p className="text-lg font-bold text-blue-500">{viewToPurchase}%</p>
        </div>
      </div>
    </div>
  );
};
