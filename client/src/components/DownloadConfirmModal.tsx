import { X, AlertTriangle, Download } from 'lucide-react';

interface DownloadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName: string;
  remainingDownloads: number;
  loading?: boolean;
}

export default function DownloadConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  remainingDownloads,
  loading = false,
}: DownloadConfirmModalProps) {
  console.log('📋 DownloadConfirmModal render:', { isOpen, fileName, remainingDownloads, loading });

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    console.log('✅ Confirm button clicked in modal');
    onConfirm();
  };

  const handleCloseClick = () => {
    console.log('❌ Close button clicked in modal');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Confirm Download</h2>
          <button
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <p className="text-gray-300 text-sm mb-3">
                This will consume <span className="font-semibold text-amber-500">1 of your {remainingDownloads} remaining download{remainingDownloads !== 1 ? 's' : ''}</span> for:
              </p>
              <div className="bg-white/5 border border-white/10 rounded px-3 py-2 flex items-center gap-2">
                <Download size={16} className="text-amber-500" />
                <span className="font-semibold text-white text-sm">{fileName}</span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Continue with download?
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCloseClick}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-semibold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Starting...
              </>
            ) : (
              <>
                <Download size={18} />
                Start Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
