import { FC, ReactNode } from 'react';
import Footer from './Footer';
import Header from './Header';

interface Props {
  children: ReactNode;
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col min-h-screen">
        <Header />
        <div className="py-16 max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
          {/* Decorative elements */}
          <div className="absolute top-24 right-0 w-1/3 h-1/3 bg-lime-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-yellow-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
          
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