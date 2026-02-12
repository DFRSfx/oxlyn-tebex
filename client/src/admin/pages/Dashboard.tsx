import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, ShoppingCart, Users, TrendingUp } from 'lucide-react';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-6">
        <div className="flex items-center gap-3">
          {user?.discordAvatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`}
              alt={user.discordUsername}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
              <span className="text-amber-500 text-lg font-semibold">
                {user?.discordUsername?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-white">Bem-vindo de volta, {user?.discordUsername || user?.email}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Aqui está uma visão geral rápida da atividade da sua loja</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Download Users */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Utilizadores Downloads</p>
                <p className="text-2xl font-semibold text-white">
                  {downloadUsersCount}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Contas criadas
                </p>
              </div>
              <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users className="text-purple-400" size={18} />
              </div>
            </div>
          </div>

          {/* Login Activity */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Atividade de Logins</p>
                <p className="text-2xl font-semibold text-white">
                  {loginStats.length}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {loginStats.filter(s => s.discord_id).length} Discord • {loginStats.filter(s => s.cfx_identifier).length} CFX
                </p>
              </div>
              <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Users className="text-indigo-400" size={18} />
              </div>
            </div>
          </div>

          {/* Package Views */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Visualizações de Pacotes</p>
                <p className="text-2xl font-semibold text-white">
                  {statistics.total_package_views}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {statistics.unique_packages_viewed} pacotes únicos
                </p>
              </div>
              <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Eye className="text-blue-400" size={18} />
              </div>
            </div>
          </div>

          {/* Cart Additions */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Adições ao Carrinho</p>
                <p className="text-2xl font-semibold text-white">
                  {statistics.total_cart_additions}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {statistics.unique_packages_in_cart} pacotes únicos
                </p>
              </div>
              <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-amber-400" size={18} />
              </div>
            </div>
          </div>

          {/* Engagement Rate */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Engajamento</p>
                <p className="text-2xl font-semibold text-white">
                  {statistics.total_package_views > 0
                    ? ((statistics.total_cart_additions / statistics.total_package_views) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Razão Carrinho / Visualizações</p>
              </div>
              <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={18} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Packages */}
        <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Eye size={16} />
              Pacotes Principais por Visualizações
            </h2>
          </div>
          {topPackages.length > 0 ? (
            <div className="divide-y divide-white/5">
              {topPackages.map((pkg, index) => (
                <div key={index} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white truncate">{pkg.package_name}</p>
                      <p className="text-xs text-gray-500">
                        {pkg.cart_count} no carrinho • {pkg.view_count} visualizações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-400">{pkg.view_count}</p>
                    <p className="text-xs text-gray-500">visualizações</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Nenhum dado de pacote ainda
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Ações Rápidas</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link
              to="/admin/estatisticas"
              className="block p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 hover:border-white/10 transition-all"
            >
              <p className="text-sm font-medium text-white">Ver Estatísticas Completas</p>
              <p className="text-xs text-gray-500 mt-0.5">Análise detalhada</p>
            </Link>
            <Link
              to="/admin/compras"
              className="block p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 hover:border-white/10 transition-all"
            >
              <p className="text-sm font-medium text-white">Ver Todos os Pedidos</p>
              <p className="text-xs text-gray-500 mt-0.5">Compras recentes</p>
            </Link>
            <Link
              to="/admin/downloads"
              className="block p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 hover:border-white/10 transition-all"
            >
              <p className="text-sm font-medium text-white">Gerir Downloads</p>
              <p className="text-xs text-gray-500 mt-0.5">Tokens de download</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Pedidos Recentes</h2>
          </div>
          <div className="divide-y divide-white/5">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{order.product_name}</p>
                  <p className="text-xs text-gray-500">
                    Pedido #{order.id} • {new Date(order.created_at).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">€{order.price.toFixed(2)}</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${
                    order.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {order.status === 'completed' ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-white/5 border-t border-white/5">
            <Link to="/admin/compras" className="text-xs text-amber-500 hover:text-amber-400 font-medium">
              Ver todos os pedidos →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
