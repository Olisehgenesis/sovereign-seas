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
      {/* Dots Pattern Background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #64748b 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
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
