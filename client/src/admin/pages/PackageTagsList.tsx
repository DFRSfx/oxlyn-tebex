import { useEffect, useState } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Flame,
  Sparkles,
  Star,
  Zap,
  Loader2,
  Package as PackageIcon,
} from 'lucide-react';
import {
  packageTagsService,
  PackageTag,
  TagVariant,
  getTagStyles,
} from '../../services/packageTagsService';

const VARIANTS: TagVariant[] = ['orange', 'red', 'green', 'blue', 'purple', 'amber', 'pink'];

const PRESETS: { label: string; variant: TagVariant; keyword?: string }[] = [
  { label: 'POPULAR', variant: 'orange' },
  { label: 'NEW', variant: 'green' },
  { label: 'LAST RELEASE', variant: 'blue' },
  { label: 'HOT', variant: 'red' },
  { label: 'FEATURED', variant: 'purple' },
  { label: 'SALE', variant: 'amber' },
  // Bundle preset — keyword `bundle` matches both packages with "bundle"
  // in the name AND any package under a category named "Bundles".
  { label: 'BUNDLE', variant: 'purple', keyword: 'bundle' },
];

interface FormState {
  id?: number;
  keyword: string;
  label: string;
  variant: TagVariant;
  enabled: boolean;
  displayOrder: number;
}

const emptyForm: FormState = {
  keyword: '',
  label: '',
  variant: 'orange',
  enabled: true,
  displayOrder: 0,
};

export default function PackageTagsList() {
  const [tags, setTags] = useState<PackageTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await packageTagsService.fetchAll();
      setTags(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (tag: PackageTag) => {
    setEditingId(tag.id);
    setForm({
      id: tag.id,
      keyword: tag.keyword,
      label: tag.label,
      variant: tag.variant,
      enabled: tag.enabled,
      displayOrder: tag.displayOrder,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const applyPreset = (preset: { label: string; variant: TagVariant; keyword?: string }) => {
    setForm((prev) => ({
      ...prev,
      label: preset.label,
      variant: preset.variant,
      // If the preset carries a keyword (e.g. BUNDLE → "bundle"), prefill it
      // unless the admin has already typed something custom.
      keyword: preset.keyword && !prev.keyword ? preset.keyword : prev.keyword,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim() || !form.label.trim()) {
      setError('Keyword and label are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await packageTagsService.update(editingId, {
          keyword: form.keyword.trim().toLowerCase(),
          label: form.label.trim(),
          variant: form.variant,
          enabled: form.enabled,
          displayOrder: form.displayOrder,
        });
      } else {
        await packageTagsService.create({
          keyword: form.keyword.trim().toLowerCase(),
          label: form.label.trim(),
          variant: form.variant,
          enabled: form.enabled,
          displayOrder: form.displayOrder,
        });
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apagar esta tag?')) return;
    setDeletingId(id);
    try {
      await packageTagsService.remove(id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEnabled = async (tag: PackageTag) => {
    try {
      await packageTagsService.update(tag.id, { enabled: !tag.enabled });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Update failed');
    }
  };

  const renderTagPreview = (label: string, variant: TagVariant) => {
    const styles = getTagStyles(variant);
    const Icon = pickIcon(label);
    return (
      <span className="relative inline-block">
        <span
          className="absolute inset-0 blur-md rounded-md opacity-70"
          style={{ background: styles.glow }}
        />
        <span
          className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider text-white"
          style={{ background: styles.background, boxShadow: `0 4px 14px ${styles.glow}` }}
        >
          <Icon className="w-3 h-3" strokeWidth={3} />
          <span>{label || 'PREVIEW'}</span>
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1c0e08]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-600/10 border border-orange-500/20 rounded-2xl flex items-center justify-center">
                <TagIcon className="text-orange-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tags de Packages</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Atribui badges (POPULAR, NEW, LAST RELEASE…) a packages por palavra-chave do nome
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {editingId ? 'Editar tag' : 'Nova tag'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5"
            >
              <X size={14} /> Cancelar
            </button>
          )}
        </div>

        {/* Presets */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">
            Presets rápidos
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={() => applyPreset(p)}
                className="hover:scale-105 transition-transform"
                title={`Apply ${p.label}`}
              >
                {renderTagPreview(p.label, p.variant)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Keyword (substring do nome do package)" hint="ex: backpack — case-insensitive">
            <input
              type="text"
              value={form.keyword}
              onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              placeholder="ex: backpack"
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition"
            />
          </Field>

          <Field label="Label (texto da tag)" hint="ex: POPULAR, NEW, LAST RELEASE">
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value.toUpperCase() })}
              placeholder="ex: POPULAR"
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Cor">
            <div className="flex flex-wrap gap-2">
              {VARIANTS.map((v) => {
                const styles = getTagStyles(v);
                const active = form.variant === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, variant: v })}
                    className={`w-9 h-9 rounded-lg border-2 transition-all ${
                      active ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: styles.background }}
                    title={v}
                  />
                );
              })}
            </div>
          </Field>

          <Field label="Ordem (menor aparece primeiro)">
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition"
            />
          </Field>

          <Field label="Estado">
            <button
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                form.enabled
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-gray-400 border border-white/10'
              }`}
            >
              {form.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
              {form.enabled ? 'Ativo' : 'Desativado'}
            </button>
          </Field>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="text-[11px] text-gray-500 uppercase tracking-widest">Preview</div>
          <div>{renderTagPreview(form.label || 'TAG', form.variant)}</div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !form.keyword.trim() || !form.label.trim()}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {editingId ? 'Guardar alterações' : 'Criar tag'}
          </button>
        </div>
      </form>

      {/* LIST */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Todas as tags</h2>
          <span className="text-xs text-gray-500">{tags.length} total</span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-gray-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : tags.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            Ainda não há tags. Cria a primeira acima.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition"
              >
                <div className="flex-shrink-0">{renderTagPreview(tag.label, tag.variant)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">
                    {tag.label}{' '}
                    <span className="text-gray-500 font-normal">
                      → packages com <code className="text-orange-300">{tag.keyword}</code>
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Ordem {tag.displayOrder} ·{' '}
                    {tag.enabled ? (
                      <span className="text-emerald-400">ativo</span>
                    ) : (
                      <span className="text-gray-500">desativado</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleEnabled(tag)}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition"
                    title={tag.enabled ? 'Desativar' : 'Ativar'}
                  >
                    {tag.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={() => startEdit(tag)}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    disabled={deletingId === tag.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition disabled:opacity-50"
                    title="Apagar"
                  >
                    {deletingId === tag.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
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

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <label className="block">
    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{label}</span>
    <div className="mt-1.5">{children}</div>
    {hint && <div className="text-[10px] text-gray-600 mt-1">{hint}</div>}
  </label>
);

function pickIcon(label: string) {
  const l = label.toLowerCase();
  if (/(popular|hot|trend)/.test(l)) return Flame;
  if (/(new|fresh)/.test(l)) return Sparkles;
  if (/(release|update|latest|last)/.test(l)) return Zap;
  if (/(star|featured)/.test(l)) return Star;
  if (/(bundle|pack|kit)/.test(l)) return PackageIcon;
  return TagIcon;
}
