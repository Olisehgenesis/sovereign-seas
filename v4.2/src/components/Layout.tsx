import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary'

export default function Layout() {
  const location = useLocation();
  const isExplorerPage = location.pathname.startsWith('/explorer');

  return (
    <ErrorBoundary>
      <div className="bg-gradient-to-b from-blue-50 to-sky-100 overflow-hidden flex flex-col min-h-screen">
        <Header />
        
        {isExplorerPage ? (
          // Full-width layout for explorer pages
          <div className="flex-grow">
            <Outlet />
          </div>
        ) : (
          // Original layout for other pages
          <>
            <div className="py-4 sm:py-6 w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-6 lg:px-8 flex-grow">
              {/* Decorative elements with responsive positioning */}
              <div className="fixed top-24 right-0 w-2/3 sm:w-1/3 h-1/4 sm:h-1/3 bg-blue-200/30 rounded-full filter blur-3xl pointer-events-none animate-float-slower opacity-50 sm:opacity-70"></div>
              <div className="fixed bottom-0 left-0 w-3/4 sm:w-1/2 h-1/3 sm:h-1/2 bg-blue-400/20 rounded-full filter blur-3xl pointer-events-none animate-float-slow opacity-50 sm:opacity-70"></div>
              <div className="fixed top-1/3 left-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-sky-100/20 rounded-full filter blur-2xl pointer-events-none animate-float opacity-50 sm:opacity-70"></div>
              
              {/* Water ripple effect in background - adjusted for mobile */}
              <div className="fixed bottom-0 left-0 right-0 h-1/4 sm:h-1/3 pointer-events-none opacity-5 sm:opacity-10 wave-border"></div>
              
              {/* Main content with z-index to stay above decorative elements */}
              <div className="relative z-10 w-full">
                <Outlet />
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}