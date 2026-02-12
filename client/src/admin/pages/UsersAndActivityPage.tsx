import { useState, useEffect } from 'react';
import { Users, Activity } from 'lucide-react';
import { API_URL } from '../../config/api';

interface DownloadUser {
  id: number;
  email: string;
  role: string;
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  created_at: string;
  updated_at: string;
}

interface LoginStat {
  id: number;
  discord_id?: string;
  cfx_identifier?: string;
  login_type: string;
  last_login_at: string;
  login_count: number;
}

export default function UsersAndActivityPage() {
  const [downloadUsers, setDownloadUsers] = useState<DownloadUser[]>([]);
  const [loginStats, setLoginStats] = useState<LoginStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'activity'>('users');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/auth/admin/download-users`, { credentials: 'include' }),
        fetch(`${API_URL}/auth/admin/login-stats`, { credentials: 'include' })
      ]);

      if (usersRes.ok) {
        const userData = await usersRes.json();
        setDownloadUsers(userData.users || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setLoginStats(statsData.stats || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <Users className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Utilizadores e Atividade</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestão de utilizadores que transferem ficheiros e atividade de logins</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'users'
              ? 'text-amber-500 border-amber-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Users className="inline mr-2" size={18} />
          Utilizadores Downloads ({downloadUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'activity'
              ? 'text-amber-500 border-amber-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Activity className="inline mr-2" size={18} />
          Atividade de Logins ({loginStats.length})
        </button>
      </div>

      {/* Download Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Utilizadores que Transferem Ficheiros</h2>
            <p className="text-xs text-gray-500 mt-1">Pessoas que reivindicaram tokens de transferência</p>
          </div>

          {downloadUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum utilizador de transferência encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Utilizador</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Discord</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Função</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Criado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {downloadUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {user.discord_avatar ? (
                            <img
                              src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`}
                              alt={user.discord_username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white font-semibold">{user.email.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-400">{user.discord_username || '-'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role === 'admin' ? 'Administrador' : 'Utilizador'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-400">
                          {new Date(user.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Login Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Atividade de Logins</h2>
            <p className="text-xs text-gray-500 mt-1">Rastreamento de todos os logins (Discord e CFX)</p>
          </div>

          {loginStats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma atividade de login registrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo de Login</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Discord ID / CFX ID</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Contagem</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Último Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loginStats.map((stat) => (
                    <tr key={stat.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {stat.discord_id && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-500/20 text-indigo-400">
                              Discord
                            </span>
                          )}
                          {stat.cfx_identifier && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                              CFX/FiveM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-gray-300 font-mono space-y-1">
                          {stat.discord_id && <div>Discord: {stat.discord_id}</div>}
                          {stat.cfx_identifier && <div>CFX: {stat.cfx_identifier}</div>}
                          {!stat.discord_id && !stat.cfx_identifier && <div>-</div>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-semibold text-white">{stat.login_count}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-400">
                          {new Date(stat.last_login_at).toLocaleDateString('pt-PT')} {new Date(stat.last_login_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchData}
        className="w-full py-2 px-4 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
      >
        Atualizar Dados
      </button>
    </div>
  );
}
