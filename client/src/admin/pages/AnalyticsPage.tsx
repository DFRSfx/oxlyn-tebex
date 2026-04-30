import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, ShoppingCart, TrendingUp, Clock, Activity, RefreshCw } from 'lucide-react';
import { MetricsCard } from '../components/charts/MetricsCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { ConversionFunnelChart } from '../components/charts/ConversionFunnelChart';
import { DeviceBreakdownChart } from '../components/charts/DeviceBreakdownChart';
import { GeographicChart } from '../components/charts/GeographicChart';
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Chart data
  const [sessionsTimeSeries, setSessionsTimeSeries] = useState<any[]>([]);
  const [pageViewsTimeSeries, setPageViewsTimeSeries] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);

  // Fetch all analytics data
  const fetchAnalyticsData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      const credentials = 'include' as RequestCredentials;

      // Fetch dashboard stats
      const statsRes = await fetch(
        `${API_URL}/analytics/dashboard-stats?period=${period}`,
        { headers, credentials }
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDashboardStats(statsData.data);
      }

      // Fetch time-series for sessions
      const sessionsRes = await fetch(
        `${API_URL}/analytics/time-series?metric=sessions&period=${period}`,
        { headers, credentials }
      );
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessionsTimeSeries(sessionsData.data);
      }

      // Fetch time-series for page views
      const pageViewsRes = await fetch(
        `${API_URL}/analytics/time-series?metric=page_views&period=${period}`,
        { headers, credentials }
      );
      if (pageViewsRes.ok) {
        const pageViewsData = await pageViewsRes.json();
        setPageViewsTimeSeries(pageViewsData.data);
      }

      // Fetch conversion funnel
      const funnelRes = await fetch(
        `${API_URL}/analytics/conversion-funnel?period=${period}`,
        { headers, credentials }
      );
      if (funnelRes.ok) {
        const funnelData = await funnelRes.json();
        setConversionFunnel(funnelData.data);
      }

      // Fetch device breakdown
      const devicesRes = await fetch(
        `${API_URL}/analytics/devices?period=${period}`,
        { headers, credentials }
      );
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDeviceData(devicesData.data);
      }

      // Fetch geographic data
      const geoRes = await fetch(
        `${API_URL}/analytics/geographic?period=${period}`,
        { headers, credentials }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        setGeographicData(geoData.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on mount and when period changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, 60000);

    return () => clearInterval(interval);
  }, [period]);

  const periodLabels: Record<Period, string> = {
    '7d': '7 dias',
    '30d': '30 dias',
    '90d': '90 dias',
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
            title="Total Sessions"
            value={dashboardStats?.total_sessions || 0}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
          />
          <MetricsCard
            title="Page Views"
            value={dashboardStats?.total_page_views || 0}
            icon={<Eye className="w-5 h-5" />}
            loading={loading}
          />
          <MetricsCard
            title="Avg Session Duration"
            value={dashboardStats?.avg_session_duration || 0}
            format="duration"
            icon={<Clock className="w-5 h-5" />}
            loading={loading}
          />
          <MetricsCard
            title="Unique Visitors"
            value={dashboardStats?.unique_visitors || 0}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
          />
        </div>

        {/* Section: Performance Metrics */}
        <SectionLabel icon={<Activity size={14} />} text="Métricas de Performance" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Bounce Rate"
            value={dashboardStats?.bounce_rate || 0}
            format="percentage"
            icon={<TrendingUp className="w-5 h-5" />}
            loading={loading}
          />
          <MetricsCard
            title="Conversion Rate"
            value={dashboardStats?.conversion_rate || 0}
            format="percentage"
            icon={<ShoppingCart className="w-5 h-5" />}
            loading={loading}
          />
          <MetricsCard
            title="Total Events"
            value={dashboardStats?.total_events || 0}
            icon={<BarChart3 className="w-5 h-5" />}
            loading={loading}
          />
        </div>

        {/* Section: Time Series */}
        <SectionLabel icon={<TrendingUp size={14} />} text="Tendências ao Longo do Tempo" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeSeriesChart
            data={sessionsTimeSeries}
            title="Sessions Over Time"
            color="#facc15"
            loading={loading}
          />
          <TimeSeriesChart
            data={pageViewsTimeSeries}
            title="Page Views Over Time"
            color="#3b82f6"
            loading={loading}
          />
        </div>

        {/* Section: Conversion */}
        <SectionLabel icon={<ShoppingCart size={14} />} text="Funil de Conversão" />

        <ConversionFunnelChart data={conversionFunnel} loading={loading} />

        {/* Section: Audience */}
        <SectionLabel icon={<Eye size={14} />} text="Análise de Audiência" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceBreakdownChart data={deviceData} loading={loading} />
          <GeographicChart data={geographicData} loading={loading} />
        </div>
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