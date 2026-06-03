import { useEffect, useState } from 'react';
import { Receipt, Save, RefreshCw, Plus, Trash2, GripVertical } from 'lucide-react';
import { API_URL } from '../../config/api';

interface RecentPayment {
  id?: number;
  buyerName: string;
  avatarFilename: string;
  amount: number;
  minutesAgo: number;
  enabled: boolean;
}

const BLANK: RecentPayment = {
  buyerName: '',
  avatarFilename: '',
  amount: 14.99,
  minutesAgo: 5,
  enabled: true,
};

export default function RecentPaymentsManager() {
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [originalPayments, setOriginalPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const data: RecentPayment[] = await fetch(`${API_URL}/admin/recent-payments`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      const list = Array.isArray(data) ? data : [];
      setPayments(list);
      setOriginalPayments(list);
    } catch {
      showToast('error', 'Erro ao carregar pagamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hasChanges = JSON.stringify(payments) !== JSON.stringify(originalPayments);

  const update = (i: number, patch: Partial<RecentPayment>) =>
    setPayments((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const remove = (i: number) => setPayments((prev) => prev.filter((_, idx) => idx !== i));

  const add = () => setPayments((prev) => [...prev, { ...BLANK }]);

  const move = (i: number, dir: -1 | 1) => {
    setPayments((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const r = await fetch(`${API_URL}/admin/recent-payments`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payments }),
      });
      if (!r.ok) throw new Error();
      const fresh = await r.json();
      setPayments(fresh);
      setOriginalPayments(fresh);
      showToast('success', 'Pagamentos guardados.');
    } catch {
      showToast('error', 'Erro ao guardar.');
    } finally {
      setSaving(false);
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
                <Receipt className="text-red-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Recent Payments</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Marquee de pagamentos fictícios mostrado nas páginas de produto · cada comprador deve ser único
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={add}
              className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
            >
              <Plus size={16} />
              <span>Adicionar pagamento</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'A guardar…' : 'Guardar alterações'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3 text-xs text-gray-400">
        <p>
          As imagens são lidas de <b className="text-white">/public/recentpayments/</b>. Coloca lá o ficheiro
          (ex: <code className="text-red-300">stuart.jpg</code>) e usa esse nome no campo "Avatar".
        </p>
        <p>
          O cronómetro é <b className="text-white">automático</b>: o servidor escolhe 15 compradores do pool
          a cada 10 minutos (em sincronia para toda a gente, UTC) e atribui tempos com gaps ~10 min entre
          posições (com jitter). O campo <b className="text-white">minutes_ago</b> abaixo é mantido só por
          retro-compatibilidade — agora é o servidor que decide.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" />
          A carregar…
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-8 text-center text-sm text-gray-400">
          Sem pagamentos. Adiciona o primeiro com o botão acima.
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-3 p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0f0f0f]"
            >
              <div className="flex flex-col items-center gap-0.5 text-gray-500">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  className="hover:text-red-400 transition-colors disabled:opacity-30"
                  disabled={i === 0}
                  aria-label="Mover para cima"
                >
                  ▲
                </button>
                <GripVertical size={12} />
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  className="hover:text-red-400 transition-colors disabled:opacity-30"
                  disabled={i === payments.length - 1}
                  aria-label="Mover para baixo"
                >
                  ▼
                </button>
              </div>

              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/8 overflow-hidden flex items-center justify-center">
                {p.avatarFilename ? (
                  <img
                    src={`/recentpayments/${p.avatarFilename}`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                  />
                ) : (
                  <span className="text-[10px] text-gray-600">—</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <input
                  type="text"
                  value={p.buyerName}
                  onChange={(e) => update(i, { buyerName: e.target.value })}
                  placeholder="JozaxRP"
                  maxLength={80}
                  className="bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                />
                <input
                  type="text"
                  value={p.avatarFilename}
                  onChange={(e) => update(i, { avatarFilename: e.target.value })}
                  placeholder="calib.jpg"
                  maxLength={255}
                  className="bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
                />
              </div>

              <label className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.18em] text-gray-500">€</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.amount}
                  onChange={(e) => update(i, { amount: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-white/[0.04] border border-white/8 rounded-lg px-2 py-1.5 text-xs font-mono text-white text-right focus:outline-none focus:border-red-500/50"
                />
              </label>

              <label className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Min ago</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={p.minutesAgo}
                  onChange={(e) => update(i, { minutesAgo: parseInt(e.target.value || '5', 10) || 5 })}
                  className="w-14 bg-white/[0.04] border border-white/8 rounded-lg px-2 py-1.5 text-xs font-mono text-white text-center focus:outline-none focus:border-red-500/50 opacity-50"
                  title="Stored for backwards compatibility — the server now computes minutes_ago dynamically."
                />
              </label>

              <label className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Visível</span>
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => update(i, { enabled: e.target.checked })}
                  className="accent-red-500"
                />
              </label>

              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                aria-label="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
