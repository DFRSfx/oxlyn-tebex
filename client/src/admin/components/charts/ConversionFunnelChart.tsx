import React from 'react';
import { Eye, ShoppingCart, CheckCircle2, ArrowDown, Filter } from 'lucide-react';

interface FunnelData {
  funnel_stage: 'view' | 'cart' | 'purchase';
  count: number;
  unique_sessions: number;
}

interface ConversionFunnelChartProps {
  data: FunnelData[];
  loading?: boolean;
}

const STAGE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    gradient: string;
    accent: string;
    text: string;
    ring: string;
  }
> = {
  view: {
    label: 'Package Views',
    icon: <Eye className="w-4 h-4" />,
    gradient: 'from-blue-500/30 via-blue-500/15 to-blue-500/5',
    accent: '#3b82f6',
    text: 'text-blue-400',
    ring: 'ring-blue-500/20',
  },
  cart: {
    label: 'Added to Cart',
    icon: <ShoppingCart className="w-4 h-4" />,
    gradient: 'from-amber-500/30 via-amber-500/15 to-amber-500/5',
    accent: '#facc15',
    text: 'text-amber-400',
    ring: 'ring-amber-500/20',
  },
  purchase: {
    label: 'Purchases',
    icon: <CheckCircle2 className="w-4 h-4" />,
    gradient: 'from-emerald-500/30 via-emerald-500/15 to-emerald-500/5',
    accent: '#10b981',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
};

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({
  data,
  loading = false,
}) => {
  // Sort + map data
  const sortedData = [...data].sort((a, b) => {
    const order = ['view', 'cart', 'purchase'];
    return order.indexOf(a.funnel_stage) - order.indexOf(b.funnel_stage);
  });

  // Conversion rates
  const viewCount = data.find((d) => d.funnel_stage === 'view')?.count || 0;
  const cartCount = data.find((d) => d.funnel_stage === 'cart')?.count || 0;
  const purchaseCount = data.find((d) => d.funnel_stage === 'purchase')?.count || 0;

  const viewToCart = viewCount > 0 ? (cartCount / viewCount) * 100 : 0;
  const cartToPurchase = cartCount > 0 ? (purchaseCount / cartCount) * 100 : 0;
  const viewToPurchase = viewCount > 0 ? (purchaseCount / viewCount) * 100 : 0;

  const maxCount = Math.max(viewCount, cartCount, purchaseCount, 1);

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 sm:p-6">
        <div className="h-5 bg-white/5 rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/[0.02] border border-white/5 rounded-lg animate-pulse" />
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
            <Filter className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Conversion Funnel</h3>
        </div>
        <div className="h-[280px] flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
            <Filter className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">No funnel data available</p>
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
            <Filter className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Conversion Funnel</h3>
        </div>

        {/* Overall headline rate */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-bold">Overall</span>
          <span className="text-sm font-bold text-emerald-400">{viewToPurchase.toFixed(1)}%</span>
        </div>
      </div>

      {/* Visual funnel */}
      <div className="space-y-1.5 sm:space-y-2 mb-5 sm:mb-6">
        {sortedData.map((item, index) => {
          const config = STAGE_CONFIG[item.funnel_stage];
          if (!config) return null;

          const widthPercent = (item.count / maxCount) * 100;
          const isLast = index === sortedData.length - 1;

          // Drop-off from previous stage
          const prevItem = index > 0 ? sortedData[index - 1] : null;
          const dropOff = prevItem && prevItem.count > 0
            ? ((prevItem.count - item.count) / prevItem.count) * 100
            : 0;

          return (
            <React.Fragment key={item.funnel_stage}>
              {/* Stage row */}
              <div className="group relative">
                {/* Bar fill — gradient + animated width */}
                <div
                  className={`relative bg-gradient-to-r ${config.gradient} border border-white/5 rounded-xl overflow-hidden transition-all duration-500 hover:border-white/10`}
                  style={{
                    minWidth: '100%',
                  }}
                >
                  {/* Filled portion */}
                  <div
                    className={`absolute inset-y-0 left-0 ${config.gradient} transition-all duration-1000 ease-out`}
                    style={{
                      width: `${widthPercent}%`,
                      background: `linear-gradient(90deg, ${config.accent}25, ${config.accent}10)`,
                    }}
                  />

                  {/* Content overlay */}
                  <div className="relative flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${config.text} ring-1 ${config.ring}`}
                        style={{ backgroundColor: `${config.accent}15` }}
                      >
                        {config.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{config.label}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {item.unique_sessions.toLocaleString()} unique sessions
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg sm:text-xl font-bold ${config.text} tracking-tight`}>
                        {item.count.toLocaleString()}
                      </p>
                      {prevItem && (
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {((item.count / prevItem.count) * 100).toFixed(1)}% kept
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drop-off indicator between stages */}
              {!isLast && prevItem !== null && (
                <div className="flex items-center justify-center py-0.5">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/5">
                    <ArrowDown className="w-2.5 h-2.5 text-gray-500" />
                    {dropOff > 0 && (
                      <span className="text-[9px] text-gray-500 font-medium">
                        −{dropOff.toFixed(1)}% drop-off
                      </span>
                    )}
                  </div>
                </div>
              )}
              {!isLast && index === 0 && (
                <div className="flex items-center justify-center py-0.5">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/5">
                    <ArrowDown className="w-2.5 h-2.5 text-gray-500" />
                    <span className="text-[9px] text-gray-500 font-medium">
                      {(100 - viewToCart).toFixed(1)}% drop-off
                    </span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Conversion rate cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <ConversionStat
          label="View → Cart"
          value={viewToCart}
          color="#facc15"
          ringClass="ring-amber-500/20"
          textClass="text-amber-400"
          bgClass="bg-amber-500/5"
        />
        <ConversionStat
          label="Cart → Buy"
          value={cartToPurchase}
          color="#10b981"
          ringClass="ring-emerald-500/20"
          textClass="text-emerald-400"
          bgClass="bg-emerald-500/5"
        />
        <ConversionStat
          label="Overall"
          value={viewToPurchase}
          color="#3b82f6"
          ringClass="ring-blue-500/20"
          textClass="text-blue-400"
          bgClass="bg-blue-500/5"
        />
      </div>
    </div>
  );
};

// Internal conversion stat tile
function ConversionStat({
  label,
  value,
  ringClass,
  textClass,
  bgClass,
}: {
  label: string;
  value: number;
  color: string;
  ringClass: string;
  textClass: string;
  bgClass: string;
}) {
  return (
    <div className={`text-center p-2.5 sm:p-3 ${bgClass} ring-1 ${ringClass} rounded-lg`}>
      <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
        {label}
      </p>
      <p className={`text-base sm:text-lg font-bold ${textClass} tracking-tight`}>
        {value.toFixed(1)}%
      </p>
    </div>
  );
}