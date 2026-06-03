import { useEffect, useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  Loader2,
  GripVertical,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { tebexService } from '../../services/tebexService';
import { mapTebexPackageToPackage } from '../../utils/packageMapper';
import { packageOrderService, applyPackageOrder } from '../../services/packageOrderService';
// `isOxlynPackage` (legacy filter on `description.includes("oxlyn")`) used
// to hide Vanguard packages from the admin pickers entirely. Now that
// Vanguard is a first-class storefront tab, admins must be able to see and
// reorder those rows too — the filter is dropped.
import { Package } from '../../types';

type Status = { kind: 'idle' } | { kind: 'success'; msg: string } | { kind: 'error'; msg: string };

export default function PackageOrderManager() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [originalOrder, setOriginalOrder] = useState<number[]>([]);

  const load = async () => {
    setLoading(true);
    setStatus({ kind: 'idle' });
    try {
      const [tebexPackages, orderEntries] = await Promise.all([
        tebexService.fetchPackages(),
        packageOrderService.fetch(),
      ]);
      const mapped = tebexPackages.map(mapTebexPackageToPackage);
      const ordered = applyPackageOrder(mapped, orderEntries);
      setPackages(ordered);
      setOriginalOrder(ordered.map((p) => p.tebexPackageId || 0));
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e?.message || 'Failed to load packages' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasChanges = useMemo(() => {
    if (packages.length !== originalOrder.length) return true;
    return packages.some((p, idx) => (p.tebexPackageId || 0) !== originalOrder[idx]);
  }, [packages, originalOrder]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= packages.length) return;
    setPackages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ kind: 'idle' });
    try {
      const items = packages
        .filter((p) => p.tebexPackageId)
        .map((p, idx) => ({
          tebexPackageId: p.tebexPackageId as number,
          displayOrder: idx,
        }));
      await packageOrderService.save(items);
      setOriginalOrder(packages.map((p) => p.tebexPackageId || 0));
      setStatus({ kind: 'success', msg: 'Ordem guardada com sucesso!' });
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Repor ordem padrão da Tebex? A ordem manual atual será perdida.')) return;
    setResetting(true);
    setStatus({ kind: 'idle' });
    try {
      await packageOrderService.reset();
      await load();
      setStatus({ kind: 'success', msg: 'Ordem reposta para o padrão Tebex.' });
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e?.message || 'Reset failed' });
    } finally {
      setResetting(false);
    }
  };

  // === Drag & drop handlers ===
  const onDragStart = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    // for Firefox
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const onDragOver = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== idx) setOverIndex(idx);
  };
  const onDragLeave = () => setOverIndex(null);
  const onDrop = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    move(dragIndex, idx);
    setDragIndex(null);
    setOverIndex(null);
  };
  const onDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* === HEADER === */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#0a1418]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                <ArrowUpDown className="text-blue-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Ordem das Packages</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Por defeito as packages mais recentes aparecem primeiro. Aqui podes fixar a ordem manualmente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={resetting || saving || loading}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium px-4 py-2.5 rounded-xl transition disabled:opacity-50"
              title="Repor ordem original do Tebex"
            >
              {resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              Repor Tebex
            </button>
            <button
              onClick={handleSave}
              disabled={saving || resetting || loading || !hasChanges}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Ordem
            </button>
          </div>
        </div>
      </div>

      {/* === STATUS === */}
      {status.kind === 'success' && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 size={16} />
          {status.msg}
        </div>
      )}
      {status.kind === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} />
          {status.msg}
        </div>
      )}
      {hasChanges && status.kind === 'idle' && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} />
          Tens alterações por guardar.
        </div>
      )}

      {/* === LIST === */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Lista ordenada</h2>
          <span className="text-xs text-gray-500">
            {packages.length} {packages.length === 1 ? 'package' : 'packages'} · arrasta para reordenar
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-gray-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : packages.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            Nenhuma package encontrada na Tebex.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id}
                draggable
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver(idx)}
                onDragLeave={onDragLeave}
                onDrop={onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-3 px-4 sm:px-6 py-3 transition-all ${
                  dragIndex === idx
                    ? 'opacity-40'
                    : overIndex === idx
                    ? 'bg-orange-500/10 border-l-2 border-orange-500'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* drag handle */}
                <div className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0">
                  <GripVertical size={18} />
                </div>

                {/* index badge */}
                <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                  {idx + 1}
                </div>

                {/* thumbnail */}
                <div className="w-14 h-9 sm:w-20 sm:h-12 rounded-lg overflow-hidden bg-black border border-white/5 flex-shrink-0">
                  <img
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* name + frameworks */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{pkg.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-500">
                      {pkg.price === 0 ? 'Free' : `${pkg.price.toFixed(2)}€`}
                    </span>
                    {pkg.frameworks && pkg.frameworks.length > 0 && (
                      <span className="text-[11px] text-gray-600 truncate">
                        · {pkg.frameworks.slice(0, 3).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* up/down arrows (mobile-friendly fallback) */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => move(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Mover para cima"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => move(idx, idx + 1)}
                    disabled={idx === packages.length - 1}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
