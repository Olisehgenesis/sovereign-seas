'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Copy, Share2, CheckCircle, Gift } from 'lucide-react';
import ClaimModal from '@/components/modals/ClaimModal';
import { useAccount } from 'wagmi';
import { ButtonCool } from '@/components/ui/button-cool';

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
    if (typeof window !== 'undefined') {
      window.open('https://gooddollar.org', '_blank');
    }
  };

  const generateReferralLink = () => {
    if (!address || typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/?referral=${address}`;
  };

  const handleCopyReferralLink = async () => {
    const link = generateReferralLink();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareReferralLink = () => {
    const link = generateReferralLink();
    if (!link) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
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
    <div className={`group relative w-full max-w-sm ${className}`}>
      {/* Pattern Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Dots Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'radial-gradient(#cfcfcf 1px, transparent 1px)',
          backgroundSize: '1em 1em',
          backgroundPosition: '-0.5em -0.5em'
        }}
      />

      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden origin-center z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02] active:translate-x-[0.1em] active:translate-y-[0.1em] active:scale-[0.98] active:shadow-[0.5em_0.5em_0_#000000]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-[0.4em] right-[0.4em] z-[3] p-1 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Close card"
        >
          <X className="w-4 h-4 text-[#050505] font-bold" />
        </button>

        {/* Accent Corner - Green for engagement */}
        <div 
          className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]"
        />
        <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#10b981',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <Gift className="w-5 h-5 mr-2" />
          <span className="flex-1">Claim Free $G</span>
        </div>

        {/* Card Body */}
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          {/* Good Dollar Logo */}
          <div className="flex justify-center mb-[1.5em] -mt-[2em]">
            <div className="w-[5em] h-[5em] rounded-full border-[0.4em] border-white shadow-[0_0.5em_1em_rgba(0,0,0,0.2),0.3em_0.3em_0_#000000] overflow-hidden bg-[#10b981] transition-all duration-300 group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-[0_0.7em_1.5em_rgba(0,0,0,0.3),0.4em_0.4em_0_#000000]">
              <img 
                src="/images/good.png" 
                alt="Good Dollar" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-[1.5em] text-[#050505] text-[0.95em] leading-[1.4] font-medium text-center">
            to vote your favorite projects
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-[1em] mb-[1.5em]">
            <ButtonCool
              onClick={handleClaimClick}
              text="Claim"
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4" />
            </ButtonCool>
            
            <ButtonCool
              onClick={() => setShowReferral(!showReferral)}
              text={showReferral ? "Hide Referral" : "Share Referral"}
              bgColor="#10b981"
              hoverBgColor="#059669"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
              className="w-full"
            >
              <Share2 className="w-4 h-4" />
            </ButtonCool>
          </div>

          {/* Referral Section */}
          {showReferral && (
            <div className="mt-3 p-3 bg-[#d1fae5] border-[0.15em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <div className="text-sm text-[#065f46] mb-2 font-semibold">
                Share your referral link to earn rewards when others claim!
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generateReferralLink()}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs bg-white border-[0.15em] border-[#050505] rounded-[0.3em] font-mono text-[0.75em]"
                />
                <button
                  onClick={handleCopyReferralLink}
                  className="px-2 py-1 bg-[#10b981] hover:bg-[#059669] text-white text-xs rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.15em_0.15em_0_#000000] transition-all hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] hover:shadow-[0.2em_0.2em_0_#000000] active:translate-x-[0.05em] active:translate-y-[0.05em] active:shadow-[0.1em_0.1em_0_#000000]"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleShareReferralLink}
                  className="px-2 py-1 bg-[#10b981] hover:bg-[#059669] text-white text-xs rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.15em_0.15em_0_#000000] transition-all hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] hover:shadow-[0.2em_0.2em_0_#000000] active:translate-x-[0.05em] active:translate-y-[0.05em] active:shadow-[0.1em_0.1em_0_#000000]"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Accent Shape */}
        <div className="absolute w-[2.5em] h-[2.5em] bg-[#10b981] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0 transition-transform duration-300 group-hover:rotate-[55deg] group-hover:scale-110" />

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />

        {/* Powered by Good Dollar */}
        <div className="absolute bottom-[1.5em] left-[1.5em] z-[1]">
          <button
            onClick={handleGoodDollarClick}
            className="text-[0.6em] text-gray-600 hover:text-gray-800 font-semibold uppercase tracking-[0.05em] transition-colors"
          >
            Powered by Good Dollar
          </button>
        </div>
      </div>

      <ClaimModal open={claimOpen} onOpenChange={setClaimOpen} />
    </div>
  );
};

export default EngagementRewardsCard;

