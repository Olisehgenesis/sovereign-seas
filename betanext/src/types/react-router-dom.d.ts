import type { ComponentType, ReactNode } from 'react';

declare module 'react-router-dom' {
  export const BrowserRouter: ComponentType<{ children?: ReactNode }>;
  export const Routes: ComponentType<{ children?: ReactNode }>;
  export const Route: ComponentType<Record<string, unknown>>;
  export const Navigate: ComponentType<Record<string, unknown>>;
}

