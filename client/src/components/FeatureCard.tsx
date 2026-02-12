import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isLoaded: boolean;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, isLoaded, delay }) => {
  return (
    <div
      className={`glass-effect p-8 rounded-3xl card-hover transition-all duration-1000 ${isLoaded ? 'apple-scale-in' : 'opacity-0 scale-95'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-6">
        <div className="w-16 h-16 feature-icon-bg rounded-2xl flex items-center justify-center transform transition-all duration-500 hover:scale-110 hover:rotate-6 shadow-2xl">
          <Icon className="w-8 h-8 text-red-400" />
        </div>
      </div>
      <h3 className="text-xl font-bold mb-4 text-white font-display">
        {title}
      </h3>
      <p className="text-gray-300 leading-relaxed font-light text-sm">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;
