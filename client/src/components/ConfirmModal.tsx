import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/30',
      button: 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50',
    },
    warning: {
      icon: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/30',
      button: 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50',
    },
    info: {
      icon: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/30',
      button: 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <div className={`${styles.bg} border rounded-lg p-4 mb-6`}>
          <div className="flex gap-3">
            <AlertTriangle className={`${styles.icon} flex-shrink-0 mt-0.5`} size={24} />
            <p className="text-gray-300 text-sm">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${styles.button} text-black font-semibold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Carregando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
