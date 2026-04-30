import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, ShoppingBag, Euro } from 'lucide-react';
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
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
          <div className="relative animate-spin rounded-full h-12 w-12 border-2 border-amber-500/20 border-t-amber-500"></div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.price), 0);
  const completedCount = orders.filter(o => o.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Premium Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a1410]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="text-amber-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Pedidos</h1>
              <p className="text-sm text-gray-400 mt-0.5">Gerir pedidos de clientes</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <Plus size={18} className="relative" />
            <span className="relative">Adicionar Pedido</span>
          </button>
        </div>

        {/* Quick stats */}
        {orders.length > 0 && (
          <div className="relative px-6 pb-5 grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Total Pedidos</p>
              <p className="text-xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold mb-1">Concluídos</p>
              <p className="text-xl font-bold text-emerald-400">{completedCount}</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
              <p className="text-[10px] text-amber-400/80 uppercase tracking-widest font-semibold mb-1">Receita Total</p>
              <p className="text-xl font-bold text-amber-400">€{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05),transparent_70%)]" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl mb-5">
              <Package className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum Pedido Ainda</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Crie o seu primeiro pedido para começar a registar vendas
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02]"
            >
              <Plus size={18} />
              Criar Primeiro Pedido
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Discord ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Produto</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Preço</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Estado</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Criado</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-bold font-mono text-sm">#{order.id}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-sm">
                      {order.discord_user_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-amber-500/10">
                          <Package className="text-amber-400" size={14} />
                        </div>
                        <span className="text-white font-medium group-hover:text-amber-400 transition-colors">{order.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
                        <Euro size={13} />
                        {Number(order.price).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ring-1 ${
                        order.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === 'completed' ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'
                        }`} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteClick(order.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Eliminar pedido"
                      >
                        <Trash2 size={16} />
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