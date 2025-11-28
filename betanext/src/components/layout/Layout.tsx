'use client';

import React from 'react';
import Header from './Header';
import Footer from './Footer';
import WhatsNewModal, { useWhatsNewModal } from '@/components/modals/WhatsNewModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isOpen, onClose } = useWhatsNewModal();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 relative">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(37, 99, 235, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(37, 99, 235, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '2em 2em',
          backgroundPosition: '0 0, 0 0'
        }}
      ></div>
      
      <Header />
      <main className="flex-1 pt-20 relative z-10">
        {children}
      </main>
      <Footer />
      
      <WhatsNewModal isOpen={isOpen} onClose={onClose} />
    </div>
  );
};

export default Layout;
