import React, { useState } from 'react';
import { ArrowRight, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjectRoute } from '@/utils/hashids';
import { capitalizeWords } from '@/utils/textUtils';
import TipModal from '@/components/TipModal';

interface ProjectCardProps {
  title: string;
  description: string;
  logo?: string;
  location?: string;
  campaignCount?: number;
  className?: string;
  projectId?: string;
  projectOwner?: string;
  contractAddress?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  logo,
  campaignCount,
  className = '',
  projectId,
  projectOwner,
  contractAddress
}) => {
  const navigate = useNavigate();
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);

  const handleCardClick = () => {
    if (projectId) {
      navigate(getProjectRoute(Number(projectId)));
    }
  };

  return (
    <div 
      className={`group relative ${className} cursor-pointer`}
      onClick={handleCardClick}
    >
      {/* Single Card Design */}
      <div className="relative">
        {/* Project Card */}
        <div className="relative h-32 sm:h-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border-2 border-gray-300 p-3 sm:p-6">

          {/* Square Image in Top Right Corner - Desktop only */}
          {logo && (
            <div className="hidden sm:block absolute top-4 right-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={logo} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Action Buttons in Bottom Right Corner */}
          <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex gap-1 sm:gap-2">
            {/* Tip Button */}
            {projectId && projectOwner && contractAddress && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTipModalOpen(true);
                }}
                className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-sm"
                title="Tip this project"
              >
                <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}
            
            {/* View Project Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                projectId && navigate(getProjectRoute(Number(projectId)));
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200"
              title="View project details"
            >
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
          
          {/* Project Text Content */}
          <div className="h-full flex flex-col">
            {/* Project Name */}
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 line-clamp-2 mb-1 sm:mb-2">{capitalizeWords(title)}</h3>
            
            {/* Campaign Count */}
            {campaignCount && campaignCount > 0 && (
              <div className="mb-2 sm:mb-4">
                <span className="text-xs sm:text-sm text-gray-600">{campaignCount} Campaigns</span>
              </div>
            )}
            
            {/* Spacer to push description down */}
            <div className="flex-1"></div>
            
            {/* Description - Max 70 characters, aligned above button */}
            <p className="text-gray-600 text-xs leading-relaxed mb-1 sm:mb-2">
              {description.length > 40 ? `${description.substring(0, 40)}...` : description}
            </p>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {projectId && projectOwner && contractAddress && (
        <TipModal
          isOpen={isTipModalOpen}
          onClose={() => setIsTipModalOpen(false)}
          project={{
            id: BigInt(projectId),
            name: title,
            owner: projectOwner,
            contractAddress: contractAddress
          }}
          onTipSuccess={() => {
            setIsTipModalOpen(false);
            // Optionally show a success message or refresh data
          }}
        />
      )}
    </div>
  );
};

export default ProjectCard;