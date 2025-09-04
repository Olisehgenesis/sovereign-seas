import React from 'react';
import { Trophy, CheckCircle, Timer, Activity, ChevronRight, ArrowRight } from 'lucide-react';
import { capitalizeWords } from '../../utils/textUtils';

interface CampaignCardProps {
  title: string;
  description: string;
  logo?: string;
  status?: 'upcoming' | 'active' | 'ended' | 'paused';
  className?: string;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  title,
  description,
  logo,
  status = 'active',
  className = ''
}) => {
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
      {/* Two-Card Folder Design */}
      <div className="relative">
        {/* Top Card - Folder Design */}
        <div className="relative h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl border-2 border-blue-300 overflow-hidden z-0 group-hover:-translate-y-24 transition-transform duration-500">
          {/* Folder Top Tab */}
          <div className="absolute top-0 left-0 w-24 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-t-lg z-10">
            <div className="absolute top-0 left-0 w-20 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-t-lg"></div>
          </div>
          
          {/* Campaign Image - Spans both cards */}
          {logo ? (
            <div className="absolute inset-0">
              <img 
                src={logo} 
                alt={title}
                className="w-full h-full object-cover rounded-lg shadow-lg"
                style={{ height: '200%' }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="h-20 w-20 text-gray-400/50" />
            </div>
          )}
          
          {/* Folder Papers Effect - Shows when image is hidden */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-100 to-transparent group-hover:opacity-0 transition-opacity duration-500">
            <div className="absolute bottom-2 left-4 right-4 h-0.5 bg-gray-300"></div>
            <div className="absolute bottom-3 left-4 right-4 h-0.5 bg-gray-300"></div>
            <div className="absolute bottom-4 left-4 right-4 h-0.5 bg-gray-300"></div>
          </div>



          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
        </div>

        {/* Bottom Card - Square, same dimensions, stacked effect */}
        <div className="absolute top-0 w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl border-2 border-blue-300 translate-y-10 z-10 p-6 group-hover:opacity-40 transition-opacity duration-500">
          {/* Small Button in Bottom Right Corner */}
          <button className="absolute bottom-4 right-4 w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200">
            <ArrowRight className="h-4 w-4" />
          </button>
          
          {/* Folder Text Content */}
          <div className="h-full flex flex-col">
            {/* Status Badge and Campaign Name */}
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">{capitalizeWords(title)}</h3>
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
            <p className="text-gray-600 text-xs leading-relaxed mb-2">
              {description.length > 70 ? `${description.substring(0, 70)}...` : description}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CampaignCard;
