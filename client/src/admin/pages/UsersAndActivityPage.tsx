import { useState, useEffect } from 'react';
import { Users, Activity, RefreshCw, UserCircle, Shield } from 'lucide-react';
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
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'activity'>('users');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#150f1a]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-center">
                <Users className="text-purple-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Utilizadores e Atividade</h1>
              <p className="text-sm text-gray-400 mt-0.5">Gestão de utilizadores e atividade de logins</p>
            </div>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="group p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={`text-gray-400 group-hover:text-white ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      {/* Refined Tabs */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`relative px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={16} />
          Downloads
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
          }`}>
            {downloadUsers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`relative px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeTab === 'activity'
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity size={16} />
          Atividade de Logins
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            activeTab === 'activity' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
          }`}>
            {loginStats.length}
          </span>
        </button>
      </div>

      {/* Download Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <UserCircle className="text-purple-400" size={14} />
              </div>
              Utilizadores que Transferem Ficheiros
            </h2>
            <p className="text-xs text-gray-500 mt-1 ml-9">Pessoas que reivindicaram tokens de transferência</p>
          </div>

          {downloadUsers.length === 0 ? (
            <EmptyTabState
              icon={<UserCircle className="w-10 h-10 text-gray-500" />}
              text="Nenhum utilizador de transferência encontrado"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Utilizador</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Discord</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Função</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Criado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {downloadUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {user.discord_avatar ? (
                            <div className="relative">
                              <img
                                src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`}
                                alt={user.discord_username}
                                className="w-9 h-9 rounded-full ring-2 ring-white/10 group-hover:ring-amber-500/30 transition-all"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center ring-2 ring-white/10">
                              <span className="text-xs text-white font-bold">{user.email.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-300">{user.discord_username || <span className="text-gray-600">—</span>}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ring-1 ${
                          user.role === 'admin'
                            ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                        }`}>
                          {user.role === 'admin' && <Shield size={10} />}
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
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Activity className="text-emerald-400" size={14} />
              </div>
              Atividade de Logins
            </h2>
            <p className="text-xs text-gray-500 mt-1 ml-9">Rastreamento de todos os logins (Discord e CFX)</p>
          </div>

          {loginStats.length === 0 ? (
            <EmptyTabState
              icon={<Activity className="w-10 h-10 text-gray-500" />}
              text="Nenhuma atividade de login registrada"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Tipo</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Identificador</th>
                    <th className="px-5 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Logins</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Último Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loginStats.map((stat) => (
                    <tr key={stat.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {stat.discord_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                              Discord
                            </span>
                          )}
                          {stat.cfx_identifier && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                              CFX/FiveM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-gray-300 font-mono space-y-1">
                          {stat.discord_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-indigo-400 uppercase tracking-wider">DC:</span>
                              <span>{stat.discord_id}</span>
                            </div>
                          )}
                          {stat.cfx_identifier && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-400 uppercase tracking-wider">CFX:</span>
                              <span>{stat.cfx_identifier}</span>
                            </div>
                          )}
                          {!stat.discord_id && !stat.cfx_identifier && <span className="text-gray-600">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-md ring-1 ring-amber-500/20">
                          {stat.login_count}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-400">
                          {new Date(stat.last_login_at).toLocaleDateString('pt-PT')}
                          <span className="text-gray-600 ml-1">
                            {new Date(stat.last_login_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
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
    </div>
  );
}

function EmptyTabState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/[0.02] border border-white/5 rounded-2xl mb-3">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}