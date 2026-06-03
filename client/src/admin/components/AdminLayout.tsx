import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OptimizedImage from '../../components/OptimizedImage';
import {
  LayoutDashboard,
  ShoppingCart,
  Menu,
  LogOut,
  User,
  ArrowLeft,
  X,
  Download,
  BarChart3,
  Users,
  TrendingUp,
  Tag as TagIcon,
  ArrowUpDown,
  Package as PackageIcon,
  FolderTree,
  Star,
  Timer,
  Receipt,
  Globe,
  Archive
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Painel', path: '/admin', icon: LayoutDashboard },
    { name: 'Estatísticas', path: '/admin/estatisticas', icon: BarChart3 },
    { name: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { name: 'Vanguard Analytics', path: '/admin/analytics-vanguard', icon: Archive },
    { name: 'Pedidos', path: '/admin/compras', icon: ShoppingCart },
    { name: 'Downloads', path: '/admin/downloads', icon: Download },
    { name: 'Utilizadores', path: '/admin/utilizadores', icon: Users },
    { name: 'Tags', path: '/admin/tags', icon: TagIcon },
    { name: 'Bundles', path: '/admin/bundles', icon: PackageIcon },
    { name: 'Categorias', path: '/admin/categorias', icon: FolderTree },
    { name: 'Ordem', path: '/admin/ordem', icon: ArrowUpDown },
    { name: 'Top Scripts', path: '/admin/top-sellers', icon: Star },
    { name: 'Countdown', path: '/admin/countdown', icon: Timer },
    { name: 'Recent Payments', path: '/admin/recent-payments', icon: Receipt },
    { name: 'IP Connection', path: '/admin/ip-connections', icon: Globe },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-[#0f0f0f] border-r border-white/5 transform transition-transform duration-300 flex flex-col
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header with Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <OptimizedImage src="/logo.webp" alt="OXLYN Logo" width={64} format="webp" className="h-10 w-auto transition-transform duration-300 hover:scale-110 logo-glow"/>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Painel Admin</h1>
              <p className="text-[10px] text-gray-500">Loja Oxlyn</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Back to Website Link */}
        <div className="p-3 border-b border-white/5 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-sm"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Site</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm
                  ${active 
                    ? 'bg-amber-500/10 text-amber-500 font-medium' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2 px-3 py-2.5 bg-white/5 rounded-lg">
            {user?.discordAvatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`}
                alt={user.discordUsername}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center">
                <User size={16} className="text-amber-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.discordUsername || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.role === 'admin' ? 'Administrator' : 'User'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-sm"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-[#0f0f0f] border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-400 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <h2 className="text-sm font-semibold text-white">
                {menuItems.find(item => isActive(item.path))?.name || 'Painel Admin'}
              </h2>
              <p className="text-xs text-gray-500">Gerir a sua loja</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
