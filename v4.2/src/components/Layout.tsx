import { Outlet } from 'react-router-dom';
// import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary';
import Footer from './Footer';
import Header from './Header';

export default function Layout() {
  return (
    <ErrorBoundary>
      <div className="layout-container bg-gradient-to-br from-blue-50 to-indigo-100" style={{ transform: 'scale(0.74)', transformOrigin: 'top left', width: '135.14%', height: '135.14%' }}>
        <Header />

        <main className="flex-1 relative z-10 pt-20 pb-8">
          <div className="page-content">
            <Outlet />
          </div>

          <div className="fixed bottom-8 right-8 z-30">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-10 h-10 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              aria-label="Scroll to top"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}