import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary';
import Footer from './Footer';

export default function Layout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 relative overflow-hidden">
        {/* Floating particles background - similar to original */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
          <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
          <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
          <div className="absolute top-1/3 right-1/4 w-36 h-36 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-float-delay-3 blur-2xl"></div>
          
          {/* Grid pattern overlay - subtle */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-40"></div>
        </div>

        {/* Glassmorphism container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header with enhanced styling but simpler than before */}
          <div className="sticky top-0 z-50">
            <div className="backdrop-blur-md bg-white/90 border-b border-blue-200/50 shadow-md">
              <Header />
            </div>
          </div>

          {/* Main content area - simplified */}
          <main className="flex-1 relative z-10 pt-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <Outlet />
            </div>

            {/* Scroll to top button - more subtle */}
            <div className="fixed bottom-8 right-8 z-30">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center opacity-90 hover:opacity-100"
                aria-label="Scroll to top"
              >
                <svg 
                  className="w-5 h-5 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </main>

          {/* Footer - simplified to match original style */}
          <Footer />
        </div>
      </div>
    </ErrorBoundary>
  );
}