import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminLogin() {
  const { getDiscordAuthUrl, isDiscordLinked } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDiscordLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = await getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      setError(error.message || 'Failed to initiate Discord login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="max-w-md w-full relative z-10">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30 rounded-2xl blur-xl opacity-50" />

        <div className="relative bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl p-8 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-5">
              <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Shield className="text-white" size={28} strokeWidth={2.5} />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">Admin Access</span>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Painel de Administração</h1>
            <p className="text-sm text-gray-400">
              Inicia sessão com Discord para gerir a tua loja
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="text-red-400 mt-0.5 mr-3 flex-shrink-0" size={20} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Action area */}
          {isDiscordLinked ? (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-emerald-300">
                  Conta Discord ligada com sucesso!
                </p>
              </div>
              <p className="text-xs text-emerald-400/70 text-center mt-2">
                A redirecionar para o painel de administração...
              </p>
            </div>
          ) : (
            <button
              onClick={handleDiscordLogin}
              disabled={isLoading}
              className="group relative w-full overflow-hidden bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-[#5865F2]/30 hover:shadow-[#5865F2]/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  <span className="relative">A redirecionar...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 relative" viewBox="0 0 127 96" fill="currentColor">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                  </svg>
                  <span className="relative">Iniciar Sessão com Discord</span>
                </>
              )}
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Seguro</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <p className="text-center text-xs text-gray-500 leading-relaxed">
            Área protegida. Apenas pessoal autorizado tem acesso.
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Tens problemas para iniciar sessão? Contacta o suporte.
        </p>
      </div>
    </div>
  );
}