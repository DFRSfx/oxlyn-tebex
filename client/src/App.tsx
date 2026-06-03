import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import PromoBar from './components/PromoBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CheckoutModal from './components/CheckoutModal';
import RouteLoader from './components/RouteLoader';
import FirstCustomerPopup from './components/FirstCustomerPopup';
import DiscordCallback from './admin/pages/DiscordCallback';
import { useAuth } from './context/AuthContext';
import { Package } from './types';
import { handleDiscordRedirect } from './utils/helpers';
import { useTebex } from './context/TebexContext';
import { tebexService } from './services/tebexService';
import { mapTebexPackageToPackage } from './utils/packageMapper';
import { INSTALL_ADDON_TEBEX_ID } from './utils/isBundle';
import { packageOrderService, applyPackageOrder } from './services/packageOrderService';
import { useAnalytics } from './hooks/useAnalytics';
import { launchTebexCheckout } from './utils/tebexCheckout';
import { API_URL } from './config/api';
import './styles/App.css';

// Lazy-load non-critical routes — keeps the landing page bundle small.
const ScriptsPage = lazy(() => import('./pages/ScriptsPage'));
const BundlesPage = lazy(() => import('./pages/BundlesPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const PackageDetailsPage = lazy(() => import('./pages/PackageDetailsPage'));
const CheckoutCancelled = lazy(() => import('./pages/CheckoutCancelled'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));



async function completeTebexBasket(basketIdent: string, packageId: number) {
  try {
    // Add package to basket via our backend proxy (user is now authenticated
    // via Tebex auth flow). The Tebex token never reaches the browser.
    const ok = await tebexService.addToBasket(basketIdent, packageId, 1);
    if (!ok) {
      console.error('Failed to add package after auth');
      return;
    }

    // Open the Tebex checkout modal in-page using the basket ident
    launchTebexCheckout(basketIdent);
  } catch (error) {
    console.error('Failed to complete Tebex basket:', error);
  }
}

function App() {
  const { isCheckoutOpen, checkoutUrl, closeCheckout, enrichCartWithPackageData } = useTebex();
  const { user, isAuthenticated, isDiscordLinked } = useAuth();

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

  // Register the visit for the IP Connection admin panel. We fire once per
  // tab-session — the server still de-duplicates inside a 10-min sliding
  // window, but skipping the extra POST keeps the request log quiet during
  // SPA navigation within the same tab.
  useEffect(() => {
    if (sessionStorage.getItem('__oxlyn_ip_pinged')) return;
    sessionStorage.setItem('__oxlyn_ip_pinged', '1');
    fetch(`${API_URL}/ip-connection`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }, []);

  // Check if we're on the checkout-cancelled page
  if (window.location.pathname === '/checkout-cancelled') {
    return (
      <Suspense fallback={null}>
        <CheckoutCancelled />
      </Suspense>
    );
  }
  const [isLoaded, setIsLoaded] = useState(false);
  // Track only whether the user has scrolled past the navbar threshold —
  // a boolean changes ~once per session, while a numeric scrollY would
  // re-render the whole tree on every scroll pixel.
  const [isScrolled, setIsScrolled] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);


  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 30;
        setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Fetch packages from Tebex + admin-defined ordering, then sort
    const fetchPackages = async () => {
      setIsLoadingPackages(true);
      try {
        const [tebexPackages, orderEntries] = await Promise.all([
          tebexService.fetchPackages(),
          packageOrderService.fetch(),
        ]);
        // Hide the "Oxlyn Installation" professional-install add-on (id 7473819)
        // from the whole browsable catalog — scripts, bundles, Top Scripts, cart
        // suggestions, package-details variants, categories, search. It's added
        // only from the cart as the install order bump.
        const mappedPackages = tebexPackages
          .filter((p) => p.id !== INSTALL_ADDON_TEBEX_ID)
          .map(mapTebexPackageToPackage);
        const ordered = applyPackageOrder(mappedPackages, orderEntries);
        setPackages(ordered);
        enrichCartWithPackageData(ordered);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
        setPackages([]);
      } finally {
        setIsLoadingPackages(false);
      }
    };

    fetchPackages();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, not when enrichCartWithPackageData changes

  return (
    <>
    <Routes>
        {/* Admin Routes */}
        <Route path="/admin/discord-success" element={<DiscordCallback />} />
        <Route
        path="/admin/*"
        element={
          isAuthenticated && isDiscordLinked && user?.role === 'admin' ? (
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
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
        isScrolled={isScrolled}
        packages={packages}
        isLoadingPackages={isLoadingPackages}
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
  isScrolled: boolean;
  packages: Package[];
  isLoadingPackages: boolean;
  isCheckoutOpen: boolean;
  checkoutUrl: string | null;
  closeCheckout: () => void;
}

function MainApp({
  isLoaded,
  isScrolled,
  packages,
  isLoadingPackages,
  isCheckoutOpen,
  checkoutUrl,
  closeCheckout,
}: MainAppProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackPageView, setSuppressed } = useAnalytics();
  const { user } = useAuth();

  // Initial site loader is rendered from index.html (#initial-loader) and
  // hidden inside main.tsx once React commits — guarantees the spinner
  // paints BEFORE any React tree, instead of after.

  // Keep admin accounts (james, oxlyn, soares, …) out of the storefront
  // analytics entirely. When auth resolves the visitor as an admin we
  // suppress all tracking; the SDK also persists this so repeat visits are
  // suppressed from the very first event. Non-admins (or logged-out) clear
  // the flag so normal visitors are always counted.
  useEffect(() => {
    setSuppressed(user?.role === 'admin');
  }, [user?.role, setSuppressed]);

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

  // Single global background applied across every public route
  const isProductPage = location.pathname.startsWith('/product/');

  return (
    // `overflow-x: clip` (instead of `hidden`) — keeps horizontal overflow
    // from causing a page-wide scrollbar without creating a scroll context.
    // `overflow: hidden` would break `position: sticky` on the navbar inside
    // this tree; `clip` doesn't.
    <div className="min-h-screen bg-black text-white relative" style={{ overflowX: 'clip' }}>
      {/* Background unificado — antes eram 3 elementos fixed separados (gradient,
          grid, noise). Agora um único <div> com múltiplos background-image
          empilhados via CSS custom property. Mesmo paint, menos camadas
          de composição e menos custo de layout. */}
      <div className="site-background fixed inset-0 pointer-events-none z-0" />

      <PromoBar />

      <Navigation
        isScrolled={isScrolled}
        isLoaded={isLoaded}
        currentPage={isProductPage ? 'package-details' : location.pathname === '/scripts' ? 'scripts' : 'home'}
        packages={packages}
        navigateToScripts={() => navigate('/scripts')}
        navigateToHome={() => navigate('/')}
        handleDiscordRedirect={handleDiscordRedirect}
        openPackageDetails={openPackageDetailsFromHome}
      />

      {/* Suspense fallback — RouteLoader shows whenever a lazy-loaded chunk
          (ScriptsPage, BundlesPage, SubscriptionPage, etc.) is still
          downloading. Already-cached chunks resolve synchronously so there's
          no flash on revisits. */}
      <Suspense fallback={<RouteLoader />}>
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
              initialBrand="oxlyn"
            />
          } />
          {/* Dedicated shortlink for the Vanguard catalogue — same page,
              just pre-selected on the Vanguard tab. Convenient for YouTube
              descriptions and other social links: /vanguardscripts. */}
          <Route path="/vanguardscripts" element={
            <ScriptsPage
              isLoaded={isLoaded}
              packages={packages}
              openPackageDetails={openPackageDetailsFromScripts}
              initialBrand="vanguard"
            />
          } />
          <Route path="/bundles" element={
            <BundlesPage
              isLoaded={isLoaded}
              packages={packages}
              openPackageDetails={openPackageDetailsFromScripts}
              initialBrand="oxlyn"
            />
          } />
          <Route path="/vanguardbundles" element={
            <BundlesPage
              isLoaded={isLoaded}
              packages={packages}
              openPackageDetails={openPackageDetailsFromScripts}
              initialBrand="vanguard"
            />
          } />
          <Route path="/product/:productSlug" element={
            <PackageDetailsPage packages={packages} isLoadingPackages={isLoadingPackages} />
          } />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/subscription" element={<SubscriptionPage packages={packages} />} />
        </Routes>
      </Suspense>

      <Footer />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        checkoutUrl={checkoutUrl || ''}
        onClose={closeCheckout}
      />

      {/* First-customer welcome popup — auto-shows after ~5s on first visit,
          24h cooldown after dismiss / 30 days after copy. Hidden on the
          checkout-cancelled and admin contexts because those flow paths
          are mid-funnel and a discount popup there is jarring. */}
      {!location.pathname.startsWith('/admin') &&
       !location.pathname.startsWith('/cart') &&
       !location.pathname.startsWith('/checkout-cancelled') && (
        <FirstCustomerPopup />
      )}

    </div>
  );
}

export default App;
