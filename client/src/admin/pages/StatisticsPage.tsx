import { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, ShoppingCart, TrendingUp, RefreshCw, Trophy, Medal, Award } from 'lucide-react';
import { API_URL } from '../../config/api';

interface StatisticsSummary {
  unique_discord_logins: number;
  unique_cfx_logins: number;
  total_logins: number;
  total_package_views: number;
  total_cart_additions: number;
  unique_packages_viewed: number;
  unique_packages_in_cart: number;
}

interface LoginStats {
  login_type: string;
  unique_count: number;
  total_logins: number;
  last_login: string;
}

interface PackageStats {
  id: number;
  package_name: string;
  view_count: number;
  cart_count: number;
}

export default function StatisticsPage() {
  const [summary, setSummary] = useState<StatisticsSummary | null>(null);
  const [loginStats, setLoginStats] = useState<LoginStats[]>([]);
  const [packageStats, setPackageStats] = useState<PackageStats[]>([]);
  const [topByViews, setTopByViews] = useState<PackageStats[]>([]);
  const [topByCart, setTopByCart] = useState<PackageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [summaryRes, loginsRes, packagesRes, viewsRes, cartRes] = await Promise.all([
        fetch(`${API_URL}/statistics/summary`, { credentials: 'include' }),
        fetch(`${API_URL}/statistics/logins`, { credentials: 'include' }),
        fetch(`${API_URL}/statistics/packages`, { credentials: 'include' }),
        fetch(`${API_URL}/statistics/packages/views/top?limit=10`, { credentials: 'include' }),
        fetch(`${API_URL}/statistics/packages/cart/top?limit=10`, { credentials: 'include' }),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.data);
      }

      if (loginsRes.ok) {
        const data = await loginsRes.json();
        setLoginStats(data.data || []);
      }

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackageStats(data.data || []);
      }

      if (viewsRes.ok) {
        const data = await viewsRes.json();
        setTopByViews(data.data || []);
      }

      if (cartRes.ok) {
        const data = await cartRes.json();
        setTopByCart(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
          <div className="relative animate-spin rounded-full h-12 w-12 border-2 border-amber-500/20 border-t-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#0c1518]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="text-cyan-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Estatísticas</h1>
              <p className="text-sm text-gray-400 mt-0.5">Análise detalhada da atividade dos utilizadores e envolvimento com pacotes</p>
            </div>
          </div>

          <button
            onClick={() => fetchStatistics(true)}
            disabled={refreshing}
            className="group relative overflow-hidden px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            {refreshing ? 'A atualizar...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Logins Discord"
            value={summary.unique_discord_logins}
            sublabel="Utilizadores únicos"
            icon={<Users size={20} />}
            color="indigo"
          />
          <StatCard
            label="Logins CFX"
            value={summary.unique_cfx_logins}
            sublabel="Utilizadores únicos"
            icon={<Users size={20} />}
            color="emerald"
          />
          <StatCard
            label="Visualizações de Pacotes"
            value={summary.total_package_views}
            sublabel={`${summary.unique_packages_viewed} pacotes únicos`}
            icon={<Eye size={20} />}
            color="blue"
          />
          <StatCard
            label="Adições ao Carrinho"
            value={summary.total_cart_additions}
            sublabel={`${summary.unique_packages_in_cart} pacotes únicos`}
            icon={<ShoppingCart size={20} />}
            color="amber"
          />
        </div>
      )}

      {/* Login Details */}
      {loginStats.length > 0 && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Users className="text-amber-400" size={14} />
              </div>
              Estatísticas de Logins
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loginStats.map((stat) => (
                <div
                  key={stat.login_type}
                  className="group relative p-4 bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 rounded-xl hover:border-white/10 transition-all overflow-hidden"
                >
                  <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    stat.login_type === 'discord' ? 'bg-indigo-500/10' : 'bg-emerald-500/10'
                  }`} />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${
                        stat.login_type === 'discord'
                          ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      }`}>
                        {stat.login_type}
                      </span>
                      <span className="text-2xl font-bold text-white">{stat.unique_count}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Utilizadores {stat.login_type === 'discord' ? 'Discord' : 'CFX'} únicos
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Logins</p>
                        <p className="text-base font-semibold text-white">{stat.total_logins}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Último Login</p>
                        <p className="text-xs text-gray-300">
                          {new Date(stat.last_login).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {topByViews.length > 0 && (
          <TopList
            title="Pacotes Principais por Visualizações"
            icon={<Eye size={14} />}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-400"
            items={topByViews.slice(0, 5)}
            valueKey="view_count"
            valueColor="text-blue-400"
            barColor="from-blue-500/60 to-blue-400"
          />
        )}

        {topByCart.length > 0 && (
          <TopList
            title="Pacotes Principais por Adições ao Carrinho"
            icon={<ShoppingCart size={14} />}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
            items={topByCart.slice(0, 5)}
            valueKey="cart_count"
            valueColor="text-amber-400"
            barColor="from-amber-500/60 to-amber-400"
          />
        )}
      </div>

      {/* All Packages Stats */}
      {packageStats.length > 0 && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={14} />
              </div>
              Estatísticas de Todos os Pacotes
              <span className="ml-auto text-[10px] text-gray-500 uppercase tracking-wider font-normal">{packageStats.length} pacotes</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Nome do Pacote</th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Visualizações</th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Adições ao Carrinho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {packageStats.map((pkg) => (
                  <tr key={pkg.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-sm text-white font-medium group-hover:text-amber-400 transition-colors">{pkg.package_name}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-md ring-1 ring-blue-500/20">
                        {pkg.view_count}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-md ring-1 ring-amber-500/20">
                        {pkg.cart_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Helper Components ============

interface StatCardProps {
  label: string;
  value: number;
  sublabel: string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'blue' | 'amber';
}

function StatCard({ label, value, sublabel, icon, color }: StatCardProps) {
  const colorMap = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'group-hover:border-indigo-500/20', glow: 'group-hover:shadow-indigo-500/10' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'group-hover:border-emerald-500/20', glow: 'group-hover:shadow-emerald-500/10' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'group-hover:border-blue-500/20', glow: 'group-hover:shadow-blue-500/10' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'group-hover:border-amber-500/20', glow: 'group-hover:shadow-amber-500/10' },
  };
  const c = colorMap[color];

  return (
    <div className={`group relative bg-[#0f0f0f] border border-white/5 ${c.border} p-5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${c.glow} overflow-hidden`}>
      <div className={`absolute -top-12 -right-12 w-24 h-24 ${c.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-2">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {value.toLocaleString('pt-PT')}
          </p>
          <p className="text-xs text-gray-500 mt-1.5 truncate">{sublabel}</p>
        </div>
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.text} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface TopListProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  items: PackageStats[];
  valueKey: 'view_count' | 'cart_count';
  valueColor: string;
  barColor: string;
}

function TopList({ title, icon, iconBg, iconColor, items, valueKey, valueColor, barColor }: TopListProps) {
  const maxValue = items[0]?.[valueKey] || 1;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={12} className="text-amber-400" />;
    if (index === 1) return <Medal size={12} className="text-gray-300" />;
    if (index === 2) return <Award size={12} className="text-orange-400" />;
    return null;
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
      <div className="px-5 py-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
          {title}
        </h2>
      </div>
      <div className="p-3 space-y-1">
        {items.map((pkg, index) => {
          const percentage = (pkg[valueKey] / maxValue) * 100;
          return (
            <div key={pkg.id} className="group p-3 hover:bg-white/[0.02] rounded-lg transition-colors">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`flex items-center gap-1 justify-center w-7 h-7 text-xs font-bold rounded-lg flex-shrink-0 ${
                    index === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' :
                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                    index === 2 ? 'bg-orange-700/20 text-orange-400' :
                    'bg-white/5 text-gray-500'
                  }`}>
                    {getRankIcon(index) || (index + 1)}
                  </div>
                  <p className="text-sm text-white font-medium truncate group-hover:text-amber-400 transition-colors">{pkg.package_name}</p>
                </div>
                <p className={`text-sm font-bold ${valueColor} flex-shrink-0`}>{pkg[valueKey]}</p>
              </div>
              <div className="ml-10 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}