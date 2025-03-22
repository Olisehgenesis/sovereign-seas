import { FC, ReactNode } from 'react';
import Footer from './Footer';
import Header from './Header';

interface Props {
  children: ReactNode;
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <>
      <div className="bg-gradient-to-b from-emerald-50 to-teal-50 overflow-hidden flex flex-col min-h-screen">
        <Header />
        <div className="py-6 max-w-7xl mx-auto space-y-4 px-4 sm:px-6 lg:px-8">
          {/* Decorative elements */}
          <div className="fixed top-24 right-0 w-1/3 h-1/3 bg-emerald-200/30 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="fixed bottom-0 left-0 w-1/2 h-1/2 bg-teal-200/30 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-100/20 rounded-full filter blur-2xl pointer-events-none"></div>
          
          {/* Main content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Layout;