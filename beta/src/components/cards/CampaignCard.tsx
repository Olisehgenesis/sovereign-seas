import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, Timer, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCampaignRoute } from '@/utils/hashids';
import { capitalizeWords } from '@/utils/textUtils';

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
    >
      {/* Single Card with Background Logo and Transparent Overlay */}
      <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
        {/* Background Logo/Image */}
        <div className="absolute inset-0">
          {logo ? (
            <img 
              src={logo} 
              alt={title}
              className="w-full h-full object-cover brightness-75"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <Trophy className="h-20 w-20 text-blue-400/60" />
            </div>
          )}
        </div>

        {/* Gradient Overlay for Better Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

        {/* Transparent Content Overlay with White Text */}
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
          {/* Status Badge - Top Right Corner */}
          {statusInfo && (
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-lg ${statusInfo.class}`}>
                {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                {statusInfo.text}
              </span>
            </div>
          )}

          {/* Title - White Text */}
          <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 pr-20 drop-shadow-lg">
            {capitalizeWords(title)}
          </h3>

          {/* Countdown Timer - Highlighted */}
          {timeLeft && timeLeft !== 'Ended' && (
            <div className="mb-3 px-3 py-1 bg-blue-500/90 text-white text-xs rounded-full inline-flex items-center shadow-md">
              <Timer className="h-3 w-3 mr-1" />
              {timeLeft}
            </div>
          )}

          {/* Description - White Text */}
          <p className="text-sm text-white/90 leading-relaxed mb-3 line-clamp-2 drop-shadow-md">
            {description.length > descriptionTruncateSize ? `${description.substring(0, descriptionTruncateSize)}...` : description}
          </p>

          {/* Action Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (campaignId) {
                console.log('Button clicked, navigating to:', getCampaignRoute(Number(campaignId)));
                navigate(getCampaignRoute(Number(campaignId)));
              }
            }}
            className="absolute bottom-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 border border-white/30"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Subtle Highlight Effect */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 group-hover:ring-white/40 transition-all duration-300"></div>
      </div>

      {/* Highlighter Effect Below Card */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent rounded-full blur-sm group-hover:via-yellow-400/80 transition-all duration-300"></div>
    </div>
  );
};

export default CampaignCard;
