import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Check, Copy, Download, KeyRound } from 'lucide-react';
import CreateTokenModal from '../components/CreateTokenModal';
import ConfirmModal from '../../components/ConfirmModal';
import { API_URL } from '../../config/api';

interface DownloadToken {
  id: number;
  token: string;
  discord_user_id: string;
  file_name: string;
  max_downloads: number;
  remaining_downloads: number;
  is_claimed: boolean;
  created_at: string;
  claimed_at?: string;
}

export default function DownloadTokensManager() {
  const [tokens, setTokens] = useState<DownloadToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null }>({
    show: false,
    id: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/downloads/admin/list`, {
        credentials: 'include',
      });
      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/downloads/admin/${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchTokens();
        setDeleteConfirm({ show: false, id: null });
      } else {
        alert('Falha ao eliminar token');
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      alert('Falha ao eliminar token');
    } finally {
      setDeleting(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
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

  // Stats
  const claimedCount = tokens.filter(t => t.is_claimed).length;
  const pendingCount = tokens.length - claimedCount;

  return (
    <div className="space-y-6">
      {/* Premium Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a1410]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                <KeyRound className="text-amber-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tokens de Download</h1>
              <p className="text-sm text-gray-400 mt-0.5">Gerir tokens de download protegidos para utilizadores</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <Plus size={18} className="relative" />
            <span className="relative">Criar Token</span>
          </button>
        </div>

        {/* Quick stats bar */}
        {tokens.length > 0 && (
          <div className="relative px-6 pb-5 grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Total</p>
              <p className="text-xl font-bold text-white">{tokens.length}</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold mb-1">Reivindicados</p>
              <p className="text-xl font-bold text-emerald-400">{claimedCount}</p>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3">
              <p className="text-[10px] text-yellow-400/80 uppercase tracking-widest font-semibold mb-1">Pendentes</p>
              <p className="text-xl font-bold text-yellow-400">{pendingCount}</p>
            </div>
          </div>
        )}
      </div>

      {tokens.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05),transparent_70%)]" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl mb-5">
              <Download className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum Token Ainda</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Crie o seu primeiro token de download para começar a fornecer ficheiros protegidos aos seus utilizadores
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02]"
            >
              <Plus size={18} />
              Criar Primeiro Token
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Token</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Discord ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Ficheiro</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Downloads</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Estado</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Criado</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tokens.map((token) => {
                  const usedDownloads = token.max_downloads - token.remaining_downloads;
                  const usagePercent = (usedDownloads / token.max_downloads) * 100;
                  return (
                    <tr key={token.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyToken(token.token)}
                          className="group/copy flex items-center gap-2 text-amber-500 hover:text-amber-400 font-mono text-sm transition-all"
                          title="Clique para copiar"
                        >
                          <span className="px-2 py-1 bg-amber-500/5 border border-amber-500/10 rounded-md group-hover/copy:bg-amber-500/10 group-hover/copy:border-amber-500/20 transition-all">
                            {token.token.substring(0, 16)}...
                          </span>
                          {copiedToken === token.token ? (
                            <Check size={14} className="text-emerald-400 animate-in fade-in zoom-in duration-200" />
                          ) : (
                            <Copy size={14} className="opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm font-mono">
                        {token.discord_user_id}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-500 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{token.file_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{token.remaining_downloads}</span>
                            <span className="text-gray-500">/</span>
                            <span className="text-gray-400">{token.max_downloads}</span>
                          </div>
                          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                usagePercent >= 100 ? 'bg-red-500' :
                                usagePercent >= 75 ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {token.is_claimed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-semibold ring-1 ring-emerald-500/20">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            Reivindicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-md text-xs font-semibold ring-1 ring-yellow-500/20">
                            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(token.created_at).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteClick(token.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Eliminar token"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateTokenModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTokens();
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Token"
        message="Tem certeza que deseja eliminar este token? Esta ação não pode ser desfeita e o utilizador perderá acesso ao seu download."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}