import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Loader2, CheckCircle, Circle, AlertCircle } from 'lucide-react'
import useEngagementClaim from '@/hooks/useEngagementClaim'

type ClaimModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ClaimModal({ open, onOpenChange }: ClaimModalProps) {
  const { isConnected, address, status, error, txHash, claim } = useEngagementClaim()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img 
              src="/images/good.png" 
              alt="Good Dollar" 
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            Claim Free $G
          </DialogTitle>
          <DialogDescription>
            to vote your favorite projects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Wallet Status */}
          <div className="text-sm text-muted-foreground">
            {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect your wallet from the header first'}
          </div>

          {/* Steps Progress */}
          {status !== 'idle' && status !== 'connecting' && (
            <div className="space-y-2">
              {steps.map((step) => {
                const stepStatus = getStepStatus(step.key)
                const Icon = step.icon
                const isCurrent = stepStatus === 'current'
                const isCompleted = stepStatus === 'completed'
                const isError = stepStatus === 'error'
                
                return (
                  <div key={step.key} className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 ${isCurrent ? 'animate-pulse' : ''}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : isError ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <span className={`text-sm ${isCurrent ? 'text-blue-600 font-medium' : isCompleted ? 'text-green-600' : isError ? 'text-red-600' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                {error}
              </div>
            </div>
          )}

          {/* Success Display */}
          {txHash && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="text-green-700 font-medium">Claim successful!</div>
                <div className="text-green-600 mt-1">
                  Transaction: <span className="break-all font-mono">{txHash}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            Powered by Good Dollar
          </div>
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <button className="px-4 py-2 rounded-full border">Close</button>
          </DialogClose>
          <button
            onClick={claim}
            disabled={!isConnected || isLoading}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Processing...' : 'Claim'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


