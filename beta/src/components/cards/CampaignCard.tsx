import React from 'react';
import { Trophy, CheckCircle, Timer, Activity, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { capitalizeWords } from '@/utils/textUtils';

interface CampaignCardProps {
  title: string;
  description: string;
  logo?: string;
  status?: 'upcoming' | 'active' | 'ended' | 'paused';
  className?: string;
  campaignId?: string;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  title,
  description,
  logo,
  status = 'active',
  className = '',
  campaignId
}) => {
  const navigate = useNavigate();
  const getStatusInfo = () => {
    switch (status) {
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

  return (
    <div className={`group relative ${className}`}>
      {/* Two-Card Folder Design on Desktop, Single Card on Mobile */}
      <div className="relative">
        {/* Top Card - Folder Design (Desktop) / Single Card (Mobile) */}
        <div className="relative h-32 sm:h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-sm border-2 border-blue-300 overflow-hidden sm:group-hover:-translate-y-24 transition-transform duration-500">
          {/* Folder Top Tab - Hidden on Mobile */}
          <div className="hidden sm:block absolute top-0 left-0 w-24 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-t-lg">
            <div className="absolute top-0 left-0 w-20 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-t-lg"></div>
          </div>
          
          {/* Campaign Image - Desktop only */}
          {logo ? (
            <div className="hidden sm:block absolute inset-0">
              <img 
                src={logo} 
                alt={title}
                className="w-full h-full object-cover rounded-lg shadow-lg"
                style={{ height: '200%' }}
              />
            </div>
          ) : (
            <div className="hidden sm:block absolute inset-0 flex items-center justify-center">
              <Trophy className="h-20 w-20 text-gray-400/50" />
            </div>
          )}
          
          {/* Folder Papers Effect - Desktop only */}
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-100 to-transparent group-hover:opacity-0 transition-opacity duration-500">
            <div className="absolute bottom-2 left-4 right-4 h-0.5 bg-gray-300"></div>
            <div className="absolute bottom-3 left-4 right-4 h-0.5 bg-gray-300"></div>
            <div className="absolute bottom-4 left-4 right-4 h-0.5 bg-gray-300"></div>
          </div>



          {/* Gradient Overlay - Desktop only */}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          {/* Mobile: Button and Content */}
          <div className="sm:hidden">
            {/* Small Button in Bottom Right Corner */}
            <button 
              onClick={() => campaignId && navigate(`/explorer/campaign/${campaignId}`)}
              className="absolute bottom-2 right-2 w-6 h-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
            
            {/* Campaign Text Content */}
            <div className="h-full flex flex-col p-3">
              {/* Status Badge and Campaign Name */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{capitalizeWords(title)}</h3>
                {statusInfo && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
                    {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                    {statusInfo.text}
                  </span>
                )}
              </div>
              
              {/* Spacer to push description down */}
              <div className="flex-1"></div>
              
              {/* Description - Max 40 characters, aligned above button */}
              <p className="text-gray-600 text-xs leading-relaxed mb-1">
                {description.length > 40 ? `${description.substring(0, 40)}...` : description}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Card - Desktop only, Square, same dimensions, stacked effect */}
        <div className="hidden sm:block absolute top-0 w-full h-28 sm:h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-sm border-2 border-blue-300 translate-y-10 p-3 sm:p-6 group-hover:opacity-40 transition-opacity duration-500">
          {/* Small Button in Bottom Right Corner */}
          <button 
            onClick={() => campaignId && navigate(`/explorer/campaign/${campaignId}`)}
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200"
          >
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          
          {/* Folder Text Content */}
          <div className="h-full flex flex-col">
            {/* Status Badge and Campaign Name */}
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <h3 className="text-sm sm:text-lg font-bold text-gray-900 line-clamp-2 flex-1">{capitalizeWords(title)}</h3>
              {statusInfo && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
                  {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                  {statusInfo.text}
                </span>
              )}
            </div>
            
            {/* Spacer to push description down */}
            <div className="flex-1"></div>
            
            {/* Description - Max 70 characters, aligned above button */}
            <p className="text-gray-600 text-xs leading-relaxed mb-1 sm:mb-2">
              {description.length > 40 ? `${description.substring(0, 40)}...` : description}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CampaignCard;
