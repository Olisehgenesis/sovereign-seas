/**
 * Adapter utilities to help migrate from React Router to Next.js
 * These provide drop-in replacements for react-router-dom hooks
 */

'use client';

import { useRouter, useParams as useNextParams } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Drop-in replacement for useNavigate from react-router-dom
 */
export function useNavigate() {
  const router = useRouter();
  
  return (path: string | number, options?: { replace?: boolean }) => {
    if (typeof path === 'number') {
      if (path === -1) {
        router.back();
      } else if (path === 1) {
        router.forward();
      }
    } else {
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    }
  };
}

/**
 * Drop-in replacement for useParams from react-router-dom
 */
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const params = useNextParams();
  
  return useMemo(() => {
    return (params || {}) as T;
  }, [params]);
}

