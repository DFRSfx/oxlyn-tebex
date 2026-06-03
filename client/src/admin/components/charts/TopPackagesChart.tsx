import React, { useState } from 'react';
import { Package as PackageIcon, Eye, ShoppingCart, Trophy } from 'lucide-react';

export interface TopPackageItem {
  id: number;
  package_name: string;
  view_count: number;
  cart_count: number;
}

interface TopPackagesChartProps {
  viewsData: TopPackageItem[];
  cartData: TopPackageItem[];
  loading?: boolean;
}

type Mode = 'views' | 'cart';

const cleanPackageName = (name: string): string =>
  name
    .replace(/\s*\(OPEN-SOURCE\)/gi, '')
    .replace(/\s*\(ESCROWED\)/gi, '')
    .replace(/\s*\(Open Source\)/gi, '')
    .replace(/\s*\(Escrow\)/gi, '')
    .trim();

export const TopPackagesChart: React.FC<TopPackagesChartProps> = ({
  viewsData,
  cartData,
  loading = false,
}) => {
  const [mode, setMode] = useState<Mode>('views');

  const data = mode === 'views' ? viewsData : cartData;
  const accent = mode === 'views' ? '#3b82f6' : '#facc15';
  const accentText = mode === 'views' ? 'text-blue-400' : 'text-amber-400';
  const ModeIcon = mode === 'views' ? Eye : ShoppingCart;
  const valueKey: keyof TopPackageItem = mode === 'views' ? 'view_count' : 'cart_count';

  const maxValue = data.length > 0 ? Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1) : 1;
  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="h-5 bg-white/5 rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-white/[0.02] border border-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6 hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white truncate">Top Packages</h3>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => setMode('views')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              mode === 'views'
                ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Eye className="w-3 h-3" />
            Views
          </button>
          <button
            onClick={() => setMode('cart')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              mode === 'cart'
                ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ShoppingCart className="w-3 h-3" />
            Cart Adds
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[280px] flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
            <PackageIcon className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">No package data yet</p>
        </div>
      ) : (
        <>
          {/* Total banner */}
          <div className="flex items-baseline justify-between mb-4 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
              Total {mode === 'views' ? 'Views' : 'Cart Adds'}
            </span>
            <span className={`text-base font-bold ${accentText} tracking-tight`}>
              {total.toLocaleString()}
            </span>
          </div>

          {/* List */}
          <div className="space-y-1.5">
            {data.map((item, index) => {
              const value = Number(item[valueKey]) || 0;
              const widthPct = (value / maxValue) * 100;
              const sharePct = total > 0 ? (value / total) * 100 : 0;

              return (
                <div key={item.id} className="group relative">
                  <div className="relative bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-colors">
                    {/* Background bar */}
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${accent}22, ${accent}08)`,
                      }}
                    />

                    {/* Content */}
                    <div className="relative flex items-center justify-between gap-3 p-2.5 sm:p-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            index === 0
                              ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                              : index === 1
                              ? 'bg-gray-400/10 text-gray-300 ring-1 ring-gray-400/20'
                              : index === 2
                              ? 'bg-orange-700/15 text-orange-400 ring-1 ring-orange-700/30'
                              : 'bg-white/5 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-white truncate" title={item.package_name}>
                          {cleanPackageName(item.package_name)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
                          {sharePct.toFixed(1)}%
                        </span>
                        <span className={`text-sm font-bold ${accentText} tracking-tight tabular-nums`}>
                          {value.toLocaleString()}
                        </span>
                        <ModeIcon className={`w-3.5 h-3.5 ${accentText} opacity-60`} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
