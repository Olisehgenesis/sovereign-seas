import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { capitalizeWords } from '@/utils/textUtils';

interface ProjectCardProps {
  title: string;
  description: string;
  logo?: string;
  location?: string;
  campaignCount?: number;
  className?: string;
  projectId?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  logo,
  location,
  campaignCount,
  className = '',
  projectId
}) => {
  const navigate = useNavigate();
  // Trim description to 70 characters
  const trimmedDescription = description.length > 70 ? `${description.substring(0, 70)}...` : description;

  return (
    <div className={`group relative ${className}`}>
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

          {/* Small Button in Bottom Right Corner */}
          <button 
            onClick={() => projectId && navigate(`/explorer/project/${projectId}`)}
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200"
          >
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          
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
    </div>
  );
};

export default ProjectCard;