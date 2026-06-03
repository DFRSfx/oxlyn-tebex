import React, { useState, useEffect } from 'react';
import { Archive, Users, Eye, TrendingUp, Clock, Activity, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import { MetricsCard, MetricHealth } from '../components/charts/MetricsCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { DeviceBreakdownChart } from '../components/charts/DeviceBreakdownChart';
import { GeographicChart } from '../components/charts/GeographicChart';
import { TopPagesChart, TopPageItem } from '../components/charts/TopPagesChart';
import { API_URL } from '../../config/api';

type Period = '7d' | '30d' | '90d';

interface DashboardStats {
  total_sessions: number;
  total_page_views: number;
  total_events: number;
  avg_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
  unique_visitors: number;
}

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

// % change between current and previous values. Returns 0 when previous is 0
// to avoid Infinity / divide-by-zero — the UI shows "no comparison" in that case.
const pctChange = (current: number, previous: number): number | undefined => {
  if (previous === undefined || previous === null) return undefined;
  if (previous === 0) return current === 0 ? 0 : undefined;
  return ((current - previous) / previous) * 100;
};

// Health thresholds — slightly different baseline for Vanguard since it's a
// legacy catalogue (lower conversion is expected) but kept consistent for
// at-a-glance visual comparison with the main Analytics page.
const bounceRateHealth = (rate: number): MetricHealth =>
  rate < 40 ? 'good' : rate < 60 ? 'warning' : 'bad';
const sessionDurationHealth = (seconds: number): MetricHealth =>
  seconds >= 120 ? 'good' : seconds >= 30 ? 'warning' : 'bad';

/**
 * Vanguard Analytics — mirror of the main AnalyticsPage but restricted to
 * traffic that touched a /vanguardscripts or /vanguardbundles page. Powers
 * "how many people are using my YouTube shortlink?"-style questions.
 *
 * Data sources are the `/api/analytics/vanguard/*` endpoints, which apply a
 * `page_url LIKE '%vanguard%'` filter server-side. Everything else (period
 * picker, charts, layout) is identical to AnalyticsPage so the admin doesn't
 * have to relearn anything when switching tabs.
 */
export default function VanguardAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [previousStats, setPreviousStats] = useState<DashboardStats | null>(null);

  const [sessionsTimeSeries, setSessionsTimeSeries] = useState<any[]>([]);
  const [pageViewsTimeSeries, setPageViewsTimeSeries] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<TopPageItem[]>([]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const credentials = 'include' as RequestCredentials;
      const init = { headers, credentials };

      // Previous-period window for the comparison arrows on the metric cards.
      const days = PERIOD_DAYS[period];
      const now = new Date();
      const prevTo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevFrom = new Date(prevTo.getTime() - days * 24 * 60 * 60 * 1000);
      const prevQuery = `from=${encodeURIComponent(prevFrom.toISOString())}&to=${encodeURIComponent(prevTo.toISOString())}`;

      const [
        statsRes,
        prevStatsRes,
        sessionsRes,
        pageViewsRes,
        devicesRes,
        geoRes,
        topPagesRes,
      ] = await Promise.all([
        fetch(`${API_URL}/analytics/vanguard/dashboard-stats?period=${period}`, init),
        fetch(`${API_URL}/analytics/vanguard/dashboard-stats?${prevQuery}`, init),
        fetch(`${API_URL}/analytics/vanguard/time-series?metric=sessions&period=${period}`, init),
        fetch(`${API_URL}/analytics/vanguard/time-series?metric=page_views&period=${period}`, init),
        fetch(`${API_URL}/analytics/vanguard/devices?period=${period}`, init),
        fetch(`${API_URL}/analytics/vanguard/geographic?period=${period}`, init),
        fetch(`${API_URL}/analytics/vanguard/top-pages?period=${period}&limit=10`, init),
      ]);

      if (statsRes.ok)        setStats((await statsRes.json()).data);
      if (prevStatsRes.ok)    setPreviousStats((await prevStatsRes.json()).data);
      else                    setPreviousStats(null);
      if (sessionsRes.ok)     setSessionsTimeSeries((await sessionsRes.json()).data);
      if (pageViewsRes.ok)    setPageViewsTimeSeries((await pageViewsRes.json()).data);
      if (devicesRes.ok)      setDeviceData((await devicesRes.json()).data);
      if (geoRes.ok)          setGeographicData((await geoRes.json()).data);
      if (topPagesRes.ok)     setTopPages((await topPagesRes.json()).data || []);
    } catch (e) {
      console.error('Failed to fetch vanguard analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

  // Auto-refresh every 60s — same cadence as the main dashboard.
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(id);
  }, [period]);

  const periodLabels: Record<Period, string> = { '7d': '7 dias', '30d': '30 dias', '90d': '90 dias' };
  const compareLabel = `vs ${periodLabels[period]} anteriores`;

  const change = {
    sessions:       pctChange(stats?.total_sessions ?? 0, previousStats?.total_sessions ?? 0),
    pageViews:      pctChange(stats?.total_page_views ?? 0, previousStats?.total_page_views ?? 0),
    avgDuration:    pctChange(stats?.avg_session_duration ?? 0, previousStats?.avg_session_duration ?? 0),
    uniqueVisitors: pctChange(stats?.unique_visitors ?? 0, previousStats?.unique_visitors ?? 0),
    bounceRate:     pctChange(stats?.bounce_rate ?? 0, previousStats?.bounce_rate ?? 0),
    totalEvents:    pctChange(stats?.total_events ?? 0, previousStats?.total_events ?? 0),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header — amber accent (matches the Vanguard tone used elsewhere) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a1410]">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-2xl" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
                  <Archive className="text-amber-400" size={26} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest">Vanguard</span>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                    Live
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Vanguard Analytics
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Tráfego que passou por <span className="font-mono text-amber-300/80">/vanguardscripts</span> ou <span className="font-mono text-amber-300/80">/vanguardbundles</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="group p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw size={16} className={`text-gray-400 group-hover:text-white ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>

              <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 relative">
                {(['7d', '30d', '90d'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      period === p
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Shortlink reminder — surfaces the URL the admin promoted so they
            know what they're measuring at a glance. */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.05]">
          <Archive size={14} className="text-amber-300 flex-shrink-0" />
          <span className="text-xs text-amber-200/85">
            <b className="text-white">Vanguard shortlinks:</b>
          </span>
          <a
            href="/vanguardscripts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-200/85 hover:text-white font-mono underline-offset-2 hover:underline transition-colors"
          >
            /vanguardscripts <ExternalLink size={10} />
          </a>
          <span className="text-xs text-gray-600">·</span>
          <a
            href="/vanguardbundles"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-200/85 hover:text-white font-mono underline-offset-2 hover:underline transition-colors"
          >
            /vanguardbundles <ExternalLink size={10} />
          </a>
        </div>

        {/* Visitor metrics */}
        <SectionLabel icon={<Users size={14} />} text="Métricas de Visitantes Vanguard" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Sessões Vanguard"
            value={stats?.total_sessions || 0}
            change={change.sessions}
            changeLabel={compareLabel}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
            tooltip="Visitas que abriram pelo menos uma página da categoria Vanguard. Mesmo IP em sessões diferentes (>30 min de inatividade) conta separadamente."
          />
          <MetricsCard
            title="Visualizações de Vanguard"
            value={stats?.total_page_views || 0}
            change={change.pageViews}
            changeLabel={compareLabel}
            icon={<Eye className="w-5 h-5" />}
            loading={loading}
            tooltip="Total de page views só para URLs Vanguard (inclui /vanguardscripts, /vanguardbundles e qualquer página de produto Vanguard)."
          />
          <MetricsCard
            title="Duração média"
            value={stats?.avg_session_duration || 0}
            change={change.avgDuration}
            changeLabel={compareLabel}
            format="duration"
            icon={<Clock className="w-5 h-5" />}
            loading={loading}
            tooltip="Tempo médio que um visitante Vanguard passa no site. Bom: > 2 min · Atenção: 30s-2min · Crítico: < 30s."
            health={
              stats && stats.avg_session_duration > 0
                ? sessionDurationHealth(stats.avg_session_duration)
                : undefined
            }
          />
          <MetricsCard
            title="Visitantes únicos"
            value={stats?.unique_visitors || 0}
            change={change.uniqueVisitors}
            changeLabel={compareLabel}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
            tooltip="Pessoas distintas que tocaram em qualquer página Vanguard no período."
          />
        </div>

        {/* Engagement metrics */}
        <SectionLabel icon={<Activity size={14} />} text="Engagement Vanguard" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricsCard
            title="Taxa de rejeição"
            value={stats?.bounce_rate || 0}
            change={change.bounceRate}
            changeLabel={compareLabel}
            format="percentage"
            icon={<TrendingUp className="w-5 h-5" />}
            loading={loading}
            tooltip="% de visitantes que viram apenas uma página Vanguard e saíram. Quanto mais baixa, melhor o interesse no catálogo."
            health={
              stats && stats.bounce_rate > 0 ? bounceRateHealth(stats.bounce_rate) : undefined
            }
            invertTrend
          />
          <MetricsCard
            title="Eventos Vanguard"
            value={stats?.total_events || 0}
            change={change.totalEvents}
            changeLabel={compareLabel}
            icon={<Activity className="w-5 h-5" />}
            loading={loading}
            tooltip="Cliques, scrolls, vistas de package, adições ao carrinho e checkouts registados em páginas Vanguard."
          />
        </div>

        {/* Time series */}
        <SectionLabel icon={<TrendingUp size={14} />} text="Tendências Vanguard ao longo do tempo" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeSeriesChart
            data={sessionsTimeSeries}
            title="Sessões Vanguard por dia"
            color="#fbbf24"
            loading={loading}
          />
          <TimeSeriesChart
            data={pageViewsTimeSeries}
            title="Page views Vanguard por dia"
            color="#fb923c"
            loading={loading}
          />
        </div>

        {/* Audience */}
        <SectionLabel icon={<Eye size={14} />} text="Origem do tráfego Vanguard" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceBreakdownChart data={deviceData} loading={loading} />
          <GeographicChart data={geographicData} loading={loading} />
        </div>

        {/* Top vanguard pages */}
        <SectionLabel icon={<FileText size={14} />} text="Páginas Vanguard mais visitadas" />
        <TopPagesChart data={topPages} loading={loading} />
      </div>
    </div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-7 h-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">{text}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}
