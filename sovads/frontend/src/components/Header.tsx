"use client"

import Link from 'next/link'
import { useAccount, useChainId } from 'wagmi'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import WalletButton from './WalletButton'

export default function Header() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const pathname = usePathname()
  const isTest = pathname?.startsWith('/test')

  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const short = (addr?: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
  const networkName = (id?: number) => {
    if (!id) return 'Not connected'
    switch (id) {
      case 1: return 'Ethereum'
      case 137: return 'Polygon'
      case 44787: return 'Alfajores'
      case 42220: return 'Celo'
      default: return `Chain ${id}`
    }
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-sm' : 'bg-transparent'
    }`}>
       <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">SovAds</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/advertiser" 
                className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
              >
                Advertiser
              </Link>
              <Link 
                href="/publisher" 
                className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
              >
                Publisher
              </Link>
              <Link 
                href="/admin" 
                className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
              >
                Admin
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}


