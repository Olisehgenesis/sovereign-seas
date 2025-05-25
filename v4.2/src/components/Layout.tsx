import { Outlet, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Layout() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Enhanced Background Design */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Primary gradient orbs */}
          <div className="absolute top-10 right-10 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-indigo-400/25 to-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-sky-300/20 to-blue-300/15 rounded-full blur-2xl animate-pulse delay-500"></div>
          
          {/* Floating particles */}
          <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-blue-400/40 rounded-full animate-bounce delay-300"></div>
          <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-indigo-400/40 rounded-full animate-bounce delay-700"></div>
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce delay-1000"></div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30"></div>
          
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-50/30 to-indigo-100/50"></div>
        </div>

        {/* Glassmorphism container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header with enhanced styling */}
          <div className="relative z-20">
            <div className="backdrop-blur-xl bg-white/80 border-b border-blue-200/50 shadow-lg">
              <Header />
            </div>
          </div>

          {/* Main content area */}
          <main className="flex-1 relative">
            {/* Content wrapper with improved spacing */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
              {/* Enhanced content container */}
              <div className="relative">
                {/* Content background with glassmorphism */}
                <div className="absolute inset-0 backdrop-blur-sm bg-white/20 rounded-3xl border border-white/30 shadow-2xl"></div>
                
                {/* Main content */}
                <div className="relative z-10 p-6 sm:p-8 lg:p-12">
                  <Outlet />
                </div>
              </div>
            </div>

            {/* Floating action elements */}
            <div className="fixed bottom-8 right-8 z-30">
              <div className="flex flex-col space-y-4">
                {/* Scroll to top button */}
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
                  aria-label="Scroll to top"
                >
                  <svg 
                    className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
          </main>

          {/* Enhanced footer area */}
          <footer className="relative z-20 mt-auto">
            <div className="backdrop-blur-xl bg-white/80 border-t border-blue-200/50">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-600">
                    © 2024 Your App. All rights reserved.
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Built with ❤️</span>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>System Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Loading overlay for route transitions */}
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm z-50 opacity-0 pointer-events-none transition-opacity duration-300" id="route-loading">
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-indigo-600 rounded-full animate-spin animate-reverse"></div>
            </div>
          </div>
        </div>
      </div>

      
    </ErrorBoundary>
  );
}