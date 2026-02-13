import { X, AlertTriangle, Download, CheckCircle, Package } from 'lucide-react';

interface DownloadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onClaimScripts: () => void;
  fileName: string;
  remainingDownloads: number;
  loading?: boolean;
  downloaded?: boolean;
}

export default function DownloadConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onClaimScripts,
  fileName,
  remainingDownloads,
  loading = false,
  downloaded = false,
}: DownloadConfirmModalProps) {
  if (!isOpen) return null;

  // Post-download state: show claim option
  if (downloaded) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Download Started</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={22} />
            </button>
          </div>

          {/* Success indicator */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="text-green-400" size={32} />
            </div>
            <p className="text-white font-semibold mb-1">{fileName}</p>
            <p className="text-gray-400 text-sm">Your download has started successfully.</p>
          </div>

          <div className="h-px bg-white/[0.06] mb-6" />

          {/* Claim scripts section */}
          <div className="bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FF9500]/10 rounded-lg mt-0.5">
                <Package className="text-[#FF9500]" size={18} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">Claim Your Scripts</p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Get your scripts added to your Keymaster account via Tebex checkout. You'll be redirected to authenticate with FiveM.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium px-4 py-3 rounded-lg transition-colors text-sm"
            >
              Close
            </button>
            <button
              onClick={onClaimScripts}
              className="flex-1 button-primary text-white font-semibold px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Package size={16} />
              Claim Scripts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default confirm state
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Confirm Download</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X size={22} />
          </button>
        </div>

        <div className="bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="text-[#FF9500] flex-shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <p className="text-gray-300 text-sm mb-3">
                This will consume <span className="font-semibold text-[#FF9500]">1 of your {remainingDownloads} remaining download{remainingDownloads !== 1 ? 's' : ''}</span> for:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                <Download size={15} className="text-[#FF9500]" />
                <span className="font-semibold text-white text-sm">{fileName}</span>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Continue with download?
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium px-4 py-3 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 button-primary disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/60"></div>
                Starting...
              </>
            ) : (
              <>
                <Download size={17} />
                Start Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
