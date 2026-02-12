import { useState, useEffect } from 'react';
import { categoriesApi } from '../../utils/apiHelpers';
import { useConfirmStore } from '../../hooks/useConfirm';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export default function CategoriesList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const openConfirm = useConfirmStore(state => state.openConfirm);
  const { error: showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categoriesApi.create(formData);
      setShowAddForm(false);
      setFormData({ name: '', slug: '', description: '', image: '' });
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const category = categories.find(c => c.id === id);
      if (!category) return;

      await categoriesApi.update(id, category);
      setEditingId(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await categoriesApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('Erro ao eliminar categoria');
    }
  };

  const updateCategory = (id: number, field: string, value: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Categorias</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors flex items-center touch-manipulation min-h-[44px]"
        >
          {showAddForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
          {showAddForm ? 'Cancelar' : 'Criar Categoria'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Adicionar Nova Categoria</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors touch-manipulation min-h-[44px]"
            >
              Criar Categoria
            </button>
          </form>
        </div>
      )}

      {/* Categories List - Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Slug</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Descrição</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{category.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700">{category.slug}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{category.description || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingId(category.id)}
                        className="p-3 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: category.id, name: category.name })}
                        className="p-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories found</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories List - Mobile Card View */}
      <div className="md:hidden space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{category.slug}</p>
              </div>
            </div>

            {category.description && (
              <p className="text-sm text-gray-600 mb-3">{category.description}</p>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setEditingId(category.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                <Edit size={18} />
                <span>Editar</span>
              </button>
              <button
                onClick={() => setDeleteConfirm({ id: category.id, name: category.name })}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                <Trash2 size={18} />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Nenhuma categoria encontrada</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setEditingId(null);
              loadCategories();
            }}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Editar Categoria</h2>
                <button
                  onClick={() => {
                    setEditingId(null);
                    loadCategories();
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
                    value={categories.find(c => c.id === editingId)?.name || ''}
                    onChange={(e) => updateCategory(editingId, 'name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-base"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    value={categories.find(c => c.id === editingId)?.slug || ''}
                    onChange={(e) => updateCategory(editingId, 'slug', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={categories.find(c => c.id === editingId)?.description || ''}
                    onChange={(e) => updateCategory(editingId, 'description', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-base"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleUpdate(editingId)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors touch-manipulation min-h-[48px] font-medium"
                  >
                    <Save size={20} />
                    <span>Guardar</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      loadCategories();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[48px] font-medium"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setDeleteConfirm(null)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Eliminar Categoria</h2>
                <p className="text-gray-600 text-center">
                  Tem a certeza que deseja eliminar a categoria <span className="font-semibold">"{deleteConfirm.name}"</span>?
                </p>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Esta ação não pode ser revertida.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[48px] font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation min-h-[48px] font-medium"
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
