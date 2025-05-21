import '@/styles/globals.css';

import { AppProvider } from '@/providers/AppProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ss-sky-light text-ss-text font-inter">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}