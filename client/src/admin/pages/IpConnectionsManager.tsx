import { useEffect, useMemo, useState } from 'react';
import {
  Globe,
  RefreshCw,
  Search,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { API_URL } from '../../config/api';

interface IpConnection {
  id: number;
  ipAddress: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
  userAgent: string;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface ListResponse {
  items: IpConnection[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function flagEmoji(code: string) {
  if (!code || code.length !== 2 || code === 'LO') return '🌐';
  const base = 0x1f1e6;
  const A = 'A'.charCodeAt(0);
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => base + (c.charCodeAt(0) - A)));
}

export default function IpConnectionsManager() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Debounce the search box so we don't fire one request per keystroke.
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        const res = await fetch(`${API_URL}/admin/ip-connections?${params.toString()}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json: ListResponse = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) showToast('error', 'Erro ao carregar IPs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  const refresh = () => {
    // Bump-by-zero: re-run the effect by toggling state.
    setPage((p) => (p === 0 ? -1 : 0));
    setTimeout(() => setPage(0), 0);
  };

  const deleteOne = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/ip-connections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setData((d) =>
        d ? { ...d, items: d.items.filter((i) => i.id !== id), total: Math.max(0, d.total - 1) } : d
      );
      showToast('success', 'Registo removido.');
    } catch {
      showToast('error', 'Erro ao apagar.');
    }
  };

  const clearAll = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/ip-connections`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setData({ items: [], total: 0, page: 0, pageSize: PAGE_SIZE });
      setConfirmClear(false);
      showToast('success', 'Tabela limpa.');
    } catch {
      showToast('error', 'Erro ao limpar tabela.');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a0a0d]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-700/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
                <Globe className="text-red-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">IP Connection</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Visitantes únicos · geo via ip-api.com · F5 dentro de 10 min só incrementa o contador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              disabled={!data?.items.length}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Trash2 size={16} />
              <span>Limpar tudo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Procurar IP, país, cidade ou ISP…"
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition"
          />
        </div>
        <span className="text-xs text-gray-500 px-2">
          {data ? `${data.total} ${data.total === 1 ? 'visitante' : 'visitantes'}` : '—'}
        </span>
      </div>

      {confirmClear && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-300" />
            <p className="text-sm text-red-200">
              Esta acção apaga <b>todos</b> os registos de IP. Não é reversível.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmClear(false)}
              className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={clearAll}
              className="bg-red-500 hover:bg-red-400 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              Confirmar e apagar
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
            <RefreshCw size={18} className="animate-spin mr-2" />
            A carregar…
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Sem registos ainda. Os IPs aparecem aqui à medida que visitantes acedem ao site.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">IP</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Localização</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">ISP</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center">Visitas</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Primeira</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Última</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.015] transition">
                    <td className="px-4 py-3 font-mono text-white text-xs whitespace-nowrap">{row.ipAddress}</td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{flagEmoji(row.countryCode)}</span>
                        <span className="truncate">
                          {row.city || row.region || row.country || '—'}
                          {row.city && row.country && (
                            <span className="text-gray-500"> · {row.country}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-[260px]" title={row.isp}>
                      {row.isp || '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-white font-semibold tabular-nums">
                      {row.visitCount}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(row.firstSeenAt)}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{formatDate(row.lastSeenAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteOne(row.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                        aria-label="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > PAGE_SIZE && (
          <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-3 text-xs text-gray-400">
            <span>
              Página <b className="text-white">{page + 1}</b> de <b className="text-white">{totalPages}</b>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
