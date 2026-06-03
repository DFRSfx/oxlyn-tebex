import React from 'react';
import { FileText, Clock, ExternalLink } from 'lucide-react';

export interface TopPageItem {
  page_url: string;
  views: number;
  avg_time: number | null;
}

interface TopPagesChartProps {
  data: TopPageItem[];
  loading?: boolean;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
};

const friendlyPath = (url: string): string => {
  if (!url || url === '/') return 'Home';
  const trimmed = url.replace(/^\/+/, '').replace(/\/+$/, '');
  return `/${trimmed}`;
};

export const TopPagesChart: React.FC<TopPagesChartProps> = ({ data, loading = false }) => {
  const maxViews = data.length > 0 ? Math.max(...data.map((d) => Number(d.views) || 0), 1) : 1;
  const totalViews = data.reduce((sum, d) => sum + (Number(d.views) || 0), 0);

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
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white truncate">Top Pages</h3>
        </div>

        {totalViews > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 ring-1 ring-blue-500/20">
            <span className="text-[10px] text-blue-400/80 uppercase tracking-widest font-bold">Total</span>
            <span className="text-xs font-bold text-blue-400 tabular-nums">
              {totalViews.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-[280px] flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">No page view data yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.map((item, index) => {
            const views = Number(item.views) || 0;
            const widthPct = (views / maxViews) * 100;
            const sharePct = totalViews > 0 ? (views / totalViews) * 100 : 0;

            return (
              <div key={item.page_url} className="group relative">
                <div className="relative bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-colors">
                  {/* Background bar */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                    style={{
                      width: `${widthPct}%`,
                      background: 'linear-gradient(90deg, #3b82f622, #3b82f608)',
                    }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-between gap-3 p-2.5 sm:p-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex-shrink-0 w-6 h-6 rounded-md bg-white/5 text-gray-500 flex items-center justify-center text-[10px] font-bold tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-white truncate font-mono" title={item.page_url}>
                          {friendlyPath(item.page_url)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDuration(item.avg_time)}
                          </span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500 tabular-nums">{sharePct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-bold text-blue-400 tracking-tight tabular-nums">
                        {views.toLocaleString()}
                      </span>
                      <ExternalLink className="w-3 h-3 text-blue-400 opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
