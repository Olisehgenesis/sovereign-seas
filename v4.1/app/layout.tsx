import '@/styles/globals.css';

import { AppProvider } from '@/providers/AppProvider';
import Layout from '@/components/Layout';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ss-sky-light text-ss-text font-inter">
        
        <AppProvider>
        <Layout>
          {children}
        </Layout>

        </AppProvider>
        
      </body>
    </html>
  );
}