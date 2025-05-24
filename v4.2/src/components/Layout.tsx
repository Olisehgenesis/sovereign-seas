// app/layout.tsx
'use client';
import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary'

const Layout = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
        <Header />
        <Outlet />
      </div>
    </ErrorBoundary>
  )
}

export default Layout