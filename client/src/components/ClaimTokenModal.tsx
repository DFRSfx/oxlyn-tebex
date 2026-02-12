import { useState } from 'react';
import { X, Package } from 'lucide-react';
import { API_URL } from '../config/api';

interface ClaimTokenModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimTokenModal({ onClose, onSuccess }: ClaimTokenModalProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    if (!token.startsWith('oxlyn-')) {
      setError('Invalid token format. Token must start with "oxlyn-"');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/downloads/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to claim token');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Package className="text-amber-500" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Claim Your Order</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter your token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="oxlyn-..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the unique token you received for your purchase
            </p>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-4 py-3 rounded-lg transition-colors"
            >
              {loading ? 'Claiming...' : 'Claim Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
