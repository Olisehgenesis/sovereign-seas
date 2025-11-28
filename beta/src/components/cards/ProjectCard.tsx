import React, { useState, useEffect } from 'react';
import { ArrowRight, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjectRoute } from '@/utils/hashids';
import { capitalizeWords } from '@/utils/textUtils';
import TipModal from '@/components/TipModal';
import { extractIpfsCid, fetchIpfsImageObjectUrl } from '@/utils/imageUtils';

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
  const [resolvedLogo, setResolvedLogo] = useState<string | undefined>(undefined);

  // Resolve IPFS-based logos via IPFS HTTP client; fall back to direct URL for non-IPFS logos
  useEffect(() => {
    let cancelled = false;

    const loadLogo = async () => {
      if (!logo) {
        setResolvedLogo(undefined);
        return;
      }

      const cid = extractIpfsCid(logo);
      if (!cid) {
        setResolvedLogo(logo);
        return;
      }

      try {
        const url = await fetchIpfsImageObjectUrl(logo);
        if (!cancelled) {
          setResolvedLogo(url);
        }
      } catch (error) {
        console.error('[ProjectCard] Failed to fetch image via IPFS client, falling back to URL', {
          error,
          logo,
        });
        if (!cancelled) {
          setResolvedLogo(logo);
        }
      }
    };

    loadLogo();

    return () => {
      cancelled = true;
    };
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

      if (url.hostname === 'inner-salmon-leopard.myfilebase.com') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }
      if (url.hostname === 'gateway.pinata.cloud') {
        return `https://ipfs.io/ipfs/${cid}`;
      }
      if (url.hostname === 'ipfs.io') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }

      return `https://ipfs.io/ipfs/${cid}`;
    } catch {
      return null;
    }
  };

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
        <div className="relative h-36 sm:h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border-2 border-gray-300 p-3 sm:p-6">

          {/* Square Image in Top Right Corner - Desktop only */}
          {resolvedLogo && (
            <div className="hidden sm:block absolute top-4 right-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={resolvedLogo} 
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const originalSrc = e.currentTarget.src;
                  const fallback = getFallbackImageUrl(originalSrc);
                  console.warn('[ProjectCard] image load failed, attempting fallback', {
                    projectId,
                    originalSrc,
                    fallback,
                  });
                  if (fallback && fallback !== originalSrc) {
                    e.currentTarget.src = fallback;
                  } else {
                    e.currentTarget.style.display = 'none';
                  }
                }}
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
            {campaignCount !== undefined && campaignCount > 0 && (
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