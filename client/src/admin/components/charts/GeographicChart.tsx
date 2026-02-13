import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Globe } from 'lucide-react';

interface GeographicData {
  country: string;
  sessions: number;
  conversions: number;
}

interface GeographicChartProps {
  data: GeographicData[];
  loading?: boolean;
}

// Country code to name mapping (common countries)
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  AU: 'Australia',
  IN: 'India',
  JP: 'Japan',
  CN: 'China',
  KR: 'South Korea',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  RU: 'Russia',
  UA: 'Ukraine',
};

export const GeographicChart: React.FC<GeographicChartProps> = ({ data, loading = false }) => {
  // Transform data for chart with country names
  const chartData = data.map((item) => ({
    country: COUNTRY_NAMES[item.country] || item.country,
    countryCode: item.country,
    sessions: item.sessions,
    conversions: item.conversions,
    conversionRate: item.sessions > 0 ? ((item.conversions / item.sessions) * 100).toFixed(1) : '0.0',
  }));

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Geographic Distribution</h3>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Geographic Distribution</h3>
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-gray-500">No geographic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-white">Geographic Distribution</h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

          <XAxis
            dataKey="countryCode"
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
            formatter={(value: number, name: string) => {
              if (name === 'sessions') return [value.toLocaleString(), 'Sessions'];
              if (name === 'conversions') return [value.toLocaleString(), 'Conversions'];
              return [value, name];
            }}
            labelFormatter={(label) => chartData.find((d) => d.countryCode === label)?.country || label}
          />

          <Legend
            wrapperStyle={{ color: '#999', fontSize: '14px' }}
            iconType="rect"
            iconSize={14}
          />

          <Bar dataKey="sessions" fill="#facc15" radius={[8, 8, 0, 0]} name="Sessions" />
          <Bar dataKey="conversions" fill="#10b981" radius={[8, 8, 0, 0]} name="Conversions" />
        </BarChart>
      </ResponsiveContainer>

      {/* Top Countries List */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Top Countries</h4>
        {chartData.slice(0, 5).map((country, index) => (
          <div
            key={country.countryCode}
            className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-6">#{index + 1}</span>
              <div>
                <p className="text-sm font-medium text-white">{country.country}</p>
                <p className="text-xs text-gray-400">
                  {country.sessions.toLocaleString()} sessions • {country.conversions} conversions
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-amber-500">{country.conversionRate}%</p>
              <p className="text-xs text-gray-500">conv. rate</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
