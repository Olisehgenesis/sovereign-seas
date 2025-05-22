'use client'

import React from 'react'
import Header from '../../components/Header'

export default function HeaderPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Header Component</h1>
        <Header />
      </div>
    </div>
  )
} 