import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EngagementRewardsCardProps {
  className?: string;
}

const EngagementRewardsCard: React.FC<EngagementRewardsCardProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleClaimClick = () => {
    navigate('/app/profile');
  };

  const handleGoodDollarClick = () => {
    window.open('https://gooddollar.org', '_blank');
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
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Engagement Rewards
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Claim 0.5 dollars to support your favorite project
          </p>
          
          {/* Action Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleClaimClick}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
            >
              Claim 
              <ExternalLink className="ml-1 w-4 h-4" />
            </button>
          </div>
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

    </div>
  );
};

export default EngagementRewardsCard;

