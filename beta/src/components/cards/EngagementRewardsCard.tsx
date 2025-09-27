import React, { useState } from 'react';
import { X, ExternalLink, Copy, Share2, CheckCircle } from 'lucide-react';
import ClaimModal from '@/components/modals/ClaimModal';
import { useAccount } from 'wagmi';

interface EngagementRewardsCardProps {
  className?: string;
}

const EngagementRewardsCard: React.FC<EngagementRewardsCardProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address } = useAccount();

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleClaimClick = () => {
    setClaimOpen(true);
  };

  const handleGoodDollarClick = () => {
    window.open('https://gooddollar.org', '_blank');
  };

  const generateReferralLink = () => {
    if (!address) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/?referral=${address}`;
  };

  const handleCopyReferralLink = async () => {
    const link = generateReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareReferralLink = () => {
    const link = generateReferralLink();
    if (navigator.share) {
      navigator.share({
        title: 'Join Sovereign Seas',
        text: 'Refer someone and you both earn! Join Sovereign Seas with my referral link.',
        url: link,
      });
    } else {
      handleCopyReferralLink();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-white border border-green-200 rounded-lg shadow-lg p-4 relative max-w-sm ${className}`}>
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Close card"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>

      {/* Card Content */}
      <div className="flex items-start gap-3">
        {/* Good Dollar Logo */}
        <div className="flex-shrink-0">
          <img 
            src="/images/good.png" 
            alt="Good Dollar" 
            className="w-12 h-12 rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Claim Free $G
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            to vote your favorite projects
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleClaimClick}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
            >
              Claim 
              <ExternalLink className="ml-1 w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowReferral(!showReferral)}
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full transition-colors"
            >
              <Share2 className="mr-1 w-4 h-4" />
              Refer someone and you both earn
            </button>
          </div>

          {/* Referral Section */}
          {showReferral && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800 mb-2">
                Share your referral link to earn rewards when others claim!
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generateReferralLink()}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs bg-white border border-green-300 rounded"
                />
                <button
                  onClick={handleCopyReferralLink}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleShareReferralLink}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Powered by Good Dollar */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={handleGoodDollarClick}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Powered by Good Dollar
        </button>
      </div>

      <ClaimModal open={claimOpen} onOpenChange={setClaimOpen} />
    </div>
  );
};

export default EngagementRewardsCard;

