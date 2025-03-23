import { FC, ReactNode } from 'react';
import Head from 'next/head';
import Footer from './Footer';
import Header from './Header';

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

const Layout: FC<Props> = ({ 
  children, 
  title = 'Sovereign Seas | Decentralized Funding Platform',
  description = 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
  keywords = 'blockchain, funding, campaigns, decentralized, voting, projects, Celo',
  ogImage = '/og-image.png'
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph / Social Media Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Sovereign Seas" />
        
        {/* Twitter Card data */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://sovereignseas.io" />
      </Head>
      
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