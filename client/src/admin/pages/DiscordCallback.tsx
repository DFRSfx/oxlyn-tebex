import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OptimizedImage from '../../components/OptimizedImage';

// Capture token IMMEDIATELY before any re-renders
const urlParams = new URLSearchParams(window.location.search);
const INITIAL_TOKEN = urlParams.get('token');
const INITIAL_ERROR = urlParams.get('error');

export default function DiscordCallback() {
  const navigate = useNavigate();
  const { handleDiscordSuccess } = useAuth();
  const [error, setError] = useState('');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Prevent double execution
    if (processed) {
      //console.log('⚠️ Already processed, skipping...');
      return;
    }

    const handleCallback = async () => {
      setProcessed(true);
      
      let token = INITIAL_TOKEN; // Use the captured token
      const errorParam = INITIAL_ERROR;

     // console.log('🔍 Discord Callback - Processing with captured token:', token ? token.substring(0, 20) + '...' : 'NULL');

      // If no token from initial capture, try URL again
      if (!token) {
        const currentUrlParams = new URLSearchParams(window.location.search);
        token = currentUrlParams.get('token');
        //console.log('🔍 Second try - Token from URL:', token ? token.substring(0, 20) + '...' : 'NULL');
      }

      // If still no token, try cookie
      if (!token) {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
        if (authCookie) {
          token = authCookie.split('=')[1];
          //console.log('✅ Found token in cookie:', token.substring(0, 20) + '...');
        }
      }

      if (errorParam) {
        const errorMessages: Record<string, string> = {
          invalid_request: 'Invalid request. Please try again.',
          invalid_state: 'Security validation failed. Please try again.',
          discord_auth_failed: 'Discord authentication failed. Please try again.',
        };
        setError(errorMessages[errorParam] || 'Authentication failed');
        return;
      }

      if (!token) {
        //console.error('❌ No token found anywhere!');
        //console.log('🔍 All cookies:', document.cookie);
        setError('No authentication token received');
        return;
      }

      try {
        //console.log('✅ Token found, calling handleDiscordSuccess...');
        await handleDiscordSuccess(token);
        //console.log('✅ handleDiscordSuccess completed successfully');
        
        // Check user role after auth and redirect accordingly
        const userData = localStorage.getItem('auth_token');
        if (userData) {
          // Decode JWT to check role (simple base64 decode)
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'admin') {
            setTimeout(() => navigate('/admin'), 1000);
          } else {
            setTimeout(() => navigate('/'), 1000);
          }
        }
      } catch (err: any) {
        //console.error('❌ handleDiscordSuccess failed:', err);
        setError(err.message || 'Failed to authenticate with Discord');
      }
    };

    handleCallback();
  }, [handleDiscordSuccess, navigate, processed]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50">
      {!error ? (
        <>
          <div className="relative flex justify-center items-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-500"></div>
            <OptimizedImage
              src="/logo.webp"
              alt="Loading"
              width={96}
              format="webp"
              className="absolute h-16 w-16"
            />
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Connecting Discord Account</h2>
            <p className="text-gray-400">Please wait while we verify your Discord account...</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to homepage...</p>
        </>
      )}
    </div>
  );
}
