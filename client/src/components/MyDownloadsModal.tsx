import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Download, Package, X, Gift } from 'lucide-react';
import ClaimTokenModal from './ClaimTokenModal';
import DownloadConfirmModal from './DownloadConfirmModal';
import CheckoutModal from './CheckoutModal';
import Loader from './Loader';
import { API_URL } from '../config/api';

interface DownloadItem {
  id: number;
  token: string;
  file_name: string;
  remaining_downloads: number;
  max_downloads: number;
  claimed_at: string;
  last_download_at?: string;
}

interface MyDownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyDownloadsModal({ isOpen, onClose }: MyDownloadsModalProps) {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAvailableTokens, setHasAvailableTokens] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [confirmDownload, setConfirmDownload] = useState<{
    token: string;
    fileName: string;
    remainingDownloads: number;
  } | null>(null);
  const [downloadingToken, setDownloadingToken] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && user?.discordId) {
      fetchDownloads();
      checkAvailableTokens();
    }
  }, [isOpen, user]);

  const fetchDownloads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/downloads/my-downloads`, {
        credentials: 'include',
      });
      const data = await response.json();
      setDownloads(data.downloads || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailableTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/downloads/available`, {
        credentials: 'include',
      });
      const data = await response.json();
      setHasAvailableTokens(data.hasAvailableTokens);
    } catch (error) {
      console.error('Error checking tokens:', error);
    }
  };

  const handleDownloadClick = (token: string, fileName: string, remainingDownloads: number) => {
    console.log('🔵 Download clicked:', { token, fileName, remainingDownloads });
    setConfirmDownload({ token, fileName, remainingDownloads });
  };

  const downloadPackageScripts = async () => {
    const TEBEX_API_BASE = 'https://headless.tebex.io/api';
    const TEBEX_TOKEN = 'rnzg-c64b4c58bc9563a37c956af67b1e357a2a414208';

    try {
      setIsProcessingCheckout(true);
      setCheckoutMessage('Fetching packages...');

      // First, fetch all packages to find the correct package ID
      console.log('📦 Fetching packages from webstore...');
      const packagesResponse = await fetch(`${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/packages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!packagesResponse.ok) {
        console.error('❌ Failed to fetch packages');
        setIsProcessingCheckout(false);
        return;
      }

      const packagesData = await packagesResponse.json();
      console.log('📋 Available packages:', packagesData.data);

      // Find package with "OXLYN PACK" in the name
      setCheckoutMessage('Finding OXLYN PACK...');
      const oxlynPackage = packagesData.data?.find((pkg: any) =>
        pkg.name?.toUpperCase().includes('OXLYN PACK')
      );

      if (!oxlynPackage) {
        console.error('❌ Could not find OXLYN PACK package');
        console.log('📋 Available package names:');
        packagesData.data?.forEach((pkg: any) => {
          console.log(`  - ${pkg.name}`);
        });
        setIsProcessingCheckout(false);
        return;
      }

      const packageId = oxlynPackage.id;
      console.log(`📦 Found OXLYN PACK: "${oxlynPackage.name}" (ID: ${packageId})`);

      // Step 1: Create a new basket
      setCheckoutMessage('Creating basket...');
      const basketResponse = await fetch(`${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complete_auto_redirect: true,
        }),
      });

      if (!basketResponse.ok) {
        console.error('❌ Failed to create basket');
        setIsProcessingCheckout(false);
        return;
      }

      const basketData = await basketResponse.json();
      const basketIdent = basketData.data?.ident;

      if (!basketIdent) {
        console.error('❌ No basket identifier received');
        setIsProcessingCheckout(false);
        return;
      }

      console.log('✅ Basket created:', basketIdent);

      // Step 2: Authenticate basket with FiveM
      setCheckoutMessage('Getting authentication...');
      console.log('🔐 Getting FiveM authentication URL...');
      const returnUrl = encodeURIComponent(window.location.href);
      const authUrlResponse = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}/auth?returnUrl=${returnUrl}`
      );

      if (!authUrlResponse.ok) {
        console.error('❌ Failed to get FiveM auth URL');
        setIsProcessingCheckout(false);
        return;
      }

      const authData = await authUrlResponse.json();
      const fiveMAuthUrl = authData[0]?.url;

      if (!fiveMAuthUrl) {
        console.error('❌ No FiveM auth URL received');
        setIsProcessingCheckout(false);
        return;
      }

      console.log('🔐 FiveM auth required, redirecting...');
      setCheckoutMessage('Redirecting to FiveM authentication...');

      // Store basket info and package ID in localStorage to continue after auth
      localStorage.setItem('tebex_pending_basket', JSON.stringify({
        basketIdent,
        packageId,
        token: TEBEX_TOKEN
      }));

      // Redirect to FiveM authentication
      setTimeout(() => {
        window.location.href = fiveMAuthUrl;
      }, 500);
      return;

    } catch (error) {
      console.error('❌ Error during Tebex checkout:', error);
      setIsProcessingCheckout(false);
    }
  };

  const handleConfirmDownload = () => {
    console.log('🟢 Confirm download called, confirmDownload:', confirmDownload);

    if (!confirmDownload) {
      console.log('🔴 No confirmDownload data, returning');
      return;
    }

    console.log('🟡 Setting downloading token:', confirmDownload.token);
    setDownloadingToken(confirmDownload.token);

    // Create a temporary anchor element to trigger download
    const downloadUrl = `${API_URL}/downloads/file/${confirmDownload.token}`;
    console.log('🟣 Creating download link:', downloadUrl);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = confirmDownload.fileName;
    link.style.display = 'none';
    document.body.appendChild(link);

    console.log('🔵 Clicking download link');
    link.click();

    console.log('🟢 Removing link from DOM');
    document.body.removeChild(link);

    // Download package scripts after main file download
    setTimeout(() => {
      downloadPackageScripts();
    }, 500);

    console.log('🟡 Closing confirmation modal');
    setConfirmDownload(null);

    setTimeout(() => {
      console.log('⏰ Clearing downloading state and refreshing');
      setDownloadingToken(null);
      fetchDownloads();
    }, 3000);
  };

  const handleCancelDownload = async (token: string) => {
    // Clear downloading state
    setDownloadingToken(null);

    // Call server to restore download credit
    try {
      const response = await fetch(`${API_URL}/downloads/cancel/${token}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.restored) {
          console.log('✅ Download cancelled and credit restored');
        } else {
          console.log('⚠️ Download cancelled (credit not restored - may have exceeded time limit)');
        }
      }
    } catch (error) {
      console.error('Error calling cancel endpoint:', error);
    }

    // Refresh downloads to update remaining count
    setTimeout(() => {
      fetchDownloads();
    }, 500);
  };

  const handleClaimSuccess = () => {
    setShowClaimModal(false);
    fetchDownloads();
    checkAvailableTokens();
  };

  if (!isOpen) return null;

  // Show loader during checkout process
  if (isProcessingCheckout) {
    return <Loader message={checkoutMessage} />;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0f0f0f] border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Package className="text-amber-500" size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">My Downloads</h2>
                <p className="text-sm text-gray-400">Manage your download tokens</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Claim Token Button */}
            {hasAvailableTokens && (
              <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gift className="text-amber-500" size={24} />
                    <div>
                      <h3 className="font-semibold text-white">New Token Available!</h3>
                      <p className="text-sm text-gray-400">You have unclaimed download tokens</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    Claim Now
                  </button>
                </div>
              </div>
            )}

            {/* Downloads List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : downloads.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-600 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Downloads Yet</h3>
                <p className="text-gray-500 mb-6">
                  {hasAvailableTokens
                    ? 'You have unclaimed tokens! Click "Claim Now" above to get started.'
                    : 'You don\'t have any downloads available at the moment.'}
                </p>
                {!hasAvailableTokens && (
                  <button
                    onClick={onClose}
                    className="bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {downloads.map((item) => {
                  const hasDownloadsLeft = item.remaining_downloads > 0;
                  const isCurrentlyDownloading = downloadingToken === item.token;

                  return (
                    <div
                      key={item.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">{item.file_name}</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">
                              Downloads: <span className={`font-semibold ${hasDownloadsLeft ? 'text-amber-500' : 'text-red-500'}`}>
                                {item.remaining_downloads} / {item.max_downloads}
                              </span> {hasDownloadsLeft ? 'remaining' : 'used'}
                            </span>
                            {item.last_download_at && (
                              <span className="text-gray-500">
                                Last: {new Date(item.last_download_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Download Button */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleDownloadClick(item.token, item.file_name, item.remaining_downloads)}
                            disabled={!hasDownloadsLeft || isCurrentlyDownloading}
                            className={`font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                              !hasDownloadsLeft
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : isCurrentlyDownloading
                                ? 'bg-amber-600 text-black cursor-wait'
                                : 'bg-amber-500 hover:bg-amber-600 text-black'
                            }`}
                          >
                            <Download size={18} />
                            {!hasDownloadsLeft ? 'No Downloads Available' : isCurrentlyDownloading ? 'Downloading...' : 'Download'}
                          </button>

                          {isCurrentlyDownloading && (
                            <button
                              onClick={() => handleCancelDownload(item.token)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Cancel Download
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                {downloads.length} download{downloads.length !== 1 ? 's' : ''} total
                {downloads.length > 0 && (
                  <span className="ml-2 text-amber-500">
                    • {downloads.filter(d => d.remaining_downloads > 0).length} available
                  </span>
                )}
              </span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Token Modal */}
      {showClaimModal && (
        <ClaimTokenModal
          onClose={() => setShowClaimModal(false)}
          onSuccess={handleClaimSuccess}
        />
      )}

      {/* Download Confirmation Modal */}
      <DownloadConfirmModal
        isOpen={confirmDownload !== null}
        fileName={confirmDownload?.fileName || ''}
        remainingDownloads={confirmDownload?.remainingDownloads || 0}
        onConfirm={handleConfirmDownload}
        onClose={() => setConfirmDownload(null)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        checkoutUrl={checkoutUrl}
        onClose={() => setShowCheckoutModal(false)}
      />
    </>
  );
}
