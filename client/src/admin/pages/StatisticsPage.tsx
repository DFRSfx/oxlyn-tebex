import { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, ShoppingCart, TrendingUp } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
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
          <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
            <BarChart3 className="text-cyan-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Estatísticas</h1>
            <p className="text-sm text-gray-500 mt-0.5">Análise detalhada da atividade dos utilizadores e envolvimento com pacotes</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Discord Logins */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Logins Discord</p>
                <p className="text-2xl font-semibold text-white">
                  {summary.unique_discord_logins}
                </p>
                <p className="text-xs text-gray-600 mt-2">Utilizadores únicos</p>
              </div>
              <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Users className="text-indigo-400" size={18} />
              </div>
            </div>
          </div>

          {/* CFX Logins */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Logins CFX</p>
                <p className="text-2xl font-semibold text-white">
                  {summary.unique_cfx_logins}
                </p>
                <p className="text-xs text-gray-600 mt-2">Utilizadores únicos</p>
              </div>
              <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Users className="text-emerald-400" size={18} />
              </div>
            </div>
          </div>

          {/* Package Views */}
          <div className="bg-[#0f0f0f] border border-white/5 p-5 rounded-lg hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Visualizações de Pacotes</p>
                <p className="text-2xl font-semibold text-white">
                  {summary.total_package_views}
                </p>
                <p className="text-xs text-gray-600 mt-2">{summary.unique_packages_viewed} pacotes únicos</p>
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
                  {summary.total_cart_additions}
                </p>
                <p className="text-xs text-gray-600 mt-2">{summary.unique_packages_in_cart} pacotes únicos</p>
              </div>
              <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-amber-400" size={18} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Details */}
      {loginStats.length > 0 && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users size={16} />
              Estatísticas de Logins
            </h2>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {loginStats.map((stat) => (
                <div key={stat.login_type} className="p-4 bg-white/5 border border-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded uppercase">
                        {stat.login_type}
                      </span>
                      <p className="text-sm text-white font-medium">
                        {stat.unique_count} utilizadores {stat.login_type === 'discord' ? 'Discord' : 'CFX'} únicos
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total de Logins</p>
                      <p className="text-lg font-semibold text-white">{stat.total_logins}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Último Login</p>
                      <p className="text-sm text-gray-400">
                        {new Date(stat.last_login).toLocaleDateString('pt-PT')} {new Date(stat.last_login).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
        {/* Top by Views */}
        {topByViews.length > 0 && (
          <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye size={16} />
                Pacotes Principais por Visualizações
              </h2>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {topByViews.slice(0, 5).map((pkg, index) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">
                        {index + 1}
                      </span>
                      <p className="text-sm text-white font-medium truncate">{pkg.package_name}</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-400">{pkg.view_count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top by Cart */}
        {topByCart.length > 0 && (
          <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart size={16} />
                Pacotes Principais por Adições ao Carrinho
              </h2>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {topByCart.slice(0, 5).map((pkg, index) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded">
                        {index + 1}
                      </span>
                      <p className="text-sm text-white font-medium truncate">{pkg.package_name}</p>
                    </div>
                    <p className="text-sm font-semibold text-amber-400">{pkg.cart_count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All Packages Stats */}
      {packageStats.length > 0 && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} />
              Estatísticas de Todos os Pacotes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome do Pacote</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Visualizações</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Adições ao Carrinho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {packageStats.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-sm text-white font-medium">{pkg.package_name}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded">
                        {pkg.view_count}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded">
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

      {/* Refresh Button */}
      <button
        onClick={fetchStatistics}
        className="w-full py-2 px-4 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
      >
        Atualizar Estatísticas
      </button>
    </div>
  );
}
