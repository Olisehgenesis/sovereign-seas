'use client'

import { useAccount, useDisconnect } from 'wagmi'

interface WalletButtonProps {
  className?: string
  onConnect?: (address: string) => void
  onDisconnect?: () => void
}

export default function WalletButton({ className = '', onConnect, onDisconnect }: WalletButtonProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const handleDisconnect = () => {
    disconnect()
    onDisconnect?.()
  }

  if (isConnected && address) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm text-gray-300">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <appkit-button />
  )
}
