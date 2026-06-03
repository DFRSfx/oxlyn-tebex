import { useEffect, useMemo, useState } from 'react';
import { Star, Save, RefreshCw, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { API_URL } from '../../config/api';
import { tebexService } from '../../services/tebexService';
import { mapTebexPackageToPackage } from '../../utils/packageMapper';
import { Package } from '../../types';

interface TopSellerItem {
  id?: number;
  tebexPackageId: number;
  displayOrder?: number;
  enabled: boolean;
}

export default function TopSellersManager() {
  const [items, setItems] = useState<TopSellerItem[]>([]);
  const [original, setOriginal] = useState<TopSellerItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPackages = async () => {
    setPackagesError(null);
    try {
      const tebexPackages = await tebexService.fetchPackages();
      if (!Array.isArray(tebexPackages) || tebexPackages.length === 0) {
        setPackages([]);
        setPackagesError('Tebex devolveu uma lista vazia.');
        return;
      }
      setPackages(tebexPackages.map(mapTebexPackageToPackage));
    } catch (e: any) {
      setPackages([]);
      setPackagesError(e?.message || 'Falha a contactar Tebex.');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/admin/top-sellers`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
        const list: TopSellerItem[] = res.ok ? await res.json() : [];
        setItems(Array.isArray(list) ? list : []);
        setOriginal(Array.isArray(list) ? list : []);
      } catch {
        showToast('error', 'Erro ao carregar configuração.');
      } finally {
        setLoading(false);
      }
      await loadPackages();
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/top-sellers`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      const fresh: TopSellerItem[] = await res.json();
      setItems(fresh);
      setOriginal(fresh);
      showToast('success', 'Top scripts guardados.');
    } catch {
      showToast('error', 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(items) !== JSON.stringify(original);

  // Tebex packages not already in the list — what the "Add" picker offers.
  const availablePackages = useMemo(() => {
    const used = new Set(items.map((i) => Number(i.tebexPackageId)));
    return packages.filter((p) => p.tebexPackageId && !used.has(Number(p.tebexPackageId)));
  }, [packages, items]);

  // Quick lookup by tebex_package_id so each row can render its package name
  // without re-iterating the packages list.
  const packageById = useMemo(() => {
    const map = new Map<number, Package>();
    for (const p of packages) {
      if (p.tebexPackageId) map.set(Number(p.tebexPackageId), p);
    }
    return map;
  }, [packages]);

  const addItem = () => {
    const id = Number(picker);
    if (!id) return;
    if (items.some((i) => Number(i.tebexPackageId) === id)) return;
    setItems((prev) => [...prev, { tebexPackageId: id, enabled: true }]);
    setPicker('');
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleEnabled = (idx: number) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, enabled: !it.enabled } : it))
    );

  // Native HTML5 drag-and-drop for reorder. Lightweight; no extra dep.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      setDragIdx(idx);
      return next;
    });
  };
  const handleDragEnd = () => setDragIdx(null);

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
                <Star className="text-red-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Top Scripts</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Carrossel curado no landing page · adiciona pacotes Tebex e arrasta para reordenar
              </p>
            </div>
          </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" />
          A carregar…
        </div>
      ) : (
        <>
          {packagesError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl px-4 py-3">
              {packagesError}
            </div>
          )}

          {/* Add picker */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs text-gray-400 mb-1.5">Adicionar pacote</label>
              <select
                value={picker}
                onChange={(e) => setPicker(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition"
              >
                <option value="">— escolhe um pacote Tebex —</option>
                {availablePackages.map((p) => (
                  <option key={p.id} value={p.tebexPackageId ?? p.id}>
                    {p.name} · €{p.price.toFixed(2).replace('.', ',')}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={addItem}
              disabled={!picker}
              className="self-end bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Plus size={16} />
              <span>Adicionar</span>
            </button>
          </div>

          {/* List */}
          {items.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-dashed border-white/10 rounded-2xl py-14 text-center text-sm text-gray-500">
              Sem pacotes na lista. Adiciona pelo menos um para que a secção apareça no landing.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => {
                const pkg = packageById.get(Number(item.tebexPackageId));
                return (
                  <div
                    key={`${item.tebexPackageId}-${idx}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-[#0f0f0f] border rounded-xl px-4 py-3 flex items-center gap-3 transition ${
                      dragIdx === idx
                        ? 'border-red-500/40 shadow-lg shadow-red-500/10 cursor-grabbing'
                        : 'border-white/5 hover:border-white/10 cursor-grab'
                    }`}
                  >
                    <GripVertical size={16} className="text-gray-600 flex-shrink-0" />
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>

                    {pkg?.image ? (
                      <img
                        src={pkg.image}
                        alt=""
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-white/5"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/5 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {pkg?.name || <span className="text-red-300">Pacote #{item.tebexPackageId} não encontrado</span>}
                      </p>
                      {pkg && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          €{pkg.price.toFixed(2).replace('.', ',')} · Tebex ID {item.tebexPackageId}
                        </p>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleEnabled(idx)}
                        className="accent-red-500"
                      />
                      <span>Visível</span>
                    </label>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 transition"
                        aria-label="Mover para cima"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 transition"
                        aria-label="Mover para baixo"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                        aria-label="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
