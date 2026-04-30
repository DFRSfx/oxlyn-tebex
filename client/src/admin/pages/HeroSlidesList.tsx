import { ImageIcon, Sparkles, Plus } from 'lucide-react';

export default function HeroSlidesList() {
  return (
    <div className="space-y-6">
      {/* Premium Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#0c1518]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                <ImageIcon className="text-cyan-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Hero Slides</h1>
              <p className="text-sm text-gray-400 mt-0.5">Gerir os slides do carrossel principal da página inicial</p>
            </div>
          </div>

          <button
            disabled
            className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            <span>Adicionar Slide</span>
          </button>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)]" />

        {/* Floating decorations */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/40 rounded-full animate-pulse" />
        <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-amber-400/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-16 left-1/4 w-1 h-1 bg-purple-400/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-10 right-1/3 w-2 h-2 bg-emerald-400/40 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />

        <div className="relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl mb-5 relative">
            <ImageIcon className="w-10 h-10 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Em Breve</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-3">Gestão de Hero Slides</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
            Em breve poderás gerir os slides do carrossel principal da tua página inicial.
            Adiciona imagens, títulos, descrições e botões de ação personalizados.
          </p>

          {/* Feature preview list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto mt-8">
            <FeaturePreview
              title="Upload de Imagens"
              description="Carrega imagens de alta qualidade para os teus slides"
            />
            <FeaturePreview
              title="Personalização"
              description="Define títulos, descrições e CTAs únicos"
            />
            <FeaturePreview
              title="Reordenação"
              description="Arrasta e solta para reorganizar os slides"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePreview({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-left hover:border-white/10 transition-colors">
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}