import { useEffect, useMemo, useState } from 'react';
import {
  Package as PackageIcon,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { tebexService } from '../../services/tebexService';
import { mapTebexPackageToPackage } from '../../utils/packageMapper';
import { bundlesService, BundleResourceEntry } from '../../services/bundlesService';
// `isOxlynPackage` (legacy filter on `description.includes("oxlyn")`)
// removed — Vanguard bundles must show here too so admins can manage
// their resource lists.
import { isBundle } from '../../utils/isBundle';
import { Package } from '../../types';

type Status = { kind: 'idle' } | { kind: 'success'; msg: string } | { kind: 'error'; msg: string };

interface DraftResource {
  resourceTebexId: number;
  resourceName: string;
}

export default function BundlesManager() {
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);
  const [draftResources, setDraftResources] = useState<DraftResource[]>([]);
  const [savedResources, setSavedResources] = useState<DraftResource[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setStatus({ kind: 'idle' });
    try {
      const tebexPackages = await tebexService.fetchPackages();
      const mapped = tebexPackages.map(mapTebexPackageToPackage);
      setAllPackages(mapped);
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e?.message || 'Failed to load packages' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const bundles = useMemo(
    () => allPackages.filter((p) => isBundle(p)),
    [allPackages]
  );

  const nonBundles = useMemo(
    () => allPackages.filter((p) => !isBundle(p)),
    [allPackages]
  );

  // Auto-select the first bundle when packages load
  useEffect(() => {
    if (selectedBundleId === null && bundles.length > 0) {
      setSelectedBundleId(bundles[0].tebexPackageId ?? null);
    }
  }, [bundles, selectedBundleId]);

  // Fetch the resources currently saved for the selected bundle
  useEffect(() => {
    if (!selectedBundleId) {
      setDraftResources([]);
      setSavedResources([]);
      return;
    }
    let cancelled = false;
    bundlesService.fetchForBundle(selectedBundleId).then((entries: BundleResourceEntry[]) => {
      if (cancelled) return;
      const mapped = entries.map((e) => ({
        resourceTebexId: e.resourceTebexId,
        resourceName: e.resourceName,
      }));
      setDraftResources(mapped);
      setSavedResources(mapped);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBundleId]);

  const hasChanges = useMemo(() => {
    if (draftResources.length !== savedResources.length) return true;
    return draftResources.some(
      (r, i) => r.resourceTebexId !== savedResources[i]?.resourceTebexId
    );
  }, [draftResources, savedResources]);

  const selectedBundle = bundles.find((b) => b.tebexPackageId === selectedBundleId);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= draftResources.length) return;
    setDraftResources((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const removeAt = (idx: number) => {
    setDraftResources((prev) => prev.filter((_, i) => i !== idx));
  };

  const addResource = (pkg: Package) => {
    if (!pkg.tebexPackageId) return;
    if (draftResources.some((r) => r.resourceTebexId === pkg.tebexPackageId)) return;
    setDraftResources((prev) => [
      ...prev,
      { resourceTebexId: pkg.tebexPackageId!, resourceName: pkg.name },
    ]);
  };

  const handleSave = async () => {
    if (!selectedBundleId) return;
    setSaving(true);
    setStatus({ kind: 'idle' });
    try {
      const entries = await bundlesService.save(selectedBundleId, draftResources);
      const mapped = entries.map((e) => ({
        resourceTebexId: e.resourceTebexId,
        resourceName: e.resourceName,
      }));
      setDraftResources(mapped);
      setSavedResources(mapped);
      setStatus({ kind: 'success', msg: 'Bundle guardado com sucesso!' });
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const filteredPicker = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return nonBundles
      .filter((p) => !draftResources.some((r) => r.resourceTebexId === p.tebexPackageId))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 80);
  }, [nonBundles, draftResources, pickerQuery]);

  return (
    <div className="space-y-6">
      {/* === HEADER === */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a0f0a]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-600/10 border border-orange-500/20 rounded-2xl flex items-center justify-center">
                <PackageIcon className="text-orange-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Bundles</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Configura quais resources fazem parte de cada bundle. Aparecem no site
                em vez do bloco "Key Features".
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading || !selectedBundleId || !hasChanges}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Bundle
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
      {hasChanges && status.kind === 'idle' && selectedBundleId && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} />
          Tens alterações por guardar neste bundle.
        </div>
      )}

      {loading ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-10 flex items-center justify-center text-gray-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-10 text-center text-gray-400 text-sm">
          Nenhum bundle encontrado. Cria um package na Tebex com a palavra
          <span className="text-orange-400 font-semibold"> BUNDLE </span>
          no nome (ex: <code className="text-orange-300">[BUNDLE] Admin</code>) ou usa
          uma categoria <span className="text-orange-400 font-semibold">Bundles</span>.
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* === BUNDLE LIST === */}
          <div className="lg:col-span-4">
            <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white">Bundles disponíveis</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">{bundles.length} encontrados</p>
              </div>
              <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                {bundles.map((b) => {
                  const active = b.tebexPackageId === selectedBundleId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBundleId(b.tebexPackageId ?? null)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                        active ? 'bg-orange-500/10 border-l-2 border-orange-500' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="w-12 h-8 rounded-md overflow-hidden bg-black border border-white/5 flex-shrink-0">
                        <img src={b.image} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-gray-300'}`}>
                          {b.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {b.price === 0 ? 'Free' : `${b.price.toFixed(2)}€`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* === EDITOR === */}
          <div className="lg:col-span-8">
            <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-orange-400 font-bold">A editar</div>
                  <div className="text-base font-semibold text-white truncate">
                    {selectedBundle?.name ?? '—'}
                  </div>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  disabled={!selectedBundleId}
                  className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-200 font-medium px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  <Plus size={16} />
                  Adicionar resource
                </button>
              </div>

              {draftResources.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Sem resources atribuídos. Clica em <span className="text-orange-400 font-semibold">Adicionar resource</span> para começar.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {draftResources.map((r, idx) => {
                    const pkg = allPackages.find((p) => p.tebexPackageId === r.resourceTebexId);
                    const displayName = pkg?.name || r.resourceName || `#${r.resourceTebexId}`;
                    return (
                      <div key={r.resourceTebexId} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                        <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                          {idx + 1}
                        </div>
                        <div className="w-14 h-9 rounded-md overflow-hidden bg-black border border-white/5 flex-shrink-0">
                          {pkg?.image ? (
                            <img src={pkg.image} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">N/A</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                          <div className="text-[11px] text-gray-500">Tebex ID #{r.resourceTebexId}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => move(idx, idx - 1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Mover para cima"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => move(idx, idx + 1)}
                            disabled={idx === draftResources.length - 1}
                            className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            onClick={() => removeAt(idx)}
                            className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === PICKER MODAL === */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Escolher resource</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Apenas packages que não são bundles</p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-white/10">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Procurar pelo nome..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 transition"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {filteredPicker.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Sem resultados.
                </div>
              ) : (
                filteredPicker.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      addResource(p);
                      setPickerOpen(false);
                      setPickerQuery('');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition"
                  >
                    <div className="w-14 h-9 rounded-md overflow-hidden bg-black border border-white/5 flex-shrink-0">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {p.price === 0 ? 'Free' : `${p.price.toFixed(2)}€`} · Tebex ID #{p.tebexPackageId}
                      </div>
                    </div>
                    <Plus size={16} className="text-gray-500 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
