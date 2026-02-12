import React, { useState, useEffect } from 'react';                                                                                                  
import { formatCategoryName } from '../utils/helpers';                                                                                                  
import { Package, Category } from '../types';
import PackageCard from '../components/PackageCard';
import FilterButton from '../components/FilterButton';
import { tebexService } from '../services/tebexService';

interface ScriptsPageProps {
  isLoaded: boolean;
  packages: Package[];
  openPackageDetails: (pkg: Package) => void;
}

const ScriptsPage: React.FC<ScriptsPageProps> = ({
  isLoaded,
  packages,
  openPackageDetails,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const tebexCategories = await tebexService.fetchCategories();

        const mappedCategories: Category[] = tebexCategories
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            order: cat.order,
          }))
          // Mostrar apenas categorias "escrow" e "open source"
          .filter(cat => {
            const slugLower = cat.slug?.toLowerCase() || '';
            const nameLower = cat.name?.toLowerCase() || '';
            return (
              slugLower.includes('escrow') ||
              slugLower.includes('open-source') ||
              slugLower.includes('opensource') ||
              nameLower.includes('escrow') ||
              nameLower.includes('open source') ||
              nameLower.includes('opensource')
            );
          });

        setCategories(mappedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Filter packages based on the selected category
  // Também filtrar packages que contenham "vanguard" na descrição
  const filteredPackages = (selectedCategory === 'all'
    ? packages
    : packages.filter(pkg => pkg.category?.id === selectedCategory))
    .filter(pkg => !pkg.description?.toLowerCase().includes('vanguard'));

  return (
    <section className="py-32 relative min-h-screen">
    <div className="max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className={`text-center mb-16 transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`}>
        <h2 className="text-5xl md:text-6xl font-black mb-8 text-white font-display">
          Our <span className="gradient-text-brand">Scripts</span>
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
          {packages.length > 0
            ? "Explore our complete collection of premium scripts"
            : "We're cooking up the best scripts just for you — greatness is on the way."}
        </p>
      </div>

      {/* Category Filter Buttons */}
      {!isLoadingCategories && categories.length > 0 && packages.length > 0 && (
        <div className={`flex flex-wrap justify-center gap-4 mb-16 transition-all duration-1000 ${isLoaded ? 'apple-scale-in' : 'opacity-0 scale-95'}`} style={{ transitionDelay: '200ms' }}>
          <FilterButton
            label="All"
            value="all"
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {categories
            .sort((a, b) => a.order - b.order)
            .map(category => (
              <FilterButton
                key={category.id}
                label={formatCategoryName(category.name)}
                value={category.id}
                active={selectedCategory === category.id}
                onClick={(value) => setSelectedCategory(value as number)}
              />
            ))}
        </div>
      )}

      {/* Scripts Grid or Empty State */}
      {filteredPackages.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-8" style={{ gridAutoRows: '1fr' }}>
          {filteredPackages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onClick={openPackageDetails}
              isLoaded={isLoaded}
              delay={400 + index * 200}
            />
          ))}
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center py-20 transition-all duration-1000 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-10'}`}>
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50">
              <svg 
                className="w-20 h-20 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-4 font-display">
            No Scripts Found
          </h3>
          {selectedCategory !== 'all' && (
            <p className="text-gray-400 text-lg mb-2 max-w-md text-center">
              Nothing here yet in this category. We're crafting top-tier scripts worth the wait.
            </p>
          )}
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
            >
              View All Scripts
            </button>
          )}
        </div>
      )}
    </div>
  </section>

  );
};

export default ScriptsPage;
