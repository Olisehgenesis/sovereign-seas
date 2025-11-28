import React, { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { 
  Crown, 
  TrendingUp, 
  ShoppingCart,
  Sparkles,
  Award,
  Loader2,
  X,
  CheckCircle,
  XCircle,
  Settings,
  Gavel,
  ExternalLink,
  HelpCircle,
  MapPin,
  Twitter,
  Github,
  Linkedin,
  MessageCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  useBuilderSlotForOwner, 
  useBuilderRewardsActions,
  useBuilderFragmentBalance,
  useBuilderActiveBids
} from '@/hooks/useBuilderRewards';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Address } from 'viem';
import { getBuilderRewardsContractAddress } from '@/utils/contractConfig';

interface BuilderSlotCardProps {
  ownerAddress: Address;
  className?: string;
}

const TIER_LABELS: Record<number, { label: string; color: string; icon: typeof Crown }> = {
  1: { label: 'Cadet', color: 'bg-gray-500', icon: Award },
  2: { label: 'Navigator', color: 'bg-blue-500', icon: TrendingUp },
  3: { label: 'Captain', color: 'bg-purple-500', icon: Crown },
  4: { label: 'Legendary', color: 'bg-gradient-to-r from-yellow-400 to-orange-500', icon: Sparkles },
};

export const BuilderSlotCard: React.FC<BuilderSlotCardProps> = ({
  ownerAddress,
  className = ''
}) => {
  const { address: userAddress, isConnected } = useAccount();
  const { slot, builderId, isLoading, error, refetch } = useBuilderSlotForOwner(ownerAddress);
  const { 
    buyFragments, 
    placeBid, 
    acceptBid, 
    cancelBid,
    updateFragmentPrice,
    updateFlowPrice,
    setBuilderSlotStatus
  } = useBuilderRewardsActions();
  
  // User's fragment balance
  const { balance: userBalance } = useBuilderFragmentBalance(
    builderId > 0n ? builderId : undefined,
    userAddress
  );
  
  // Active bids
  const { bids, isLoading: bidsLoading, refetch: refetchBids } = useBuilderActiveBids(
    builderId > 0n ? builderId : undefined
  );
  
  // State
  const [buyAmount, setBuyAmount] = useState(1);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [showPlaceBidModal, setShowPlaceBidModal] = useState(false);
  const [showOwnerActions, setShowOwnerActions] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  
  // Bid state
  const [bidAmount, setBidAmount] = useState(1);
  const [bidPrice, setBidPrice] = useState('');
  const [bidDuration, setBidDuration] = useState(7); // days
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  
  // Owner actions state
  const [newFragmentPrice, setNewFragmentPrice] = useState('');
  const [newFlowPrice, setNewFlowPrice] = useState('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const tierInfo = useMemo(() => {
    if (!slot?.tier) return null;
    return TIER_LABELS[slot.tier] || TIER_LABELS[1];
  }, [slot?.tier]);

  const remainingFragments = useMemo(() => {
    if (!slot) return 0;
    return 27 - Number(slot.fragmentsSold || 0n);
  }, [slot]);

  const progressPercentage = useMemo(() => {
    if (!slot) return 0;
    return Math.round((Number(slot.fragmentsSold || 0n) / 27) * 100);
  }, [slot]);

  const isSoldOut = remainingFragments === 0;
  const isOwner = isConnected && userAddress?.toLowerCase() === ownerAddress.toLowerCase();

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleBuyFragments = async () => {
    if (!slot || !builderId || !isConnected) {
      setErrorMessage('Please connect your wallet');
      return;
    }
    
    try {
      setIsBuying(true);
      setErrorMessage(null);
      const amount = BigInt(buyAmount);
      const fragmentPriceWei = slot.fragmentPrice || 0n;
      
      await buyFragments({
        builderId,
        amount,
        fragmentPriceWei
      });
      
      setSuccessMessage(`Successfully purchased ${buyAmount} fragment${buyAmount > 1 ? 's' : ''}!`);
      setShowBuyModal(false);
      setBuyAmount(1);
      await refetch();
    } catch (error: any) {
      const message = error?.message || 'Failed to buy fragments';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to buy fragments:', error);
    } finally {
      setIsBuying(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!slot || !builderId || !isConnected || !bidPrice) {
      setErrorMessage('Please connect your wallet and enter a bid price');
      return;
    }
    
    try {
      setIsPlacingBid(true);
      setErrorMessage(null);
      const pricePerFragment = parseEther(bidPrice);
      const amount = BigInt(bidAmount);
      const durationSeconds = bidDuration * 24 * 60 * 60;
      
      if (pricePerFragment < (slot.flowPrice || 0n)) {
        setErrorMessage(`Bid price must be at least ${formatEther(slot.flowPrice || 0n)} CELO (flow price)`);
        setIsPlacingBid(false);
        return;
      }
      
      await placeBid({
        builderId,
        amount,
        pricePerFragment,
        durationSeconds
      });
      
      setSuccessMessage(`Successfully placed bid for ${bidAmount} fragment${bidAmount > 1 ? 's' : ''}!`);
      setShowPlaceBidModal(false);
      setBidAmount(1);
      setBidPrice('');
      await refetchBids();
    } catch (error: any) {
      const message = error?.message || 'Failed to place bid';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to place bid:', error);
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleAcceptBid = async (bidId: bigint, amount: bigint) => {
    if (!builderId || !isConnected) return;
    
    try {
      setErrorMessage(null);
      await acceptBid({ builderId, bidId, amount });
      setSuccessMessage('Bid accepted successfully!');
      await Promise.all([refetch(), refetchBids()]);
    } catch (error: any) {
      const message = error?.message || 'Failed to accept bid';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to accept bid:', error);
    }
  };

  const handleCancelBid = async (bidId: bigint) => {
    if (!builderId || !isConnected) return;
    
    try {
      setErrorMessage(null);
      await cancelBid(builderId, bidId);
      setSuccessMessage('Bid cancelled successfully!');
      await refetchBids();
    } catch (error: any) {
      const message = error?.message || 'Failed to cancel bid';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to cancel bid:', error);
    }
  };

  const handleUpdateFragmentPrice = async () => {
    if (!builderId || !isConnected || !newFragmentPrice) {
      setErrorMessage('Please enter a new fragment price');
      return;
    }
    
    try {
      setIsUpdatingPrice(true);
      setErrorMessage(null);
      const price = parseEther(newFragmentPrice);
      await updateFragmentPrice({ builderId, newPrice: price });
      setSuccessMessage('Fragment price updated successfully!');
      setNewFragmentPrice('');
      await refetch();
    } catch (error: any) {
      const message = error?.message || 'Failed to update price';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to update fragment price:', error);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleUpdateFlowPrice = async () => {
    if (!builderId || !isConnected || !newFlowPrice) {
      setErrorMessage('Please enter a new flow price');
      return;
    }
    
    try {
      setIsUpdatingPrice(true);
      setErrorMessage(null);
      const price = parseEther(newFlowPrice);
      await updateFlowPrice({ builderId, newPrice: price });
      setSuccessMessage('Flow price updated successfully!');
      setNewFlowPrice('');
      await refetch();
    } catch (error: any) {
      const message = error?.message || 'Failed to update price';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to update flow price:', error);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!builderId || !isConnected || !slot) return;
    
    try {
      setIsTogglingStatus(true);
      setErrorMessage(null);
      await setBuilderSlotStatus(builderId, !slot.active);
      setSuccessMessage(`Builder slot ${!slot.active ? 'activated' : 'deactivated'} successfully!`);
      await refetch();
    } catch (error: any) {
      const message = error?.message || 'Failed to update status';
      setErrorMessage(message.includes('user rejected') ? 'Transaction was rejected' : message);
      console.error('Failed to toggle status:', error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !slot || !builderId) {
    return null; // Don't show card if no builder slot exists
  }

  const TierIcon = tierInfo?.icon || Award;

  const contractAddress = getBuilderRewardsContractAddress();
  const explorerUrl = `https://explorer.celo.org/address/${contractAddress}`;

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden ${className}`}>
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="m-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}
      
      {errorMessage && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Header with Tier Badge */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tierInfo && (
              <div className={`${tierInfo.color} text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm font-semibold`}>
                <TierIcon className="h-4 w-4" />
                {tierInfo.label}
              </div>
            )}
            <div className="text-white">
              <h3 className="font-bold text-lg">Builder Credentials</h3>
              {slot.metadata?.name && (
                <p className="text-sm opacity-90">{slot.metadata.name}</p>
              )}
            </div>
          </div>
          {!slot.active && (
            <Badge variant="secondary" className="bg-red-500 text-white">
              Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Metadata Display */}
        {slot.metadata && (
          <div className="space-y-3">
            {/* Avatar and Banner */}
            {slot.metadata.banner && (
              <div className="w-full h-32 rounded-lg overflow-hidden">
                <img src={slot.metadata.banner} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-start gap-3">
              {slot.metadata.avatar && (
                <img src={slot.metadata.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
              )}
              <div className="flex-1">
                {slot.metadata.headline && (
                  <p className="text-gray-700 text-sm font-medium mb-1">{slot.metadata.headline}</p>
                )}
                {slot.metadata.description && (
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">{slot.metadata.description}</p>
                )}
                {slot.metadata.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin className="h-3 w-3" />
                    {slot.metadata.location}
                  </div>
                )}
              </div>
            </div>
            
            {/* Skills */}
            {slot.metadata.skills && slot.metadata.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slot.metadata.skills.slice(0, showMetadata ? undefined : 3).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {slot.metadata.skills.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => setShowMetadata(!showMetadata)}
                  >
                    {showMetadata ? 'Show Less' : `+${slot.metadata.skills.length - 3} more`}
                  </Button>
                )}
              </div>
            )}

            {/* Social Links */}
            {slot.metadata.socials && Object.keys(slot.metadata.socials).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slot.metadata.socials.twitter && (
                  <a href={slot.metadata.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                    <Twitter className="h-3 w-3" />
                  </a>
                )}
                {slot.metadata.socials.github && (
                  <a href={slot.metadata.socials.github} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                    <Github className="h-3 w-3" />
                  </a>
                )}
                {slot.metadata.socials.linkedin && (
                  <a href={slot.metadata.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                    <Linkedin className="h-3 w-3" />
                  </a>
                )}
                {slot.metadata.socials.discord && (
                  <a href={slot.metadata.socials.discord} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors">
                    <MessageCircle className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{slot.fragmentsSold?.toString() || '0'}</div>
            <div className="text-xs text-gray-500">Sold</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{remainingFragments}</div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{slot.projectCount?.toString() || '0'}</div>
            <div className="text-xs text-gray-500">Projects</div>
          </div>
          {isConnected && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Number(userBalance || 0n)}</div>
              <div className="text-xs text-gray-500">Your Fragments</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fragment Supply</span>
            <span className="font-semibold text-gray-900">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fragment Price</span>
            <span className="text-lg font-bold text-gray-900 flex items-center gap-1">
              {formatEther(slot.fragmentPrice || 0n)} <img src="/images/celo.png" alt="CELO" width={18} height={18} className="inline-block" />
            </span>
          </div>
          {slot.flowPrice && slot.flowPrice > 0n ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600">Flow Price</span>
                <div className="group relative">
                  <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Minimum bid price when all fragments are sold out (secondary market)
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                {formatEther(slot.flowPrice)} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
              </span>
            </div>
          ) : null}
        </div>

        {/* Active Bids Count */}
        {isSoldOut && bids && bids.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {bids.length} Active Bid{bids.length > 1 ? 's' : ''}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBidsModal(true)}
                className="text-xs"
              >
                View Bids
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isOwner && !isSoldOut && slot.active && (
            <Button
              onClick={() => setShowBuyModal(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              disabled={isBuying || !slot.active}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isBuying ? 'Processing...' : 'Buy Fragments'}
            </Button>
          )}

          {!isOwner && isSoldOut && slot.active && (
            <Button
              onClick={() => setShowPlaceBidModal(true)}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              disabled={isPlacingBid}
            >
              <Gavel className="h-4 w-4 mr-2" />
              {isPlacingBid ? 'Processing...' : 'Place Bid'}
            </Button>
          )}

          {!slot.active && (
            <div className="text-center py-2 px-4 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm font-semibold text-gray-600">Slot Inactive</span>
            </div>
          )}

          {isSoldOut && !isOwner && (
            <div className="text-center py-2 px-4 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm font-semibold text-amber-800">Sold Out</span>
            </div>
          )}

          {isOwner && (
            <div className="space-y-2">
              <div className="text-center py-2 px-4 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-semibold text-blue-800">Your Builder Slot</span>
              </div>
              <Button
                onClick={() => setShowOwnerActions(true)}
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Slot
              </Button>
            </div>
          )}

          {/* View on Explorer */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View on Explorer
          </a>
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowBuyModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Buy Builder Fragments</h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Amount (1-{remainingFragments})
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBuyAmount(remainingFragments)}
                    className="text-xs"
                  >
                    Max
                  </Button>
                </div>
                <input
                  type="number"
                  min={1}
                  max={remainingFragments}
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(Math.max(1, Math.min(remainingFragments, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per Fragment</span>
                  <span className="font-semibold flex items-center gap-1">
                    {formatEther(slot.fragmentPrice || 0n)} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="flex items-center gap-1">
                    {formatEther((slot.fragmentPrice || 0n) * BigInt(buyAmount))} <img src="/images/celo.png" alt="CELO" width={16} height={16} className="inline-block" />
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBuyModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBuyFragments}
                  disabled={isBuying || !isConnected}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy {buyAmount} Fragment{buyAmount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place Bid Modal */}
      {showPlaceBidModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPlaceBidModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Place Bid</h3>
              <button
                onClick={() => setShowPlaceBidModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (fragments)
                </label>
                <input
                  type="number"
                  min={1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Fragment (CELO)
                  <span className="text-xs text-gray-500 ml-1">
                    (Min: {formatEther(slot.flowPrice || 0n)})
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={Number(formatEther(slot.flowPrice || 0n))}
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={formatEther(slot.flowPrice || 0n)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Duration (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={bidDuration}
                  onChange={(e) => setBidDuration(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {bidPrice && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per Fragment</span>
                    <span className="font-semibold flex items-center gap-1">
                      {bidPrice} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Escrow</span>
                    <span className="font-semibold flex items-center gap-1">
                      {(parseFloat(bidPrice) * bidAmount).toFixed(4)} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPlaceBidModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlaceBid}
                  disabled={isPlacingBid || !isConnected || !bidPrice}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600"
                >
                  {isPlacingBid ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bids Modal */}
      {showBidsModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowBidsModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Active Bids</h3>
              <button
                onClick={() => setShowBidsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bidsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : bids && bids.length > 0 ? (
              <div className="space-y-3">
                {bids.map((bid) => {
                  const isUserBid = bid.bidder.toLowerCase() === userAddress?.toLowerCase();
                  return (
                    <div
                      key={bid.id.toString()}
                      className={`p-4 rounded-lg border ${
                        isUserBid ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-gray-600">
                              {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                            </span>
                            {isUserBid && (
                              <Badge variant="secondary" className="text-xs">Your Bid</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Amount: </span>
                              <span className="font-semibold">{Number(bid.amount)} fragments</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Price: </span>
                              <span className="font-semibold flex items-center gap-1">
                                {bid.pricePerFragmentFormatted} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Total: </span>
                              <span className="font-semibold flex items-center gap-1">
                                {bid.totalValueFormatted} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Expires: </span>
                              <span className="font-semibold">{formatTimeRemaining(bid.expiresInSeconds)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {isOwner && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptBid(bid.id, bid.amount)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Accept
                            </Button>
                          )}
                          {isUserBid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelBid(bid.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No active bids
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Actions Modal */}
      {showOwnerActions && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowOwnerActions(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Manage Builder Slot</h3>
              <button
                onClick={() => setShowOwnerActions(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Update Fragment Price */}
              {!isSoldOut && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Fragment Price (CELO)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newFragmentPrice}
                      onChange={(e) => setNewFragmentPrice(e.target.value)}
                      placeholder={formatEther(slot.fragmentPrice || 0n)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleUpdateFragmentPrice}
                      disabled={isUpdatingPrice || !newFragmentPrice}
                      size="sm"
                    >
                      {isUpdatingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Update Flow Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Flow Price (CELO)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={newFlowPrice}
                    onChange={(e) => setNewFlowPrice(e.target.value)}
                    placeholder={formatEther(slot.flowPrice || 0n)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleUpdateFlowPrice}
                    disabled={isUpdatingPrice || !newFlowPrice}
                    size="sm"
                  >
                    {isUpdatingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                  </Button>
                </div>
              </div>

              {/* Toggle Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slot Status
                </label>
                <Button
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  variant={slot.active ? "destructive" : "default"}
                  className="w-full"
                >
                  {isTogglingStatus ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : slot.active ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {slot.active ? 'Deactivate Slot' : 'Activate Slot'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderSlotCard;

