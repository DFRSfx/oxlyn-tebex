import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Package, Check, Copy } from 'lucide-react';
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

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Tokens de Download</h1>
          <p className="text-gray-400">Gerir tokens de download protegidos para utilizadores</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Criar Token
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum Token Ainda</h3>
          <p className="text-gray-400">Crie o seu primeiro token de download para começar</p>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30 border-b border-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Token</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">ID do Utilizador Discord</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Nome do Ficheiro</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Downloads</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Criado</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyToken(token.token)}
                        className="group flex items-center gap-2 text-amber-500 hover:text-amber-400 font-mono text-sm transition-all"
                        title="Clique para copiar"
                      >
                        <span className="truncate max-w-[180px]">
                          {token.token.substring(0, 20)}...
                        </span>
                        {copiedToken === token.token ? (
                          <Check size={16} className="text-green-500 animate-in fade-in zoom-in duration-200" />
                        ) : (
                          <Copy size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm font-mono">
                      {token.discord_user_id}
                    </td>
                    <td className="px-4 py-3 text-white text-sm">
                      {token.file_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-300">
                        {token.remaining_downloads} / {token.max_downloads}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {token.is_claimed ? (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-medium">
                          Reivindicado
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs font-medium">
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
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Eliminar token"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
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
