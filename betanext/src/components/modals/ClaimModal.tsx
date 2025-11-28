'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Loader2, CheckCircle, Circle, AlertCircle, Wallet, RefreshCw, Gift } from 'lucide-react'
import useEngagementClaim from '@/hooks/useEngagementClaim'
import { useConnect, useChainId } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { useState } from 'react'
import { ButtonCool } from '@/components/ui/button-cool'

type ClaimModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ClaimModal({ open, onOpenChange }: ClaimModalProps) {
  const { isConnected, address, status, error, txHash, claim } = useEngagementClaim()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const [retryCount, setRetryCount] = useState(0)

  const isLoading = status === 'connecting' || status === 'signing' || status === 'waiting_for_app' || status === 'claiming'
  
  const steps = [
    { key: 'signing', label: 'Sign Transaction', icon: Circle },
    { key: 'waiting_for_app', label: 'Waiting for App', icon: Circle },
    { key: 'claiming', label: 'Claiming', icon: Circle },
    { key: 'success', label: 'Success', icon: CheckCircle },
  ]
  
  const getStepStatus = (stepKey: string) => {
    if (status === 'error') return 'error'
    if (status === stepKey) return 'current'
    if (status === 'success') return 'completed'
    if (status === 'idle' || status === 'connecting') return 'pending'
    return 'pending'
  }

  const handleConnectWallet = async () => {
    try {
      const connector = connectors[0]
      if (connector) {
        await connect({ connector })
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const handleRetryClaim = async () => {
    setRetryCount(prev => prev + 1)
    await claim()
  }

  const handleReconnectWallet = async () => {
    try {
      // Force a reconnection by disconnecting and reconnecting
      const connector = connectors[0]
      if (connector) {
        await connect({ connector })
      }
    } catch (error) {
      console.error('Failed to reconnect wallet:', error)
    }
  }

  const isSDKError = error.includes('SDK is initializing') || error.includes('Wallet client is initializing') || error.includes('Public client is initializing') || error.includes('Wallet address not available') || error.includes('Wallet is initializing') || error.includes('App signature verification failed')

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case celo.id:
        return 'Celo Mainnet'
      case celoAlfajores.id:
        return 'Celo Alfajores'
      default:
        return `Chain ${chainId}`
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 overflow-hidden max-w-md">
        {/* Pattern Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        {/* Accent Corner */}
        <div 
          className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]"
        />
        <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

        <DialogHeader className="relative px-[1.4em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#10b981',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="w-5 h-5" />
            Claim Free $G
          </DialogTitle>
          <DialogDescription className="text-white/90 text-sm font-normal normal-case mt-1">
            to vote your favorite projects
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-[1.5em] py-[1.5em] space-y-4 z-[2]">
          {/* Wallet Status */}
          <div className={`flex items-center gap-2 p-3 rounded-[0.4em] border-[0.15em] shadow-[0.2em_0.2em_0_#000000] ${
            isConnected 
              ? 'bg-[#d1fae5] border-[#10b981] text-[#065f46]' 
              : 'bg-[#fef3c7] border-[#f59e0b] text-[#92400e]'
          }`}>
            <div className={`w-3 h-3 rounded-full border-[0.15em] border-[#050505] ${
              isConnected ? 'bg-[#10b981]' : 'bg-[#f59e0b]'
            }`} />
            <div className="flex-1">
              <div className="text-sm font-bold">
                {isConnected && address
                  ? `Wallet Connected: ${address.slice(0, 6)}...${address.slice(-4)}` 
                  : isConnected && !address
                  ? 'Wallet Connected: Address Loading...'
                  : 'Wallet Not Connected'
                }
              </div>
              {isConnected && (
                <div className="text-xs font-semibold mt-1">
                  Network: {getChainName(chainId)}
                </div>
              )}
            </div>
          </div>

          {/* Steps Progress */}
          {status !== 'idle' && status !== 'connecting' && (
            <div className="space-y-2 p-3 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              {steps.map((step) => {
                const stepStatus = getStepStatus(step.key)
                const Icon = step.icon
                const isCurrent = stepStatus === 'current'
                const isCompleted = stepStatus === 'completed'
                const isError = stepStatus === 'error'
                
                return (
                  <div key={step.key} className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#4d61ff] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)] ${isCurrent ? 'animate-pulse' : ''}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-[0.9em] h-[0.9em] text-white" />
                      ) : isError ? (
                        <AlertCircle className="w-[0.9em] h-[0.9em] text-white" />
                      ) : isCurrent ? (
                        <Loader2 className="w-[0.9em] h-[0.9em] text-white animate-spin" />
                      ) : (
                        <Icon className="w-[0.9em] h-[0.9em] text-white" />
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${isCurrent ? 'text-[#2563eb]' : isCompleted ? 'text-[#10b981]' : isError ? 'text-[#ef4444]' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#ef4444] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)] flex-shrink-0">
                <AlertCircle className="w-[0.9em] h-[0.9em] text-white" />
              </div>
              <div className="flex-1 text-sm text-[#991b1b] font-semibold">
                {error}
                {isSDKError && retryCount < 3 && (
                  <div className="mt-2 flex gap-2">
                    <ButtonCool
                      onClick={handleRetryClaim}
                      disabled={isLoading}
                      text={`Retry (${retryCount}/3)`}
                      bgColor="#ef4444"
                      hoverBgColor="#dc2626"
                      borderColor="#050505"
                      textColor="#ffffff"
                      size="sm"
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </ButtonCool>
                    {error.includes('Wallet address not available') && (
                      <ButtonCool
                        onClick={handleReconnectWallet}
                        disabled={isLoading}
                        text="Reconnect"
                        bgColor="#2563eb"
                        hoverBgColor="#1d4ed8"
                        borderColor="#050505"
                        textColor="#ffffff"
                        size="sm"
                        className="text-xs"
                      >
                        <Wallet className="w-3 h-3" />
                      </ButtonCool>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Display */}
          {txHash && (
            <div className="flex items-start space-x-2 p-3 bg-[#d1fae5] border-[0.15em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#10b981] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)] flex-shrink-0">
                <CheckCircle className="w-[0.9em] h-[0.9em] text-white" />
              </div>
              <div className="text-sm">
                <div className="text-[#065f46] font-bold">Claim successful!</div>
                <div className="text-[#047857] mt-1 font-mono text-xs break-all">
                  Transaction: {txHash}
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 pt-2 border-t-[0.15em] border-dashed border-black/15 text-xs text-gray-600 font-semibold text-center">
            Powered by Good Dollar
          </div>
        </div>

        <DialogFooter className="px-[1.5em] pb-[1.5em] pt-0 gap-2 flex-row-reverse sm:flex-row">
          {!isConnected ? (
            <ButtonCool
              onClick={handleConnectWallet}
              text="Connect Wallet"
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
            >
              <Wallet className="w-4 h-4" />
            </ButtonCool>
          ) : (
            <ButtonCool
              onClick={claim}
              disabled={isLoading}
              text={isLoading ? 'Processing...' : 'Claim'}
              bgColor="#10b981"
              hoverBgColor="#059669"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </ButtonCool>
          )}
          <DialogClose asChild>
            <ButtonCool
              text="Close"
              bgColor="#6b7280"
              hoverBgColor="#4b5563"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
            />
          </DialogClose>
        </DialogFooter>

        {/* Accent Shape */}
        <div className="absolute w-[2.5em] h-[2.5em] bg-[#10b981] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0" />

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </DialogContent>
    </Dialog>
  )
}


