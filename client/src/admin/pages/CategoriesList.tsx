import { useState, useEffect, useMemo } from 'react';
import { categoriesService, StoreCategory } from '../../services/categoriesService';
import { tebexService } from '../../services/tebexService';
import { mapTebexPackageToPackage } from '../../utils/packageMapper';
import { Package } from '../../types';
import OptimizedImage from '../../components/OptimizedImage';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Check,
  GripVertical,
  Layers,
  Boxes,
} from 'lucide-react';

export default function CategoriesList() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [managingId, setManagingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [draggingPkgId, setDraggingPkgId] = useState<number | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    setSuccessMsg(null);
  };
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setError(null);
    setTimeout(() => setSuccessMsg((cur) => (cur === msg ? null : cur)), 2500);
  };

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cats, tebexPkgs] = await Promise.all([
        categoriesService.fetchAll(),
        tebexService.fetchPackages().catch(() => []),
      ]);
      setCategories(cats);
      setPackages(tebexPkgs.map(mapTebexPackageToPackage));
    } catch (err: any) {
      console.error('Error loading categories:', err);
      showError(err?.message || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const reloadCategories = async () => {
    try {
      const cats = await categoriesService.fetchAll();
      setCategories(cats);
    } catch (err) {
      console.error('Error reloading categories:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categoriesService.create(formData);
      setShowAddForm(false);
      setFormData({ name: '', slug: '', description: '', image: '' });
      await reloadCategories();
      showSuccess('Categoria criada');
    } catch (err: any) {
      console.error('Error adding category:', err);
      showError(err?.message || 'Erro ao criar categoria');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return;
      await categoriesService.update(id, {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
      });
      setEditingId(null);
      await reloadCategories();
      showSuccess('Categoria atualizada');
    } catch (err: any) {
      console.error('Error updating category:', err);
      showError(err?.message || 'Erro ao atualizar');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await categoriesService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      await reloadCategories();
      showSuccess('Categoria eliminada');
    } catch (err: any) {
      console.error('Error deleting category:', err);
      showError(err?.message || 'Erro ao eliminar');
    }
  };

  const updateLocalCategory = (id: number, field: keyof StoreCategory, value: string) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Drag-and-drop: optimistic update of the local list, then persist via the
  // full-replace setPackages endpoint. On failure we restore the previous state.
  const addPackageToCategory = async (categoryId: number, packageId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (cat.packageIds.includes(packageId)) {
      showSuccess('Package já estava nesta categoria');
      return;
    }
    const prev = cat.packageIds;
    const next = [...prev, packageId];
    setCategories((cur) =>
      cur.map((c) => (c.id === categoryId ? { ...c, packageIds: next } : c))
    );
    try {
      await categoriesService.setPackages(categoryId, next);
      const pkgName = packages.find((p) => p.tebexPackageId === packageId)?.name || 'Package';
      showSuccess(`${pkgName} → ${cat.name}`);
    } catch (err: any) {
      setCategories((cur) =>
        cur.map((c) => (c.id === categoryId ? { ...c, packageIds: prev } : c))
      );
      showError(err?.message || 'Falha ao atribuir package');
    }
  };

  const removePackageFromCategory = async (categoryId: number, packageId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const prev = cat.packageIds;
    const next = prev.filter((id) => id !== packageId);
    setCategories((cur) =>
      cur.map((c) => (c.id === categoryId ? { ...c, packageIds: next } : c))
    );
    try {
      await categoriesService.setPackages(categoryId, next);
    } catch (err: any) {
      setCategories((cur) =>
        cur.map((c) => (c.id === categoryId ? { ...c, packageIds: prev } : c))
      );
      showError(err?.message || 'Falha ao remover package');
    }
  };

  // Map tebexPackageId → Package, for fast thumbnail lookup on category cards.
  const pkgById = useMemo(() => {
    const m = new Map<number, Package>();
    for (const p of packages) {
      if (p.tebexPackageId) m.set(p.tebexPackageId, p);
    }
    return m;
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => p.name.toLowerCase().includes(q));
  }, [packages, search]);

  const totalPackagesCount = packages.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const managingCategory = managingId !== null
    ? categories.find((c) => c.id === managingId) || null
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Categorias</h1>
          <p className="text-sm text-gray-500 mt-1">
            Arrasta um package para uma categoria para o atribuir.
            Click numa categoria para gestão em massa.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors flex items-center touch-manipulation min-h-[44px]"
        >
          {showAddForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
          {showAddForm ? 'Cancelar' : 'Criar Categoria'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Nova Categoria</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors touch-manipulation min-h-[44px]"
            >
              Criar
            </button>
          </form>
        </div>
      )}

      {/* Categories Row — drop targets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Virtual "All Scripts" card — informational only, no drop target */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded-full mb-1.5">
                <Layers size={10} />
                Sistema
              </div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">All Scripts</h3>
            </div>
            <span className="text-2xl font-black text-amber-600">{totalPackagesCount}</span>
          </div>
          <p className="text-xs text-gray-600 mt-auto">
            Mostra automaticamente todos os packages. Não pode ser editada.
          </p>
        </div>

        {/* DB-defined categories — drop targets */}
        {categories.map((cat) => {
          const isOver = dragOverId === cat.id;
          const assignedThumbs = cat.packageIds
            .map((id) => pkgById.get(id))
            .filter(Boolean)
            .slice(0, 4) as Package[];
          return (
            <div
              key={cat.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setDragOverId(cat.id);
              }}
              onDragLeave={() => setDragOverId((cur) => (cur === cat.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverId(null);
                const pkgId = Number(e.dataTransfer.getData('text/plain'));
                if (pkgId) addPackageToCategory(cat.id, pkgId);
              }}
              onClick={() => setManagingId(cat.id)}
              className={`group relative bg-white border-2 rounded-xl p-4 flex flex-col cursor-pointer transition-all ${
                isOver
                  ? 'border-amber-500 ring-4 ring-amber-200 scale-[1.02]'
                  : 'border-gray-200 hover:border-amber-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{cat.slug}</p>
                </div>
                <span className="text-2xl font-black text-gray-700 flex-shrink-0 ml-2">
                  {cat.packageIds.length}
                </span>
              </div>

              {/* Thumb strip */}
              {assignedThumbs.length > 0 && (
                <div className="flex -space-x-2 mt-2 mb-3">
                  {assignedThumbs.map((p) => (
                    <div
                      key={p.id}
                      className="w-9 h-9 rounded-md border-2 border-white bg-gray-100 overflow-hidden shadow-sm"
                      title={p.name}
                    >
                      <OptimizedImage
                        src={p.image}
                        alt={p.name}
                        width={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {cat.packageIds.length > assignedThumbs.length && (
                    <div className="w-9 h-9 rounded-md border-2 border-white bg-gray-200 text-[10px] font-bold text-gray-600 flex items-center justify-center shadow-sm">
                      +{cat.packageIds.length - assignedThumbs.length}
                    </div>
                  )}
                </div>
              )}

              {/* Action icons (stop card click propagation) */}
              <div className="flex items-center justify-end gap-1 mt-auto pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(cat.id);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label="Editar"
                  title="Editar nome / slug"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setManagingId(cat.id);
                  }}
                  className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  aria-label="Gerir"
                  title="Gestão em massa"
                >
                  <Boxes size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ id: cat.id, name: cat.name });
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Drop overlay */}
              {isOver && (
                <div className="absolute inset-0 rounded-xl bg-amber-500/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                  <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    + Adicionar a {cat.name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Package Pool */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Pacotes disponíveis</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Arrasta um package para uma categoria acima.
            </p>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar pacote..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {filteredPackages.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              {packages.length === 0
                ? 'A carregar pacotes do Tebex...'
                : 'Nenhum pacote encontrado.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredPackages.map((pkg) => {
                const id = pkg.tebexPackageId;
                const isDragging = id != null && draggingPkgId === id;
                return (
                  <div
                    key={pkg.id}
                    draggable={!!id}
                    onDragStart={(e) => {
                      if (!id) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData('text/plain', String(id));
                      e.dataTransfer.effectAllowed = 'copy';
                      setDraggingPkgId(id);
                    }}
                    onDragEnd={() => setDraggingPkgId(null)}
                    className={`group relative bg-gray-50 hover:bg-white border border-gray-200 hover:border-amber-300 hover:shadow-md rounded-lg overflow-hidden transition-all select-none ${
                      id ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-50'
                    } ${isDragging ? 'opacity-40 scale-95' : ''}`}
                    title={id ? 'Arrasta para uma categoria' : 'Sem tebex id'}
                  >
                    <div className="aspect-video bg-black overflow-hidden relative">
                      <OptimizedImage
                        src={pkg.image}
                        alt={pkg.name}
                        width={240}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical size={12} className="text-white" />
                      </div>
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-gray-900 truncate" title={pkg.name}>
                        {pkg.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {pkg.price === 0 ? 'Free' : `€${pkg.price.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingId !== null && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setEditingId(null);
              reloadCategories();
            }}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Editar Categoria</h2>
                <button
                  onClick={() => {
                    setEditingId(null);
                    reloadCategories();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input
                    type="text"
                    value={categories.find((c) => c.id === editingId)?.name || ''}
                    onChange={(e) => updateLocalCategory(editingId, 'name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-base"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    value={categories.find((c) => c.id === editingId)?.slug || ''}
                    onChange={(e) => updateLocalCategory(editingId, 'slug', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={categories.find((c) => c.id === editingId)?.description || ''}
                    onChange={(e) => updateLocalCategory(editingId, 'description', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-base"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleUpdate(editingId)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors min-h-[48px] font-medium"
                  >
                    <Save size={20} />
                    <span>Guardar</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      reloadCategories();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[48px] font-medium"
                  >
                    <X size={20} />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manage Packages Modal — bulk select / inspect / remove */}
      {managingCategory && (
        <ManagePackagesModal
          category={managingCategory}
          allPackages={packages}
          onClose={() => setManagingId(null)}
          onSaved={async () => {
            setManagingId(null);
            await reloadCategories();
            showSuccess('Pacotes guardados');
          }}
          onError={(msg) => showError(msg)}
          onRemoveOne={(pkgId) => removePackageFromCategory(managingCategory.id, pkgId)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                  Eliminar Categoria
                </h2>
                <p className="text-gray-600 text-center">
                  Eliminar a categoria <span className="font-semibold">"{deleteConfirm.name}"</span>?
                </p>
                <p className="text-sm text-gray-500 text-center mt-2">
                  As atribuições de packages são desligadas. Não pode ser revertido.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[48px] font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[48px] font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ManagePackagesModalProps {
  category: StoreCategory;
  allPackages: Package[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  onRemoveOne: (pkgId: number) => void;
}

function ManagePackagesModal({
  category,
  allPackages,
  onClose,
  onSaved,
  onError,
  onRemoveOne,
}: ManagePackagesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(category.packageIds)
  );
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPackages;
    return allPackages.filter((p) => p.name.toLowerCase().includes(q));
  }, [allPackages, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aSel = selectedIds.has(a.tebexPackageId ?? -1) ? 0 : 1;
      const bSel = selectedIds.has(b.tebexPackageId ?? -1) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, selectedIds]);

  const toggle = (id: number | undefined) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await categoriesService.setPackages(category.id, Array.from(selectedIds));
      onSaved();
    } catch (e: any) {
      onError(e?.message || 'Erro ao guardar pacotes');
      setSaving(false);
    }
  };

  // Suppress unused-warning — exposed for future inline-remove flows.
  void onRemoveOne;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 max-h-[85vh] flex flex-col">
        <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gerir Pacotes</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Categoria: <span className="font-semibold text-gray-700">{category.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar pacote..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
              {selectedIds.size} selecionados
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 max-h-[55vh]">
            {sorted.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500 text-sm">
                {allPackages.length === 0
                  ? 'A carregar pacotes do Tebex...'
                  : 'Nenhum pacote encontrado.'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sorted.map((pkg) => {
                  const id = pkg.tebexPackageId;
                  const checked = id ? selectedIds.has(id) : false;
                  return (
                    <li key={pkg.id}>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        disabled={!id}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          checked ? 'bg-amber-50' : 'hover:bg-gray-50'
                        } ${!id ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            checked ? 'bg-amber-600 border-amber-600' : 'bg-white border-gray-300'
                          }`}
                        >
                          {checked && <Check size={14} className="text-white" strokeWidth={3} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{pkg.name}</p>
                          <p className="text-xs text-gray-500">
                            {id ? `id: ${id}` : 'sem tebex id'}
                            {pkg.price > 0 && ` · €${pkg.price.toFixed(2)}`}
                            {pkg.price === 0 && ' · Free'}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[48px] font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors min-h-[48px] font-medium disabled:opacity-50"
            >
              <Save size={18} />
              <span>{saving ? 'A guardar...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
