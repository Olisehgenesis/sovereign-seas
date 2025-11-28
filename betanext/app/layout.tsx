import type { Metadata } from 'next';
import { AppProvider } from '@/providers/AppProvider';
import Layout from '@/components/layout/Layout';
import { Providers } from './providers';
import '@/index.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://sovseas.xyz'),
  title: 'Sov Seas | Decentralized Funding Platform',
  description: 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
  keywords: 'blockchain, funding, campaigns, decentralized, voting, projects, Celo',
  openGraph: {
    type: 'website',
    siteName: 'Sov Seas',
    title: 'Sov Seas | Decentralized Funding Platform',
    description: 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sov Seas | Decentralized Funding Platform',
    description: 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
    images: ['/og-image.png'],
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <Providers>
          <AppProvider>
            <Layout>{children}</Layout>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}

