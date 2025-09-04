import React from 'react';
import { ArrowRight } from 'lucide-react';
import { capitalizeWords } from '../../utils/textUtils';

interface ProjectCardProps {
  title: string;
  description: string;
  logo?: string;
  location?: string;
  campaignCount?: number;
  className?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  logo,
  location,
  campaignCount,
  className = ''
}) => {
  // Trim description to 70 characters
  const trimmedDescription = description.length > 70 ? `${description.substring(0, 70)}...` : description;

  return (
    <div className={`group relative ${className}`}>
      {/* Single Card Design */}
      <div className="relative">
        {/* Project Card */}
        <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-xl border-2 border-gray-300 p-6">

          {/* Square Image in Top Right Corner */}
          {logo && (
            <div className="absolute top-4 right-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={logo} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Small Button in Bottom Right Corner */}
          <button className="absolute bottom-4 right-4 w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200">
            <ArrowRight className="h-4 w-4" />
          </button>
          
          {/* Project Text Content */}
          <div className="h-full flex flex-col">
            {/* Project Name */}
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">{capitalizeWords(title)}</h3>
            
            {/* Campaign Count */}
            {campaignCount && campaignCount > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-600">{campaignCount} Campaigns</span>
              </div>
            )}
            
            {/* Spacer to push description down */}
            <div className="flex-1"></div>
            
            {/* Description - Max 70 characters, aligned above button */}
            <p className="text-gray-600 text-xs leading-relaxed mb-2">
              {trimmedDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;