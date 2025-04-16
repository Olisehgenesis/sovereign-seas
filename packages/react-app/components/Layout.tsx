// app/layout.tsx
import { ReactNode } from 'react';
import { Metadata } from 'next';
import Footer from '../components/Footer';
import Header from '../components/Header';

// Define the static metadata for the entire site
export const metadata: Metadata = {
  title: {
    template: '%s | Sovereign Seas',
    default: 'Sovereign Seas | Decentralized Funding Platform',
  },
  description: 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
  keywords: 'blockchain, funding, campaigns, decentralized, voting, projects, Celo',
  openGraph: {
    type: 'website',
    siteName: 'Sovereign Seas',
    title: {
      template: '%s | Sovereign Seas',
      default: 'Sovereign Seas | Decentralized Funding Platform',
    },
    description: 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      template: '%s | Sovereign Seas',
      default: 'Sovereign Seas | Decentralized Funding Platform',
    },
    description: 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

interface LayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <>
      <div className="bg-gradient-to-b from-blue-50 to-sky-100 overflow-hidden flex flex-col min-h-screen">
        <Header />
        <div className="py-6 max-w-7xl mx-auto space-y-4 px-4 sm:px-6 lg:px-8">
          {/* Decorative elements with enhanced animations */}
          <div className="fixed top-24 right-0 w-1/3 h-1/3 bg-blue-200/30 rounded-full filter blur-3xl pointer-events-none animate-float-slower"></div>
          <div className="fixed bottom-0 left-0 w-1/2 h-1/2 bg-blue-400/20 rounded-full filter blur-3xl pointer-events-none animate-float-slow"></div>
          <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-sky-100/20 rounded-full filter blur-2xl pointer-events-none animate-float"></div>
          
          {/* Water ripple effect in background */}
          <div className="fixed bottom-0 left-0 right-0 h-1/3 pointer-events-none opacity-10 wave-border"></div>
          
          {/* Main content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}