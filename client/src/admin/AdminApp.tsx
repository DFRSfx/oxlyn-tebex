import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import OrdersList from './pages/OrdersList';
import DownloadTokensManager from './pages/DownloadTokensManager';
import StatisticsPage from './pages/StatisticsPage';
import UsersAndActivityPage from './pages/UsersAndActivityPage';

export default function AdminApp() {
  const { user, isAuthenticated } = useAuth();

  // Check if user is authenticated and is admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center bg-gray-800/95  p-8 rounded-2xl border border-amber-500/20 shadow-2xl max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-gray-400 mb-6">Precisa de privilégios de administrador para aceder a esta área.</p>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all font-medium"
          >
            Voltar à Página Inicial
          </a>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estatisticas" element={<StatisticsPage />} />
        <Route path="/compras" element={<OrdersList />} />
        <Route path="/downloads" element={<DownloadTokensManager />} />
        <Route path="/utilizadores" element={<UsersAndActivityPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
