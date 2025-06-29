import { formatIpfsUrl } from './imageUtils';

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  tagline?: string;
  category?: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  blockchain?: string;
  techStack?: string[];
  tags?: string[];
  location?: string;
  teamMembers?: Array<{
    name: string;
    role: string;
  }>;
}

export interface CampaignMetadata {
  id: string;
  title: string;
  description: string;
  projectName?: string;
  projectLogo?: string;
  fundingGoal?: string;
  endDate?: string;
  category?: string;
}

/**
 * Generate metadata for a project page
 */
export function generateProjectMetadata(project: ProjectMetadata): PageMetadata {
  const projectImage = project.logo || project.coverImage;
  const formattedImage = projectImage ? formatIpfsUrl(projectImage) : '/og-image.png';
  
  const techStackText = project.techStack?.slice(0, 3).join(', ') || '';
  const tagsText = project.tags?.slice(0, 5).join(', ') || '';
  
  const description = project.tagline || 
    `${project.name} - ${project.description.slice(0, 150)}${project.description.length > 150 ? '...' : ''}`;
  
  const keywords = [
    project.name,
    project.category,
    project.blockchain,
    ...(project.techStack || []),
    ...(project.tags || []),
    'blockchain',
    'web3',
    'decentralized',
    'funding',
    'Sovereign Seas'
  ].filter(Boolean).join(', ');

  return {
    title: `${project.name} | Sovereign Seas`,
    description,
    keywords,
    image: formattedImage,
    url: `/explorer/project/${project.id}`,
    type: 'article',
    siteName: 'Sovereign Seas',
    twitterCard: 'summary_large_image'
  };
}

/**
 * Generate metadata for a campaign page
 */
export function generateCampaignMetadata(campaign: CampaignMetadata): PageMetadata {
  const campaignImage = campaign.projectLogo;
  const formattedImage = campaignImage ? formatIpfsUrl(campaignImage) : '/og-image.png';
  
  const description = `${campaign.title} - ${campaign.description.slice(0, 150)}${campaign.description.length > 150 ? '...' : ''}`;
  
  const keywords = [
    campaign.title,
    campaign.projectName,
    campaign.category,
    'campaign',
    'funding',
    'voting',
    'blockchain',
    'web3',
    'Sovereign Seas'
  ].filter(Boolean).join(', ');

  return {
    title: `${campaign.title} | Sovereign Seas`,
    description,
    keywords,
    image: formattedImage,
    url: `/explorer/campaign/${campaign.id}`,
    type: 'article',
    siteName: 'Sovereign Seas',
    twitterCard: 'summary_large_image'
  };
}

/**
 * Generate metadata for general pages
 */
export function generatePageMetadata(metadata: Partial<PageMetadata>): PageMetadata {
  return {
    title: metadata.title || 'Sovereign Seas | Decentralized Funding Platform',
    description: metadata.description || 'A transparent blockchain-based platform for funding innovative projects through community voting and quadratic distribution.',
    keywords: metadata.keywords || 'blockchain, funding, campaigns, decentralized, voting, projects, Celo',
    image: metadata.image || '/og-image.png',
    url: metadata.url || window.location.href,
    type: metadata.type || 'website',
    siteName: metadata.siteName || 'Sovereign Seas',
    twitterCard: metadata.twitterCard || 'summary_large_image'
  };
}

/**
 * Update the document head with metadata
 */
export function updatePageMetadata(metadata: PageMetadata): void {
  // Update title
  document.title = metadata.title;
  
  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', metadata.description);
  
  // Update meta keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metadata.keywords) {
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', metadata.keywords);
  }
  
  // Update Open Graph tags
  updateOpenGraphTags(metadata);
  
  // Update Twitter Card tags
  updateTwitterCardTags(metadata);
  
  // Update canonical URL
  updateCanonicalUrl(metadata.url);
}

/**
 * Update Open Graph meta tags
 */
function updateOpenGraphTags(metadata: PageMetadata): void {
  const ogTags = {
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:image': metadata.image,
    'og:url': metadata.url,
    'og:type': metadata.type,
    'og:site_name': metadata.siteName
  };
  
  Object.entries(ogTags).forEach(([property, content]) => {
    if (content) {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }
  });
}

/**
 * Update Twitter Card meta tags
 */
function updateTwitterCardTags(metadata: PageMetadata): void {
  const twitterTags = {
    'twitter:card': metadata.twitterCard,
    'twitter:title': metadata.title,
    'twitter:description': metadata.description,
    'twitter:image': metadata.image
  };
  
  Object.entries(twitterTags).forEach(([name, content]) => {
    if (content) {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }
  });
}

/**
 * Update canonical URL
 */
function updateCanonicalUrl(url?: string): void {
  if (!url) return;
  
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
}

/**
 * Update favicon dynamically
 */
export function updateFavicon(imageUrl?: string): void {
  if (!imageUrl) {
    // Reset to default favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute('href', '/favicon.ico');
    }
    return;
  }
  
  const formattedUrl = formatIpfsUrl(imageUrl);
  
  // Update existing favicon or create new one
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    document.head.appendChild(favicon);
  }
  favicon.setAttribute('href', formattedUrl);
  
  // Also update apple-touch-icon if it exists
  let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleTouchIcon) {
    appleTouchIcon = document.createElement('link');
    appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
    document.head.appendChild(appleTouchIcon);
  }
  appleTouchIcon.setAttribute('href', formattedUrl);
} 