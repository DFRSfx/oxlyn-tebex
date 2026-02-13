import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, ShoppingCart, TrendingUp, Clock } from 'lucide-react';
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

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Chart data
  const [sessionsTimeSeries, setSessionsTimeSeries] = useState<any[]>([]);
  const [pageViewsTimeSeries, setPageViewsTimeSeries] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);

  // Fetch all analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
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
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-amber-500" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Advanced analytics and insights</p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-[#0f0f0f] border border-white/5 rounded-lg p-1">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Cards */}
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

        {/* Key Metrics Row */}
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

        {/* Time Series Charts */}
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

        {/* Conversion Funnel */}
        <ConversionFunnelChart data={conversionFunnel} loading={loading} />

        {/* Device & Geographic */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceBreakdownChart data={deviceData} loading={loading} />
          <GeographicChart data={geographicData} loading={loading} />
        </div>
      </div>
    </div>
  );
}
