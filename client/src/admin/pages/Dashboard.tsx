import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, ShoppingCart, Users, TrendingUp, ArrowRight, BarChart3, Package as PackageIcon, Download } from 'lucide-react';
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

interface PackageStat {
  package_name: string;
  view_count: number;
  cart_count: number;
}

interface Order {
  id: number;
  discord_user_id: string;
  product_name: string;
  price: number;
  status: string;
  created_at: string;
}

interface LoginStat {
  id: number;
  discord_id?: string;
  cfx_identifier?: string;
  login_type: string;
  last_login_at: string;
  login_count: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<StatisticsSummary | null>(null);
  const [downloadUsersCount, setDownloadUsersCount] = useState(0);
  const [loginStats, setLoginStats] = useState<LoginStat[]>([]);
  const [topPackages, setTopPackages] = useState<PackageStat[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch download users count
      const usersRes = await fetch(`${API_URL}/auth/admin/download-users`, {
        credentials: 'include',
      });

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setDownloadUsersCount(usersData.total || 0);
      }

      // Fetch login statistics
      const statsRes = await fetch(`${API_URL}/auth/admin/login-stats`, {
        credentials: 'include',
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setLoginStats(statsData.stats || []);
      }

      // Fetch statistics summary
      const summaryRes = await fetch(`${API_URL}/statistics/summary`, {
        credentials: 'include',
      });

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setStatistics(summaryData.data);
      }

      // Fetch top packages by views
      const packagesRes = await fetch(`${API_URL}/statistics/packages/views/top?limit=5`, {
        credentials: 'include',
      });

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setTopPackages(packagesData.data || []);
      }

      // Fetch recent orders
      const ordersRes = await fetch(`${API_URL}/orders/list`, {
        credentials: 'include',
      });

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders((ordersData.orders || []).slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  const engagementRate = statistics && statistics.total_package_views > 0
    ? ((statistics.total_cart_additions / statistics.total_package_views) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header — premium gradient card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a1410]">
        {/* Decorative gradient orb */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 flex items-center gap-4">
          {user?.discordAvatar ? (
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
              <img
                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`}
                alt={user.discordUsername}
                className="relative w-14 h-14 rounded-full ring-2 ring-amber-500/30"
              />
            </div>
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-white text-lg font-bold">
                {user?.discordUsername?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Online</span>
            </div>
            <h1 className="text-xl font-bold text-white truncate">
              Bem-vindo de volta, <span className="text-amber-400">{user?.discordUsername || user?.email}</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Aqui está uma visão geral rápida da atividade da tua loja</p>
          </div>
        </div>
      </div>

      {/* Key Metrics — Enhanced cards with gradients */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Download Users */}
          <MetricCard
            label="Utilizadores Downloads"
            value={downloadUsersCount}
            sublabel="Contas criadas"
            icon={<Users size={20} />}
            color="purple"
          />

          {/* Login Activity */}
          <MetricCard
            label="Atividade de Logins"
            value={loginStats.length}
            sublabel={`${loginStats.filter(s => s.discord_id).length} Discord • ${loginStats.filter(s => s.cfx_identifier).length} CFX`}
            icon={<Users size={20} />}
            color="indigo"
          />

          {/* Package Views */}
          <MetricCard
            label="Visualizações de Pacotes"
            value={statistics.total_package_views}
            sublabel={`${statistics.unique_packages_viewed} pacotes únicos`}
            icon={<Eye size={20} />}
            color="blue"
          />

          {/* Cart Additions */}
          <MetricCard
            label="Adições ao Carrinho"
            value={statistics.total_cart_additions}
            sublabel={`${statistics.unique_packages_in_cart} pacotes únicos`}
            icon={<ShoppingCart size={20} />}
            color="amber"
          />
        </div>
      )}

      {/* Engagement Highlight Bar */}
      {statistics && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.1),transparent_50%)] pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={22} />
              </div>
              <div>
                <p className="text-xs text-emerald-400/80 font-semibold uppercase tracking-wider mb-0.5">Taxa de Engajamento</p>
                <p className="text-sm text-gray-300">Razão Carrinho / Visualizações</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">
                {engagementRate.toFixed(1)}<span className="text-emerald-400 text-2xl">%</span>
              </p>
              <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(engagementRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Packages */}
        <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Eye className="text-blue-400" size={14} />
              </div>
              Pacotes Principais por Visualizações
            </h2>
            <Link to="/admin/estatisticas" className="text-xs text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          {topPackages.length > 0 ? (
            <div className="divide-y divide-white/5">
              {topPackages.map((pkg, index) => {
                const maxViews = topPackages[0]?.view_count || 1;
                const percentage = (pkg.view_count / maxViews) * 100;
                return (
                  <div key={index} className="group relative p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-7 h-7 text-xs font-bold rounded-lg ${
                        index === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-orange-700/20 text-orange-400' :
                        'bg-white/5 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-amber-400 transition-colors">{pkg.package_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {pkg.cart_count} no carrinho
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-400">{pkg.view_count}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">views</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 ml-10 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500/60 to-blue-400 rounded-full transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<PackageIcon className="w-10 h-10 text-gray-600" />}
              text="Nenhum dado de pacote ainda"
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Ações Rápidas</h2>
          </div>
          <div className="p-3 space-y-2">
            <QuickActionLink
              to="/admin/estatisticas"
              icon={<BarChart3 size={16} />}
              title="Ver Estatísticas Completas"
              subtitle="Análise detalhada"
              color="cyan"
            />
            <QuickActionLink
              to="/admin/compras"
              icon={<ShoppingCart size={16} />}
              title="Ver Todos os Pedidos"
              subtitle="Compras recentes"
              color="amber"
            />
            <QuickActionLink
              to="/admin/downloads"
              icon={<Download size={16} />}
              title="Gerir Downloads"
              subtitle="Tokens de download"
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-amber-400" size={14} />
              </div>
              Pedidos Recentes
            </h2>
            <Link to="/admin/compras" className="text-xs text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentOrders.map((order) => (
              <div key={order.id} className="group p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-amber-500/10">
                    <PackageIcon className="text-amber-400" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-amber-400 transition-colors">{order.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pedido #{order.id} • {new Date(order.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">€{Number(order.price).toFixed(2)}</p>
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mt-1 ${
                    order.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20'
                  }`}>
                    {order.status === 'completed' ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Helper Components ============

interface MetricCardProps {
  label: string;
  value: number | string;
  sublabel: string;
  icon: React.ReactNode;
  color: 'purple' | 'indigo' | 'blue' | 'amber' | 'emerald';
}

function MetricCard({ label, value, sublabel, icon, color }: MetricCardProps) {
  const colorMap = {
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/10', border: 'group-hover:border-purple-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'group-hover:shadow-indigo-500/10', border: 'group-hover:border-indigo-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/10', border: 'group-hover:border-blue-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'group-hover:shadow-amber-500/10', border: 'group-hover:border-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/10', border: 'group-hover:border-emerald-500/20' },
  };
  const c = colorMap[color];

  return (
    <div className={`group relative bg-[#0f0f0f] border border-white/5 ${c.border} p-5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${c.glow} overflow-hidden`}>
      {/* Decorative corner glow */}
      <div className={`absolute -top-12 -right-12 w-24 h-24 ${c.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-2">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('pt-PT') : value}
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

interface QuickActionLinkProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: 'cyan' | 'amber' | 'purple';
}

function QuickActionLink({ to, icon, title, subtitle, color }: QuickActionLinkProps) {
  const colorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <Link
      to={to}
      className="group flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/5 hover:border-white/10 transition-all"
    >
      <div className={`w-9 h-9 ${colorMap[color]} rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-amber-400 transition-colors">{title}</p>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
      <ArrowRight size={14} className="text-gray-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/[0.02] rounded-2xl mb-3">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}