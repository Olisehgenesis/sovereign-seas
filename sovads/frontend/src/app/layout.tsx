import type { Metadata } from "next";
import "./globals.css";
import dynamic from 'next/dynamic'
import { headers } from 'next/headers'
import ContextProvider from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const PopupAd = dynamic(
  () => import('@/components/ads/AdSlots').then((mod) => mod.PopupAd),
  { ssr: false }
)

export const metadata: Metadata = {
  title: "SovAds - Decentralized Ad Network",
  description: "Earn crypto by serving ads on your website. Transparent, fraud-resistant, and on-chain accountable.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie')

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
      </head>
      <body className={"antialiased bg-background text-foreground"}>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 relative">
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <ContextProvider cookies={cookies}>
            <Header />
            <main className="flex-1 pt-20 relative z-10">
              {children}
            </main>
            <Footer />
            <PopupAd delay={4000} />
          </ContextProvider>
        </div>
      </body>
    </html>
  );
}
