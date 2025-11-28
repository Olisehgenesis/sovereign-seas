import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Trophy, CheckCircle, Timer, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from '@/utils/nextAdapter';
import { getCampaignRoute } from '@/utils/hashids';
import { capitalizeWords } from '@/utils/textUtils';
import { ipfsImageLoader } from '@/utils/imageUtils';

interface CampaignCardProps {
  title: string;
  description: string;
  logo?: string;
  status?: 'upcoming' | 'active' | 'ended' | 'paused';
  className?: string;
  campaignId?: string;
  descriptionTruncateSize?: number;
  startTime?: number;
  endTime?: number;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  title,
  description,
  logo,
  status = 'active',
  className = '',
  campaignId,
  descriptionTruncateSize = 40,
  startTime,
  endTime
}) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const [currentStatus, setCurrentStatus] = useState(status);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  // Countdown effect
  useEffect(() => {
    if (!startTime || !endTime) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const hasStarted = now >= startTime;
      const hasEnded = now >= endTime;

      if (hasEnded) {
        setTimeLeft('Ended');
        setCurrentStatus('ended');
        return;
      }

      if (!hasStarted) {
        const diff = startTime - now;
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        setCurrentStatus('upcoming');
      } else {
        const diff = endTime - now;
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        setCurrentStatus('active');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const getStatusInfo = () => {
    switch (currentStatus) {
      case 'upcoming':
        return { class: 'bg-cyan-400 text-black', text: 'Coming Soon', icon: Timer };
      case 'active':
        return { class: 'bg-gradient-to-r from-black to-gray-800 text-white', text: 'Active', icon: Activity };
      case 'ended':
      case 'paused':
      default:
        return { class: 'bg-gray-200 text-gray-700', text: 'Ended', icon: CheckCircle };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo?.icon;

  useEffect(() => {
    if (!logo) {
      setImageSrc(undefined);
      return;
    }
    setImageSrc(logo);
  }, [logo]);

  // Try a secondary IPFS gateway if the first image URL fails
  const getFallbackImageUrl = (src: string | undefined | null): string | null => {
    if (!src) return null;
    try {
      const url = new URL(src);
      const parts = url.pathname.split('/');
      const ipfsIndex = parts.findIndex((p) => p === 'ipfs');
      const cid = ipfsIndex !== -1 ? parts[ipfsIndex + 1] : null;
      if (!cid) return null;

      // Flip between MyFilebase, Pinata and ipfs.io as fallbacks
      if (url.hostname === 'inner-salmon-leopard.myfilebase.com') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }
      if (url.hostname === 'gateway.pinata.cloud') {
        return `https://ipfs.io/ipfs/${cid}`;
      }
      if (url.hostname === 'ipfs.io') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }

      // If some other host, keep it simple and try ipfs.io
      return `https://ipfs.io/ipfs/${cid}`;
    } catch {
      return null;
    }
  };

  const handleCardClick = () => {
    if (campaignId) {
      console.log('Campaign card clicked, navigating to:', getCampaignRoute(Number(campaignId)));
      navigate(getCampaignRoute(Number(campaignId)));
    } else {
      console.warn('Campaign card clicked but no campaignId provided');
    }
  };

  return (
    <div
      className={`group relative ${className} cursor-pointer`}
      onClick={handleCardClick}
      onMouseDown={() => console.log('Campaign card mouse down, campaignId:', campaignId)}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="relative" style={{ pointerEvents: 'auto' }}>
        {/* Elevated face */}
        <div className="relative z-10 h-64 rounded-3xl overflow-hidden bg-gray-900 shadow-2xl transition duration-500 group-hover:-translate-y-6 group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.6)]" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0">
            {imageSrc ? (
              <Image
                loader={ipfsImageLoader}
                src={imageSrc}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-60"
                onError={(event) => {
                  const originalSrc = event.currentTarget.src;
                  const fallback = getFallbackImageUrl(originalSrc);
                  console.warn('[CampaignCard] image load failed, attempting fallback', {
                    campaignId,
                    originalSrc,
                    fallback,
                  });
                  if (fallback && fallback !== originalSrc) {
                    setImageSrc(fallback);
                  } else {
                    setImageSrc(undefined);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <Trophy className="h-16 w-16 text-gray-600" />
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/60 to-transparent" />
          <div className="relative h-full p-5 flex flex-col justify-between">
            {statusInfo && (
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${statusInfo.class}`}>
                  {StatusIcon && <StatusIcon className="h-3.5 w-3.5 mr-1" />}
                  {statusInfo.text}
                </span>
                {timeLeft && (
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gray-300">
                    {currentStatus === 'upcoming' ? 'Starts in' : currentStatus === 'active' ? 'Ends in' : ''}
                  </span>
                )}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-semibold text-white mb-3 line-clamp-2">
                {capitalizeWords(title)}
              </h3>
              {timeLeft && timeLeft !== 'Ended' && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs text-white mb-3">
                  <Timer className="h-3.5 w-3.5" />
                  {timeLeft}
                </div>
              )}
              <p className="text-sm text-white/80 line-clamp-2">
                {description.length > descriptionTruncateSize ? `${description.substring(0, descriptionTruncateSize)}...` : description}
              </p>
            </div>
          </div>
        </div>

        {/* Supporting face */}
        <div className="absolute inset-x-3 -bottom-10 rounded-3xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.35)] transition duration-500 group-hover:-translate-y-2" style={{ pointerEvents: 'none' }}>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex flex-col">
                <span className="uppercase tracking-[0.25em] text-gray-400 text-[10px]">Status</span>
                <span className="text-gray-900 font-medium">{capitalizeWords(currentStatus)}</span>
              </div>
              {timeLeft === 'Ended' && (
                <div className="text-right">
                  <span className="uppercase tracking-[0.25em] text-gray-400 text-[10px]">Completed</span>
                  <span className="block text-gray-900 font-medium">Campaign wrap</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 flex-1 pr-4 leading-relaxed">
                {description.length > descriptionTruncateSize ? `${description.substring(0, descriptionTruncateSize)}...` : description}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (campaignId) {
                    navigate(getCampaignRoute(Number(campaignId)));
                  }
                }}
                className="w-10 h-10 rounded-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors flex items-center justify-center"
                style={{ pointerEvents: 'auto' }}
                aria-label="View campaign details"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
