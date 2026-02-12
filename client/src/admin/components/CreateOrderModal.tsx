import { useState } from 'react';
import { X, Plus, DollarSign } from 'lucide-react';
import { API_URL } from '../../config/api';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({ onClose, onSuccess }: CreateOrderModalProps) {
  const [formData, setFormData] = useState({
    discord_user_id: '',
    product_name: '',
    price: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.discord_user_id || !formData.product_name || !formData.price) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('O preço deve ser um número positivo');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          discord_user_id: formData.discord_user_id,
          product_name: formData.product_name,
          price: price,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao criar pedido');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Erro de rede. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Criar Pedido</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ID do Utilizador Discord *
              </label>
              <input
                type="text"
                value={formData.discord_user_id}
                onChange={(e) => setFormData({ ...formData, discord_user_id: e.target.value })}
                placeholder="123456789012345678"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                O ID do utilizador Discord do cliente
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="Premium Script v1.0"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome do produto vendido
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preço (€) *
              </label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="49.99"
                  className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                O preço de compra em euros
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Criando...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Criar Pedido
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
