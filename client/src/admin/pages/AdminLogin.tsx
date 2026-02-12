import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const { getDiscordAuthUrl, isDiscordLinked } = useAuth();
  const [error, setError] = useState('');

  const handleDiscordLogin = async () => {
    try {
      const authUrl = await getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      setError(error.message || 'Failed to initiate Discord login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <Lock className="text-amber-700" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-600 mt-2">
              Sign in with Discord to manage your store
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="text-red-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isDiscordLinked ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-800 text-center">
                ✓ Discord account linked successfully!
              </p>
              <p className="text-xs text-green-600 text-center mt-1">
                Redirecting to admin panel...
              </p>
            </div>
          ) : (
            <button
              onClick={handleDiscordLogin}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 127 96" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
              Sign in with Discord
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Protected area. Authorized personnel only.
        </p>
      </div>
    </div>
  );
}
