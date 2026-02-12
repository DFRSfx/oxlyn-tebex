import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../../utils/apiHelpers';
import { useCategories } from '../../hooks/useCategories';
import { Save, ArrowLeft, X, Upload, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category_id: number;
  stock: number;
  featured: boolean;
  colors?: string[];
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { categories } = useCategories();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category_id: 0,
    stock: 0,
    featured: false,
    colors: []
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchedElement = useRef<HTMLDivElement | null>(null);
  const [touchDragPosition, setTouchDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [mouseDragPosition, setMouseDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id]);



  const loadProduct = async () => {
    try {
      const data = await productsApi.getOne(Number(id));
      if (data) {
        setFormData({
          name: data.name,
          description: data.description,
          price: data.price,
          category_id: Number(data.category_id),
          stock: data.stock,
          featured: data.featured || false,
          colors: data.colors ? (Array.isArray(data.colors) ? data.colors : JSON.parse(data.colors)) : []
        });
        
        // Load existing images from API - they come as image IDs
        if (data.images && Array.isArray(data.images)) {
          const imageIds = data.images.map((img: string) => {
            const match = img.match(/\/image\/(\d+)/);
            return match ? parseInt(match[1]) : null;
          }).filter((id: number | null) => id !== null);
          
          setExistingImages(imageIds);
          setImagePreviews(data.images);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      setError('Falha ao carregar produto');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    // If it's an existing image
    if (index < existingImages.length) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // It's a new file
      const fileIndex = index - existingImages.length;
      setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Move in previews
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      const [movedItem] = newPreviews.splice(fromIndex, 1);
      newPreviews.splice(toIndex, 0, movedItem);
      return newPreviews;
    });

    // Move in existing images or files
    if (fromIndex < existingImages.length && toIndex < existingImages.length) {
      // Both are existing images
      setExistingImages(prev => {
        const newImages = [...prev];
        const [movedItem] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedItem);
        return newImages;
      });
    } else if (fromIndex >= existingImages.length && toIndex >= existingImages.length) {
      // Both are new files
      setSelectedFiles(prev => {
        const newFiles = [...prev];
        const fromFileIndex = fromIndex - existingImages.length;
        const toFileIndex = toIndex - existingImages.length;
        const [movedItem] = newFiles.splice(fromFileIndex, 1);
        newFiles.splice(toFileIndex, 0, movedItem);
        return newFiles;
      });
    } else {
      // Mixed - need to reorganize both arrays
      const allItems = [
        ...existingImages.map((id, i) => ({ type: 'existing' as const, id, preview: imagePreviews[i] })),
        ...selectedFiles.map((file, i) => ({ type: 'new' as const, file, preview: imagePreviews[existingImages.length + i] }))
      ];

      const [movedItem] = allItems.splice(fromIndex, 1);
      allItems.splice(toIndex, 0, movedItem);

      const newExisting = allItems.filter(item => item.type === 'existing').map(item => item.id);
      const newFiles = allItems.filter(item => item.type === 'new').map(item => item.file!);
      const newPreviews = allItems.map(item => item.preview);

      setExistingImages(newExisting);
      setSelectedFiles(newFiles);
      setImagePreviews(newPreviews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.price || !formData.category_id) {
        setError('Por favor, preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }

      // Check if we have at least one image
      if (!isEdit && selectedFiles.length === 0) {
        setError('Por favor, adicione pelo menos uma imagem');
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      
      // Append text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('category', formData.category_id.toString());
      formDataToSend.append('stock', formData.stock.toString());
      formDataToSend.append('featured', formData.featured.toString());
      
      // Append existing images (for edit mode)
      if (isEdit && existingImages.length > 0) {
        console.log('📋 Existing images to keep:', existingImages);
        formDataToSend.append('existingImages', JSON.stringify(existingImages));
      }

      // Append colors
      if (formData.colors && formData.colors.length > 0) {
        formDataToSend.append('colors', JSON.stringify(formData.colors));
      }
      
      // Append new image files
      console.log('📤 Uploading new files:', selectedFiles.length);
      selectedFiles.forEach((file, index) => {
        console.log(`  📸 File ${index + 1}:`, file.name, file.type, file.size);
        formDataToSend.append('images', file);
      });

      // Debug: Log all FormData entries
      console.log('📦 FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}:`, value.name, value.type, value.size);
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      if (isEdit) {
        await productsApi.update(Number(id), formDataToSend);
      } else {
        await productsApi.create(formDataToSend);
      }
      navigate('/admin/produtos');
    } catch (err: any) {
      setError(err.message || 'Falha ao guardar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/admin/produtos')}
          className="p-3 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEdit ? 'Editar Produto' : 'Adicionar Novo Produto'}
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => {
                  const numValue = parseInt(e.target.value, 10);
                  if (!isNaN(numValue)) {
                    setFormData({ ...formData, category_id: numValue });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              >
                <option value={0}>Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destaque
              </label>
              <div className="flex items-center gap-4 h-[42px]">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-gray-700">Produto em Destaque</span>
                </label>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagens do Produto * (a primeira será a principal)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              As imagens serão automaticamente otimizadas e convertidas para WebP para melhor performance
            </p>
            <div className="space-y-4">
              {/* File Upload */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Clique para upload ou tirar foto</span>
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP até 10MB</p>
                    <p className="text-xs text-gray-400 mt-1">Imagens convertidas automaticamente para WebP</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*;capture=camera"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className={`relative group transition-all ${
                        draggedIndex === index ? 'opacity-30 scale-90' : ''
                      } ${
                        dragOverIndex === index ? 'ring-4 ring-primary-500 ring-offset-2 scale-105' : ''
                      }`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', index.toString());

                        // Hide default drag image
                        const img = new Image();
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                        e.dataTransfer.setDragImage(img, 0, 0);

                        // Set initial mouse position
                        setMouseDragPosition({ x: e.clientX, y: e.clientY });

                        // Track mouse position globally during drag
                        const handleMouseMove = (e: MouseEvent) => {
                          setMouseDragPosition({ x: e.clientX, y: e.clientY });
                        };

                        document.addEventListener('dragover', handleMouseMove as any);

                        // Cleanup on drag end
                        const cleanup = () => {
                          document.removeEventListener('dragover', handleMouseMove as any);
                          document.removeEventListener('dragend', cleanup);
                        };
                        document.addEventListener('dragend', cleanup);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                        setMouseDragPosition(null);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        dragCounter.current--;
                        if (dragCounter.current === 0) {
                          setDragOverIndex(null);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        dragCounter.current++;
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        dragCounter.current = 0;
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (!isNaN(fromIndex) && fromIndex !== index) {
                          moveImage(fromIndex, index);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        const rect = e.currentTarget.getBoundingClientRect();
                        touchStartPos.current = {
                          x: touch.clientX - rect.left,
                          y: touch.clientY - rect.top
                        };
                        touchedElement.current = e.currentTarget as HTMLDivElement;

                        // Delay to distinguish between tap and drag
                        dragTimeout.current = setTimeout(() => {
                          if (touchStartPos.current) {
                            setDraggedIndex(index);
                            setTouchDragPosition({ x: touch.clientX, y: touch.clientY });
                            // Prevent scrolling when dragging
                            document.body.style.overflow = 'hidden';
                          }
                        }, 150);
                      }}
                      onTouchMove={(e) => {
                        if (draggedIndex !== index || !touchStartPos.current) {
                          // If not dragging yet, check if moved too much (cancel drag intent)
                          if (touchStartPos.current && dragTimeout.current) {
                            const touch = e.touches[0];
                            const rect = e.currentTarget.getBoundingClientRect();
                            const deltaX = Math.abs(touch.clientX - rect.left - touchStartPos.current.x);
                            const deltaY = Math.abs(touch.clientY - rect.top - touchStartPos.current.y);

                            if (deltaX > 10 || deltaY > 10) {
                              clearTimeout(dragTimeout.current);
                              dragTimeout.current = null;
                            }
                          }
                          return;
                        }

                        e.preventDefault();
                        const touch = e.touches[0];

                        // Update drag position
                        setTouchDragPosition({ x: touch.clientX, y: touch.clientY });

                        const element = document.elementFromPoint(touch.clientX, touch.clientY);

                        // Find if we're over another image container
                        const targetContainer = element?.closest('[data-image-index]');
                        if (targetContainer) {
                          const targetIndex = parseInt(targetContainer.getAttribute('data-image-index') || '-1');
                          if (targetIndex !== -1 && targetIndex !== index) {
                            setDragOverIndex(targetIndex);
                          } else {
                            setDragOverIndex(null);
                          }
                        } else {
                          setDragOverIndex(null);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (dragTimeout.current) {
                          clearTimeout(dragTimeout.current);
                          dragTimeout.current = null;
                        }

                        if (draggedIndex === index && dragOverIndex !== null && dragOverIndex !== index) {
                          moveImage(index, dragOverIndex);
                        }

                        setDraggedIndex(null);
                        setDragOverIndex(null);
                        setTouchDragPosition(null);
                        touchStartPos.current = null;
                        touchedElement.current = null;
                        document.body.style.overflow = '';
                      }}
                      onTouchCancel={(e) => {
                        if (dragTimeout.current) {
                          clearTimeout(dragTimeout.current);
                          dragTimeout.current = null;
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                        setTouchDragPosition(null);
                        touchStartPos.current = null;
                        touchedElement.current = null;
                        document.body.style.overflow = '';
                      }}
                      data-image-index={index}
                    >
                      {/* Remove button - Top left, always visible on mobile */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                        }}
                        className="absolute top-1 left-1 bg-red-500 text-white p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-600 active:bg-red-700 z-20 touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Remover imagem"
                      >
                        <X size={16} />
                      </button>

                      <img
                        src={preview}
                        alt={`Imagem ${index + 1}`}
                        className={`w-full h-32 sm:h-28 md:h-24 object-cover rounded-lg border-2 transition-all pointer-events-none ${
                          index === 0 ? 'border-primary-500' : 'border-gray-200'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro';
                        }}
                      />

                      {/* Drag handle - Always visible on mobile, hover on desktop */}
                      <div className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-move z-10 select-none">
                        <GripVertical size={16} />
                      </div>

                      {/* Image label */}
                      <div className={`absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded ${
                        index === 0 ? 'bg-primary-600' : 'bg-black/50'
                      }`}>
                        {index === 0 ? 'Principal' : `#${index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Floating drag preview for touch devices */}
                {draggedIndex !== null && touchDragPosition && (
                  <div
                    className="fixed pointer-events-none z-[100] md:hidden"
                    style={{
                      left: touchDragPosition.x - 60,
                      top: touchDragPosition.y - 60,
                      width: '120px',
                      height: '120px',
                    }}
                  >
                    <div className="relative w-full h-full animate-pulse-slow">
                      <img
                        src={imagePreviews[draggedIndex]}
                        alt="Arrastando"
                        className="w-full h-full object-cover rounded-lg border-2 border-primary-500 shadow-2xl opacity-90 transform rotate-3"
                      />
                      <div className="absolute inset-0 bg-primary-500/20 rounded-lg"></div>
                      <div className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-2 py-1 rounded font-semibold">
                        {draggedIndex === 0 ? 'Principal' : `#${draggedIndex + 1}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating drag preview for desktop */}
                {draggedIndex !== null && mouseDragPosition && (
                  <div
                    className="fixed pointer-events-none z-[100] hidden md:block"
                    style={{
                      left: mouseDragPosition.x - 60,
                      top: mouseDragPosition.y - 60,
                      width: '120px',
                      height: '120px',
                    }}
                  >
                    <div className="relative w-full h-full animate-pulse-slow">
                      <img
                        src={imagePreviews[draggedIndex]}
                        alt="Arrastando"
                        className="w-full h-full object-cover rounded-lg border-2 border-primary-500 shadow-2xl opacity-90 transform rotate-3"
                      />
                      <div className="absolute inset-0 bg-primary-500/20 rounded-lg"></div>
                      <div className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-2 py-1 rounded font-semibold">
                        {draggedIndex === 0 ? 'Principal' : `#${draggedIndex + 1}`}
                      </div>
                    </div>
                  </div>
                )}
                </>
              )}

              {imagePreviews.length === 0 && (
                <p className="text-sm text-gray-500 text-center">Nenhuma imagem adicionada</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 flex items-center touch-manipulation min-h-[44px]"
            >
              <Save size={20} className="mr-2" />
              {loading ? 'A guardar...' : (isEdit ? 'Atualizar Produto' : 'Criar Produto')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/produtos')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
