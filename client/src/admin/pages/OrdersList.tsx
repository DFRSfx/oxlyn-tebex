import { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import CreateOrderModal from '../components/CreateOrderModal';
import ConfirmModal from '../../components/ConfirmModal';
import { API_URL } from '../../config/api';

interface Order {
  id: number;
  discord_user_id: string;
  product_name: string;
  price: number;
  status: string;
  created_at: string;
  created_by_admin_id: string | null;
}

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null }>({
    show: false,
    id: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders/list`, {
        credentials: 'include',
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/orders/${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchOrders();
        setDeleteConfirm({ show: false, id: null });
      } else {
        alert('Falha ao eliminar pedido');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Falha ao eliminar pedido');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Pedidos</h1>
          <p className="text-gray-400">Gerir pedidos de clientes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Adicionar Pedido
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum Pedido Ainda</h3>
          <p className="text-gray-400">Crie o seu primeiro pedido para começar</p>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30 border-b border-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">ID do Pedido</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">ID do Utilizador Discord</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Produto</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Preço</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Criado</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">#{order.id}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                      {order.discord_user_id}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {order.product_name}
                    </td>
                    <td className="px-4 py-3 text-amber-500 font-semibold">
                      €{Number(order.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-medium">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteClick(order.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Eliminar pedido"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOrders();
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Pedido"
        message="Tem certeza que deseja eliminar este pedido? Esta ação não pode ser desfeita."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
