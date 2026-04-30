import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ScriptsPage from './pages/ScriptsPage';
import CartPage from './pages/CartPage';
import PackageDetailsPage from './pages/PackageDetailsPage';
import CheckoutCancelled from './pages/CheckoutCancelled';
import TermsPage from './pages/TermsPage';
import CheckoutModal from './components/CheckoutModal';
import AdminApp from './admin/AdminApp';
import DiscordCallback from './admin/pages/DiscordCallback';
import { useAuth } from './context/AuthContext';
import { Package } from './types';
import { scrollToSection, handleDiscordRedirect, handleTebexRedirect } from './utils/helpers';
import { useTebex } from './context/TebexContext';
import { tebexService } from './services/tebexService';
import { mapTebexPackageToPackage } from './utils/packageMapper';
import Loader from './components/Loader';
import { useAnalytics } from './hooks/useAnalytics';
import { launchTebexCheckout } from './utils/tebexCheckout';
import './styles/App.css';



const TEBEX_API_BASE = 'https://headless.tebex.io/api';

async function completeTebexBasket(basketIdent: string, packageId: number) {
  try {
    // Add package to basket (user is now authenticated via Tebex auth flow)
    const addResponse = await fetch(`${TEBEX_API_BASE}/baskets/${basketIdent}/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, quantity: 1 }),
    });

    if (!addResponse.ok) {
      console.error('Failed to add package after auth:', addResponse.status, await addResponse.text());
      return;
    }

    // Open the Tebex checkout modal in-page using the basket ident
    launchTebexCheckout(basketIdent);
  } catch (error) {
    console.error('Failed to complete Tebex basket:', error);
  }
}

function App() {
  const { isLoading: isTebexLoading, loadingMessage, isCheckoutOpen, checkoutUrl, closeCheckout, enrichCartWithPackageData } = useTebex();
  const { user, isAuthenticated, isDiscordLinked, loading: authLoading } = useAuth();

  // Handle Tebex basket auth callback (redirected back after game account login)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tebexIdent = params.get('tebex_ident');
    const tebexPkg = params.get('tebex_pkg');

    if (tebexIdent && tebexPkg) {
      window.history.replaceState({}, '', window.location.pathname);
      completeTebexBasket(tebexIdent, parseInt(tebexPkg, 10));
    }
  }, []);

  // Check if we're on the checkout-cancelled page
  if (window.location.pathname === '/checkout-cancelled') {
    return <CheckoutCancelled />;
  }
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Sections intersection logic if needed
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    document.querySelectorAll('[id]').forEach((el) => observer.observe(el));

    // Fetch packages from Tebex API (only on mount)
    const fetchPackages = async () => {
      setIsLoadingPackages(true);
      try {
        const tebexPackages = await tebexService.fetchPackages();
        const mappedPackages = tebexPackages.map(mapTebexPackageToPackage);
        setPackages(mappedPackages);
        enrichCartWithPackageData(mappedPackages);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
        setPackages([]); // Set empty array on error
      } finally {
        setIsLoadingPackages(false);
      }
    };

    fetchPackages();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, not when enrichCartWithPackageData changes

  if (isTebexLoading || isLoadingPackages || authLoading) {
    return <Loader message={loadingMessage || 'Loading packages...'} />;
  }
  
  return (
    <>
    <Routes>
        {/* Admin Routes */}
        <Route path="/admin/discord-success" element={<DiscordCallback />} />
        <Route 
        path="/admin/*" 
        element={
          isAuthenticated && isDiscordLinked && user?.role === 'admin' ? (
            <AdminApp />
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
              <div className="max-w-md w-full bg-[#0f0f0f] border border-white/5 rounded-lg shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Admin Access Required</h2>
                <p className="text-gray-400 mb-6">
                  {!isAuthenticated 
                    ? 'Please sign in with Discord to continue.' 
                    : 'You need admin privileges to access this area.'}
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  Go to Homepage
                </button>
              </div>
            </div>
          )
        } 
      />

      {/* Public Routes */}
      <Route path="/*" element={<MainApp
        isLoaded={isLoaded}
        scrollY={scrollY}
        packages={packages}
        isCheckoutOpen={isCheckoutOpen}
        checkoutUrl={checkoutUrl}
        closeCheckout={closeCheckout}
      />} />
    </Routes>
    </>
  );
}

interface MainAppProps {
  isLoaded: boolean;
  scrollY: number;
  packages: Package[];
  isCheckoutOpen: boolean;
  checkoutUrl: string | null;
  closeCheckout: () => void;
}

function MainApp({
  isLoaded,
  scrollY,
  packages,
  isCheckoutOpen,
  checkoutUrl,
  closeCheckout,
}: MainAppProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackPageView } = useAnalytics();

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  // 🔥 SCROLL TO TOP ON ROUTE CHANGE
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Helper to create URL-friendly slug from package name
  const createSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  // Navigate to package details page from home
  const openPackageDetailsFromHome = (pkg: Package) => {
    const slug = createSlug(pkg.name);
    navigate(`/product/${slug}`, { state: { package: pkg, fromScripts: false } });
  };

  // Navigate to package details page from scripts
  const openPackageDetailsFromScripts = (pkg: Package) => {
    const slug = createSlug(pkg.name);
    navigate(`/product/${slug}`, { state: { package: pkg, fromScripts: true } });
  };

  // Determine background based on route
  const isProductPage = location.pathname.startsWith('/product/');
  const backgroundClass = isProductPage
    ? "fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black pointer-events-none z-0"
    : "page-gradient fixed inset-0 pointer-events-none z-0";

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
      <div className={backgroundClass} />

      <Navigation
        scrollY={scrollY}
        isLoaded={isLoaded}
        currentPage={isProductPage ? 'package-details' : location.pathname === '/scripts' ? 'scripts' : 'home'}
        packages={packages}
        navigateToScripts={() => navigate('/scripts')}
        navigateToHome={() => navigate('/')}
        handleDiscordRedirect={handleDiscordRedirect}
        openPackageDetails={openPackageDetailsFromHome}
      />

      <Routes>
        <Route path="/" element={
          <HomePage
            isLoaded={isLoaded}
            packages={packages}
            navigateToScripts={() => navigate('/scripts')}
            openPackageDetails={openPackageDetailsFromHome}
            handleDiscordRedirect={handleDiscordRedirect}
          />
        } />
        <Route path="/scripts" element={
          <ScriptsPage
            isLoaded={isLoaded}
            packages={packages}
            openPackageDetails={openPackageDetailsFromScripts}
          />
        } />
        <Route path="/product/:productSlug" element={
          <PackageDetailsPage packages={packages} />
        } />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>

      <Footer
        navigateToScripts={() => navigate('/scripts')}
        scrollToSection={scrollToSection}
        handleDiscordRedirect={handleDiscordRedirect}
        handleTebexRedirect={handleTebexRedirect}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        checkoutUrl={checkoutUrl || ''}
        onClose={closeCheckout}
      />
    </div>
  );
}

export default App;
