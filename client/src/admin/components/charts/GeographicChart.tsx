import React from 'react';
import { Globe, MapPin } from 'lucide-react';

interface GeographicData {
  country: string;
  sessions: number;
  conversions: number;
}

interface GeographicChartProps {
  data: GeographicData[];
  loading?: boolean;
}

// Country code → name mapping
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

// Convert ISO country code → flag emoji using regional indicator symbols
const countryCodeToFlag = (code: string): string => {
  if (!code || code.length !== 2) return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const GeographicChart: React.FC<GeographicChartProps> = ({ data, loading = false }) => {
  // Sort by sessions descending and enrich
  const enrichedData = data
    .map((item) => ({
      ...item,
      country: COUNTRY_NAMES[item.country] || item.country,
      countryCode: item.country,
      flag: countryCodeToFlag(item.country),
      conversionRate: item.sessions > 0 ? (item.conversions / item.sessions) * 100 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const maxSessions = enrichedData.length > 0 ? enrichedData[0].sessions : 1;
  const totalSessions = enrichedData.reduce((sum, d) => sum + d.sessions, 0);
  const totalConversions = enrichedData.reduce((sum, d) => sum + d.conversions, 0);
  const overallConvRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="h-5 bg-white/5 rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 bg-white/[0.02] border border-white/5 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Geographic Distribution</h3>
        </div>
        <div className="h-[280px] flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">No geographic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Geographic Distribution</h3>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/10">
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="text-[11px] text-gray-400 font-semibold">
            {enrichedData.length} {enrichedData.length === 1 ? 'country' : 'countries'}
          </span>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold mb-1">
            Total Sessions
          </p>
          <p className="text-base sm:text-lg font-bold text-white">{totalSessions.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-amber-500/[0.04] border border-amber-500/10 rounded-lg">
          <p className="text-[9px] text-amber-400/70 uppercase tracking-widest font-semibold mb-1">
            Conversions
          </p>
          <p className="text-base sm:text-lg font-bold text-amber-400">
            {totalConversions.toLocaleString()}
          </p>
        </div>
        <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-lg">
          <p className="text-[9px] text-emerald-400/70 uppercase tracking-widest font-semibold mb-1">
            Conv. Rate
          </p>
          <p className="text-base sm:text-lg font-bold text-emerald-400">
            {overallConvRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Country list */}
      <div className="space-y-2">
        <h4 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">
          Top Countries
        </h4>
        {enrichedData.slice(0, 8).map((country, index) => {
          const widthPercent = (country.sessions / maxSessions) * 100;
          return (
            <div
              key={country.countryCode}
              className="group relative p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-all overflow-hidden"
            >
              {/* Background bar fill */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/[0.06] to-transparent transition-all duration-1000 ease-out pointer-events-none"
                style={{ width: `${widthPercent}%` }}
              />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {/* Rank */}
                  <span
                    className={`flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-md flex-shrink-0 ${
                      index === 0
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                        : index === 1
                        ? 'bg-gray-400/20 text-gray-300'
                        : index === 2
                        ? 'bg-orange-700/20 text-orange-400'
                        : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* Flag */}
                  <span className="text-xl sm:text-2xl flex-shrink-0 leading-none" aria-hidden="true">
                    {country.flag}
                  </span>

                  {/* Name + sessions */}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {country.country}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {country.sessions.toLocaleString()} sessions
                      {country.conversions > 0 && (
                        <> • {country.conversions.toLocaleString()} conv.</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Conversion rate */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm sm:text-base font-bold ${
                      country.conversionRate >= 5
                        ? 'text-emerald-400'
                        : country.conversionRate >= 1
                        ? 'text-amber-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {country.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider">
                    conv. rate
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* "More countries" hint */}
      {enrichedData.length > 8 && (
        <p className="text-[11px] text-gray-500 text-center mt-3">
          + {enrichedData.length - 8} more {enrichedData.length - 8 === 1 ? 'country' : 'countries'}
        </p>
      )}
    </div>
  );
};