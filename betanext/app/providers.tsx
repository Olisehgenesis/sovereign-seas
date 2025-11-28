'use client';

import { Buffer } from 'buffer';

// Polyfill Buffer for client-side
if (typeof window !== 'undefined') {
  globalThis.Buffer = Buffer;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

