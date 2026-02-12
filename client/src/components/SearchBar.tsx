import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Package } from '../types';
import { formatCategoryName } from '../utils/helpers';

interface SearchBarProps {
  packages: Package[];
  onSelectPackage: (pkg: Package) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ packages, onSelectPackage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPackages([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query) ||
        pkg.frameworks.some((fw) => fw.toLowerCase().includes(query))
    );

    setFilteredPackages(results);
    setIsOpen(results.length > 0);
  }, [searchQuery, packages]);

  const handleSelectPackage = (pkg: Package) => {
    setSearchQuery('');
    setIsOpen(false);
    onSelectPackage(pkg);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative group">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
        <input
          type="text"
          className="w-48 rounded-lg border px-3 py-1.5 text-sm outline-none pl-8 pr-8 border-gray-700/40 hover:border-gray-600/60 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-white placeholder:text-gray-500"
          style={{ background: '#151515' }}
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (filteredPackages.length > 0) {
              setIsOpen(true);
            }
          }}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && filteredPackages.length > 0 && (
        <div className="absolute right-0 mt-2 w-96 border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200" style={{ background: 'rgba(23, 23, 23, 0.98)' }}>
          <div className="max-h-96 overflow-y-auto">
            {filteredPackages.map((pkg) => {
              const discount = Math.round(
                ((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100
              );

              return (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className="flex items-start gap-3 p-3 transition-colors duration-150 hover:bg-gray-800/60 w-full text-left border-b border-gray-800/50 last:border-0"
                >
                  <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-800">
                    <img
                      alt={pkg.name}
                      src={pkg.image}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white mb-1">
                      {pkg.name}
                    </p>
                    {pkg.category && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 mb-2">
                        {formatCategoryName(pkg.category.name)}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-orange-500">
                        {pkg.price.toFixed(2)} EUR
                      </span>
                      {pkg.originalPrice > pkg.price && (
                        <>
                          <span className="text-xs text-gray-500 line-through">
                            {pkg.originalPrice.toFixed(2)} EUR
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">
                            -{discount}%
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {pkg.frameworks.slice(0, 3).map((fw) => (
                        <span
                          key={fw}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 uppercase font-medium"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-800/80 px-4 py-2.5 bg-gray-800/40">
            <p className="text-xs text-gray-400 text-center">
              {filteredPackages.length} result{filteredPackages.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
