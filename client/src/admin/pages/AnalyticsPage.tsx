import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, ShoppingCart, TrendingUp, Clock, Activity, RefreshCw, FileText } from 'lucide-react';
import { MetricsCard, MetricHealth } from '../components/charts/MetricsCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { ConversionFunnelChart } from '../components/charts/ConversionFunnelChart';
import { DeviceBreakdownChart } from '../components/charts/DeviceBreakdownChart';
import { GeographicChart } from '../components/charts/GeographicChart';
import { TopPackagesChart, TopPackageItem } from '../components/charts/TopPackagesChart';
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

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

// % change between current and previous values. Returns 0 when previous is 0
// to avoid Infinity / divide-by-zero — the UI shows "no comparison" in that case.
const pctChange = (current: number, previous: number): number | undefined => {
  if (previous === undefined || previous === null) return undefined;
  if (previous === 0) return current === 0 ? 0 : undefined;
  return ((current - previous) / previous) * 100;
};

// Health classifiers — thresholds chosen from common e-commerce benchmarks.
// Tweak per business rules if conversion expectations differ.
const bounceRateHealth = (rate: number): MetricHealth =>
  rate < 40 ? 'good' : rate < 60 ? 'warning' : 'bad';

const conversionRateHealth = (rate: number): MetricHealth =>
  rate >= 2 ? 'good' : rate >= 0.5 ? 'warning' : 'bad';

const sessionDurationHealth = (seconds: number): MetricHealth =>
  seconds >= 120 ? 'good' : seconds >= 30 ? 'warning' : 'bad';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard stats — current + previous period for comparison
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [previousStats, setPreviousStats] = useState<DashboardStats | null>(null);

  // Chart data
  const [sessionsTimeSeries, setSessionsTimeSeries] = useState<any[]>([]);
  const [pageViewsTimeSeries, setPageViewsTimeSeries] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);
  const [topPackagesViews, setTopPackagesViews] = useState<TopPackageItem[]>([]);
  const [topPackagesCart, setTopPackagesCart] = useState<TopPackageItem[]>([]);
  const [topPages, setTopPages] = useState<TopPageItem[]>([]);

  const fetchAnalyticsData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const headers = { 'Content-Type': 'application/json' };
      const credentials = 'include' as RequestCredentials;
      const init = { headers, credentials };

      // Compute the previous-period window of equal length so we can compare.
      const days = PERIOD_DAYS[period];
      const now = new Date();
      const prevTo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevFrom = new Date(prevTo.getTime() - days * 24 * 60 * 60 * 1000);
      const prevQuery = `from=${encodeURIComponent(prevFrom.toISOString())}&to=${encodeURIComponent(prevTo.toISOString())}`;

      // Fire all requests in parallel — none depends on another's response.
      const [
        statsRes,
        prevStatsRes,
        sessionsRes,
        pageViewsRes,
        funnelRes,
        devicesRes,
        geoRes,
        topPkgViewsRes,
        topPkgCartRes,
        topPagesRes,
      ] = await Promise.all([
        fetch(`${API_URL}/analytics/dashboard-stats?period=${period}`, init),
        fetch(`${API_URL}/analytics/dashboard-stats?${prevQuery}`, init),
        fetch(`${API_URL}/analytics/time-series?metric=sessions&period=${period}`, init),
        fetch(`${API_URL}/analytics/time-series?metric=page_views&period=${period}`, init),
        fetch(`${API_URL}/analytics/conversion-funnel?period=${period}`, init),
        fetch(`${API_URL}/analytics/devices?period=${period}`, init),
        fetch(`${API_URL}/analytics/geographic?period=${period}`, init),
        fetch(`${API_URL}/statistics/packages/views/top?limit=8`, init),
        fetch(`${API_URL}/statistics/packages/cart/top?limit=8`, init),
        fetch(`${API_URL}/analytics/top-pages?period=${period}&limit=8`, init),
      ]);

      if (statsRes.ok) {
        const j = await statsRes.json();
        setDashboardStats(j.data);
      }
      if (prevStatsRes.ok) {
        const j = await prevStatsRes.json();
        setPreviousStats(j.data);
      } else {
        setPreviousStats(null);
      }
      if (sessionsRes.ok) {
        const j = await sessionsRes.json();
        setSessionsTimeSeries(j.data);
      }
      if (pageViewsRes.ok) {
        const j = await pageViewsRes.json();
        setPageViewsTimeSeries(j.data);
      }
      if (funnelRes.ok) {
        const j = await funnelRes.json();
        setConversionFunnel(j.data);
      }
      if (devicesRes.ok) {
        const j = await devicesRes.json();
        setDeviceData(j.data);
      }
      if (geoRes.ok) {
        const j = await geoRes.json();
        setGeographicData(j.data);
      }
      if (topPkgViewsRes.ok) {
        const j = await topPkgViewsRes.json();
        setTopPackagesViews(j.data || []);
      }
      if (topPkgCartRes.ok) {
        const j = await topPkgCartRes.json();
        setTopPackagesCart(j.data || []);
      }
      if (topPagesRes.ok) {
        const j = await topPagesRes.json();
        setTopPages(j.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalyticsData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [period]);

  const periodLabels: Record<Period, string> = {
    '7d': '7 dias',
    '30d': '30 dias',
    '90d': '90 dias',
  };

  const compareLabel = `vs ${periodLabels[period]} anteriores`;

  // Pre-compute changes so MetricsCard JSX stays clean.
  const change = {
    sessions: pctChange(dashboardStats?.total_sessions ?? 0, previousStats?.total_sessions ?? 0),
    pageViews: pctChange(dashboardStats?.total_page_views ?? 0, previousStats?.total_page_views ?? 0),
    avgDuration: pctChange(dashboardStats?.avg_session_duration ?? 0, previousStats?.avg_session_duration ?? 0),
    uniqueVisitors: pctChange(dashboardStats?.unique_visitors ?? 0, previousStats?.unique_visitors ?? 0),
    bounceRate: pctChange(dashboardStats?.bounce_rate ?? 0, previousStats?.bounce_rate ?? 0),
    conversionRate: pctChange(dashboardStats?.conversion_rate ?? 0, previousStats?.conversion_rate ?? 0),
    totalEvents: pctChange(dashboardStats?.total_events ?? 0, previousStats?.total_events ?? 0),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a1410]">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-2xl" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="text-amber-400" size={26} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Live Data</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Análises avançadas e insights em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                onClick={() => fetchAnalyticsData(true)}
                disabled={refreshing}
                className="group p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw size={16} className={`text-gray-400 group-hover:text-white ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>

              {/* Period Selector — pill style */}
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

        {/* Section: Visitor Metrics */}
        <SectionLabel icon={<Users size={14} />} text="Métricas de Visitantes" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Sessões totais"
            value={dashboardStats?.total_sessions || 0}
            change={change.sessions}
            changeLabel={compareLabel}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
            tooltip="Cada visita ao site conta como uma sessão. Uma sessão termina após 30 minutos de inatividade. A mesma pessoa pode ter várias sessões em dias diferentes."
          />
          <MetricsCard
            title="Visualizações de página"
            value={dashboardStats?.total_page_views || 0}
            change={change.pageViews}
            changeLabel={compareLabel}
            icon={<Eye className="w-5 h-5" />}
            loading={loading}
            tooltip="Total de páginas vistas no período. Cada navegação para uma página nova conta. Reloads da mesma página não duplicam o número."
          />
          <MetricsCard
            title="Duração média da sessão"
            value={dashboardStats?.avg_session_duration || 0}
            change={change.avgDuration}
            changeLabel={compareLabel}
            format="duration"
            icon={<Clock className="w-5 h-5" />}
            loading={loading}
            tooltip="Tempo médio que cada visitante passa no site. Bom: acima de 2 min · Atenção: 30s-2min · Crítico: abaixo de 30s. Sessões longas indicam interesse real."
            health={
              dashboardStats && dashboardStats.avg_session_duration > 0
                ? sessionDurationHealth(dashboardStats.avg_session_duration)
                : undefined
            }
          />
          <MetricsCard
            title="Visitantes únicos"
            value={dashboardStats?.unique_visitors || 0}
            change={change.uniqueVisitors}
            changeLabel={compareLabel}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
            tooltip="Número aproximado de pessoas diferentes que visitaram o site. Calculado por sessão — a mesma pessoa em dias diferentes conta separadamente."
          />
        </div>

        {/* Section: Performance Metrics */}
        <SectionLabel icon={<Activity size={14} />} text="Métricas de Performance" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Taxa de rejeição"
            value={dashboardStats?.bounce_rate || 0}
            change={change.bounceRate}
            changeLabel={compareLabel}
            format="percentage"
            icon={<TrendingUp className="w-5 h-5" />}
            loading={loading}
            tooltip="Percentagem de visitantes que viram apenas uma página e saíram. Bom: abaixo de 40% · Atenção: 40-60% · Crítico: acima de 60%. Quanto mais baixa, melhor."
            health={
              dashboardStats && dashboardStats.bounce_rate > 0
                ? bounceRateHealth(dashboardStats.bounce_rate)
                : undefined
            }
            invertTrend
          />
          <MetricsCard
            title="Taxa de conversão"
            value={dashboardStats?.conversion_rate || 0}
            change={change.conversionRate}
            changeLabel={compareLabel}
            format="percentage"
            icon={<ShoppingCart className="w-5 h-5" />}
            loading={loading}
            tooltip="Percentagem de sessões que resultaram em compra. Bom: acima de 2% · Atenção: 0.5-2% · Crítico: abaixo de 0.5%. Para FiveM scripts, 1-3% é normal."
            health={
              dashboardStats && dashboardStats.conversion_rate >= 0
                ? conversionRateHealth(dashboardStats.conversion_rate)
                : undefined
            }
          />
          <MetricsCard
            title="Eventos totais"
            value={dashboardStats?.total_events || 0}
            change={change.totalEvents}
            changeLabel={compareLabel}
            icon={<BarChart3 className="w-5 h-5" />}
            loading={loading}
            tooltip="Soma de todas as ações registadas: cliques, scrolls, vistas de pacote, adições ao carrinho, compras. Reflete a atividade total no site."
          />
        </div>

        {/* Section: Time Series */}
        <SectionLabel icon={<TrendingUp size={14} />} text="Tendências ao Longo do Tempo" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeSeriesChart
            data={sessionsTimeSeries}
            title="Sessões ao longo do tempo"
            color="#facc15"
            loading={loading}
          />
          <TimeSeriesChart
            data={pageViewsTimeSeries}
            title="Visualizações ao longo do tempo"
            color="#3b82f6"
            loading={loading}
          />
        </div>

        {/* Section: Conversion */}
        <SectionLabel icon={<ShoppingCart size={14} />} text="Funil de Conversão" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversionFunnelChart data={conversionFunnel} loading={loading} />
          <TopPackagesChart
            viewsData={topPackagesViews}
            cartData={topPackagesCart}
            loading={loading}
          />
        </div>

        {/* Section: Audience */}
        <SectionLabel icon={<Eye size={14} />} text="Análise de Audiência" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceBreakdownChart data={deviceData} loading={loading} />
          <GeographicChart data={geographicData} loading={loading} />
        </div>

        {/* Section: Engagement — Top Pages */}
        <SectionLabel icon={<FileText size={14} />} text="Páginas Mais Visitadas" />

        <TopPagesChart data={topPages} loading={loading} />
      </div>
    </div>
  );
}

// Section divider with icon
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
