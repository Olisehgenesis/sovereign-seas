'use client'

import React from 'react'
import WalletModal from '../../components/walletModal'

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Wallet Connection</h1>
        <WalletModal isOpen={true} onClose={() => {}} />
      </div>
    </div>
  )
} 