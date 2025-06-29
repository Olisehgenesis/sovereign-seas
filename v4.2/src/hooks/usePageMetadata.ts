import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  updatePageMetadata, 
  updateFavicon, 
  generatePageMetadata,
  generateProjectMetadata,
  generateCampaignMetadata,
  type PageMetadata,
  type ProjectMetadata,
  type CampaignMetadata
} from '@/utils/metadataUtils';

/**
 * Hook for managing page metadata
 */
export function usePageMetadata(metadata: PageMetadata) {
  const location = useLocation();

  useEffect(() => {
    updatePageMetadata(metadata);
  }, [metadata, location.pathname]);
}

/**
 * Hook for managing project page metadata
 */
export function useProjectMetadata(project: ProjectMetadata | null) {
  const location = useLocation();

  useEffect(() => {
    if (project) {
      const metadata = generateProjectMetadata(project);
      updatePageMetadata(metadata);
      
      // Update favicon with project logo
      updateFavicon(project.logo);
    } else {
      // Reset to default metadata
      const defaultMetadata = generatePageMetadata({
        title: 'Project Not Found | Sovereign Seas',
        description: 'The requested project could not be found.',
        url: location.pathname
      });
      updatePageMetadata(defaultMetadata);
      updateFavicon();
    }
  }, [project, location.pathname]);
}

/**
 * Hook for managing campaign page metadata
 */
export function useCampaignMetadata(campaign: CampaignMetadata | null) {
  const location = useLocation();

  useEffect(() => {
    if (campaign) {
      const metadata = generateCampaignMetadata(campaign);
      updatePageMetadata(metadata);
      
      // Update favicon with campaign/project logo
      updateFavicon(campaign.projectLogo);
    } else {
      // Reset to default metadata
      const defaultMetadata = generatePageMetadata({
        title: 'Campaign Not Found | Sovereign Seas',
        description: 'The requested campaign could not be found.',
        url: location.pathname
      });
      updatePageMetadata(defaultMetadata);
      updateFavicon();
    }
  }, [campaign, location.pathname]);
}

/**
 * Hook for managing general page metadata
 */
export function useGeneralPageMetadata(metadata: Partial<PageMetadata>) {
  const location = useLocation();

  useEffect(() => {
    const fullMetadata = generatePageMetadata({
      ...metadata,
      url: location.pathname
    });
    updatePageMetadata(fullMetadata);
    
    // Reset favicon to default
    updateFavicon();
  }, [metadata, location.pathname]);
}

/**
 * Hook for managing favicon updates
 */
export function useFavicon(imageUrl?: string) {
  useEffect(() => {
    updateFavicon(imageUrl);
  }, [imageUrl]);
} 