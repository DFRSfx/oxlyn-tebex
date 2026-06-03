import React from 'react';
import { Users, Code2, Sparkles, Github, Twitter } from 'lucide-react';

interface TeamPageProps {
  isLoaded: boolean;
}

const TeamPage: React.FC<TeamPageProps> = ({ isLoaded }) => {
  const founders = [
    {
      name: '⌞OXLYN⌝ | OX',
      role: 'Fundador Principal & Desenvolvedor',
      description: 'Visionário por trás da OXLYN Software, liderando o desenvolvimento de scripts premium para FiveM.',
      gradient: 'from-orange-500 to-red-500',
      icon: '🚀',
    },
    {
      name: '⌞OXLYN⌝ | Soares',
      role: 'CO-Fundador & Desenvolvedor',
      description: 'Especialista em desenvolvimento e otimização, garantindo a qualidade e performance dos nossos produtos.',
      gradient: 'from-red-500 to-orange-500',
      icon: '⚡',
    },
  ];

  return (
    <div className="min-h-screen pt-8 pb-20 relative">
      {/* Same background as other pages */}
      <div className="absolute inset-0 grid-background opacity-20" />
      <div className="hero-gradient-enhanced absolute inset-0" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="geometric-shape geometric-shape-1" />
        <div className="geometric-shape geometric-shape-2" />
        <div className="geometric-shape geometric-shape-3" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className={`text-center mb-20 transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`}>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 mb-8">
            <Users className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Meet the Team</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight">
            Os <span className="gradient-text-brand">Fundadores</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
            Conheça a equipa por trás da OXLYN Software, dedicada a criar scripts premium para FiveM
          </p>
        </div>

        {/* Founders Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {founders.map((founder, index) => (
            <div
              key={index}
              className={`group relative transition-all duration-1000 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`}
              style={{ transitionDelay: `${600 + index * 200}ms` }}
            >
              {/* Card */}
              <div className="relative h-full p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-black/90 border border-zinc-800 hover:border-orange-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/10 group-hover:to-red-500/10 transition-all duration-500" />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${founder.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 text-4xl`}>
                    {founder.icon}
                  </div>

                  {/* Name */}
                  <h2 className="text-2xl font-black text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {founder.name}
                  </h2>

                  {/* Role */}
                  <div className={`inline-block px-4 py-1.5 rounded-lg bg-gradient-to-r ${founder.gradient} bg-opacity-20 border border-orange-500/30 mb-4`}>
                    <p className="text-sm font-bold text-orange-400 uppercase tracking-wider">
                      {founder.role}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-base leading-relaxed mb-6">
                    {founder.description}
                  </p>

                  {/* Stats/Features */}
                  <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Code2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Developer</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">Founder</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-20 transition-all duration-1400 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '1000ms' }}>
          <div className="inline-block p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-black/90 border border-zinc-800">
            <h3 className="text-2xl font-bold text-white mb-3">
              Junte-se à Nossa Comunidade
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Faça parte da comunidade OXLYN e tenha acesso a suporte dedicado e atualizações exclusivas
            </p>
            <button
              onClick={() => window.open('https://discord.com/invite/KjWmrSwMXg', '_blank')}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50 flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
              </svg>
              Entrar no Discord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
