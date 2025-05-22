// types/project.ts

export interface TeamMember {
    name: string;
    role: string;
    email: string;
    linkedin: string;
    twitter: string;
  }
  
  export interface ProjectLinks {
    website: string;
    demoUrl: string;
    githubRepo: string;
    documentation: string;
    twitter: string;
    linkedin: string;
    discord: string;
    telegram: string;
  }
  
  export interface ProjectMedia {
    logo: string;
    demoVideo: string;
  }
  
  export type ProjectCategory = 
    | 'DeFi' 
    | 'NFT' 
    | 'Gaming' 
    | 'Infrastructure' 
    | 'DAO' 
    | 'Social' 
    | 'Identity' 
    | 'Privacy' 
    | 'Analytics' 
    | 'Developer Tools' 
    | 'Wallet' 
    | 'Exchange' 
    | 'Lending' 
    | 'Insurance' 
    | 'Real Estate' 
    | 'Supply Chain' 
    | 'Healthcare' 
    | 'Education' 
    | 'Other';
  
  export type ProjectType = 
    | 'dapp' 
    | 'protocol' 
    | 'infrastructure' 
    | 'tooling' 
    | 'defi' 
    | 'nft' 
    | 'gaming' 
    | 'dao';
  
  export type ProjectStatus = 'active' | 'inactive' | 'completed' | 'paused';
  
  export type MaturityLevel = 'early' | 'mvp' | 'beta' | 'production' | 'mature';
  
  export type DevelopmentStage = 
    | 'Concept' 
    | 'Design' 
    | 'Development' 
    | 'Testing' 
    | 'Beta' 
    | 'Production' 
    | 'Maintenance';
  
  export type Blockchain = 
    | 'Celo' 
    | 'Ethereum' 
    | 'Polygon' 
    | 'Arbitrum' 
    | 'Optimism' 
    | 'Base' 
    | 'Avalanche' 
    | 'Solana' 
    | 'Near' 
    | 'Cosmos' 
    | 'Polkadot' 
    | 'Cardano' 
    | 'Multi-chain' 
    | 'Other';
  
  export type TechStack = 
    | 'React' 
    | 'Next.js' 
    | 'Vue.js' 
    | 'Angular' 
    | 'Svelte' 
    | 'Node.js' 
    | 'Python' 
    | 'Rust' 
    | 'Solidity' 
    | 'Go' 
    | 'TypeScript' 
    | 'JavaScript' 
    | 'Web3.js' 
    | 'Ethers.js' 
    | 'Wagmi' 
    | 'Hardhat' 
    | 'Foundry' 
    | 'Truffle' 
    | 'IPFS' 
    | 'PostgreSQL' 
    | 'MongoDB' 
    | 'Redis';
  
  export type License = 
    | 'MIT' 
    | 'Apache 2.0' 
    | 'GPL v3' 
    | 'GPL v2' 
    | 'BSD 3-Clause' 
    | 'BSD 2-Clause' 
    | 'MPL 2.0' 
    | 'LGPL v3' 
    | 'AGPL v3' 
    | 'ISC' 
    | 'Unlicense' 
    | 'Proprietary' 
    | 'Other';
  
  export interface Project {
    // Basic Information
    name: string;
    tagline: string;
    description: string;
    category: ProjectCategory;
    tags: string[];
    location: string;
    establishedDate: string;
    
    // Media & Links
    media: ProjectMedia;
    links: ProjectLinks;
    
    // Team & Contact Information
    teamMembers: TeamMember[];
    contactEmail: string;
    
    // Technical Details
    techStack: TechStack[];
    blockchain: Blockchain;
    smartContracts: string[];
    license: License;
    developmentStage: DevelopmentStage;
    
    // Features & Innovation
    keyFeatures: string[];
    innovation: string;
    useCases: string[];
    targetAudience: string;
    
    // Project Status
    status: ProjectStatus;
    projectType: ProjectType;
    maturityLevel: MaturityLevel;
    openSource: boolean;
    transferrable: boolean;
  }
  
  export interface ProjectFormData {
    // Basic Information
    name: string;
    tagline: string;
    description: string;
    category: string;
    tags: string[];
    location: string;
    establishedDate: string;
    website: string;
    
    // Media & Links
    logo: string;
    demoVideo: string;
    demoUrl: string;
    
    // Repository & Technical Links
    githubRepo: string;
    documentation: string;
    
    // Social Media Links
    twitter: string;
    linkedin: string;
    discord: string;
    telegram: string;
    
    // Team & Contact Information
    teamMembers: TeamMember[];
    contactEmail: string;
    
    // Technical Details
    techStack: string[];
    blockchain: string;
    smartContracts: string[];
    license: string;
    developmentStage: string;
    
    // Features & Innovation
    keyFeatures: string[];
    innovation: string;
    useCases: string[];
    targetAudience: string;
    
    // Project Status
    status: string;
    projectType: string;
    maturityLevel: string;
    openSource: boolean;
    transferrable: boolean;
  }
  
  export interface ProjectFormErrors {
    name: string;
    tagline: string;
    description: string;
    category: string;
    githubRepo: string;
    contactEmail: string;
    techStack: string[];
    keyFeatures: string[];
  }
  
  export interface ProjectMetadata {
    version: string;
    timestamp: number;
    creator: string;
    name: string;
    tagline: string;
    description: string;
    category: string;
    tags: string[];
    location: string;
    establishedDate: string;
    website: string;
    logo: string;
    demoVideo: string;
    demoUrl: string;
    githubRepo: string;
    documentation: string;
    twitter: string;
    linkedin: string;
    discord: string;
    telegram: string;
    teamMembers: TeamMember[];
    contactEmail: string;
    techStack: string[];
    blockchain: string;
    smartContracts: string[];
    license: string;
    developmentStage: string;
    keyFeatures: string[];
    innovation: string;
    useCases: string[];
    targetAudience: string;
    status: string;
    projectType: string;
    maturityLevel: string;
    openSource: boolean;
    transferrable: boolean;
  }
  
  export interface CreateProjectParams {
    name: string;
    description: string;
    bio: string;
    contractInfo: string;
    additionalData: string;
    contracts: string[];
    transferrable: boolean;
  }
  
  // Utility type for form stage validation
  export type FormStage = 1 | 2 | 3 | 4;
  
  // Constants for form options
  export const PROJECT_CATEGORIES: ProjectCategory[] = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 'Other'
  ];
  
  export const BLOCKCHAINS: Blockchain[] = [
    'Celo', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche',
    'Solana', 'Near', 'Cosmos', 'Polkadot', 'Cardano', 'Multi-chain', 'Other'
  ];
  
  export const TECH_STACK_OPTIONS: TechStack[] = [
    'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Node.js', 'Python', 'Rust',
    'Solidity', 'Go', 'TypeScript', 'JavaScript', 'Web3.js', 'Ethers.js', 'Wagmi',
    'Hardhat', 'Foundry', 'Truffle', 'IPFS', 'PostgreSQL', 'MongoDB', 'Redis'
  ];
  
  export const LICENSES: License[] = [
    'MIT', 'Apache 2.0', 'GPL v3', 'GPL v2', 'BSD 3-Clause', 'BSD 2-Clause',
    'MPL 2.0', 'LGPL v3', 'AGPL v3', 'ISC', 'Unlicense', 'Proprietary', 'Other'
  ];
  
  export const DEVELOPMENT_STAGES: DevelopmentStage[] = [
    'Concept', 'Design', 'Development', 'Testing', 'Beta', 'Production', 'Maintenance'
  ];
  
  export const PROJECT_TYPES: ProjectType[] = [
    'dapp', 'protocol', 'infrastructure', 'tooling', 'defi', 'nft', 'gaming', 'dao'
  ];
  
  // Helper functions for type guards
  export const isValidProjectCategory = (category: string): category is ProjectCategory => {
    return PROJECT_CATEGORIES.includes(category as ProjectCategory);
  };
  
  export const isValidBlockchain = (blockchain: string): blockchain is Blockchain => {
    return BLOCKCHAINS.includes(blockchain as Blockchain);
  };
  
  export const isValidTechStack = (tech: string): tech is TechStack => {
    return TECH_STACK_OPTIONS.includes(tech as TechStack);
  };
  
  export const isValidLicense = (license: string): license is License => {
    return LICENSES.includes(license as License);
  };
  
  export const isValidDevelopmentStage = (stage: string): stage is DevelopmentStage => {
    return DEVELOPMENT_STAGES.includes(stage as DevelopmentStage);
  };
  
  export const isValidProjectType = (type: string): type is ProjectType => {
    return PROJECT_TYPES.includes(type as ProjectType);
  };

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export type CampaignType = 
  | 'fundraising' 
  | 'community' 
  | 'marketing' 
  | 'development' 
  | 'research' 
  | 'partnership' 
  | 'event' 
  | 'other';

export type CampaignVisibility = 'public' | 'private' | 'restricted';

export interface CampaignMedia {
  banner: string;
  thumbnail: string;
  gallery: string[];
  video: string;
}

export interface CampaignLinks {
  website: string;
  socialMedia: {
    twitter: string;
    discord: string;
    telegram: string;
    linkedin: string;
  };
  documentation: string;
  resources: string[];
}

export interface CampaignMilestone {
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  deliverables: string[];
}

export interface Campaign {
  // Basic Information
  id: string;
  name: string;
  tagline: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  visibility: CampaignVisibility;
  startDate: string;
  endDate: string;
  
  // Media & Links
  media: CampaignMedia;
  links: CampaignLinks;
  
  // Campaign Details
  goals: string[];
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  milestones: CampaignMilestone[];
  
  // Project Association
  projectId: string;
  projectName: string;
  
  // Team & Contact
  teamMembers: TeamMember[];
  contactEmail: string;
  
  // Additional Information
  tags: string[];
  location: string;
  requirements: string[];
  benefits: string[];
  risks: string[];
  
  // Metrics & Analytics
  metrics: {
    views: number;
    contributors: number;
    engagement: number;
    conversionRate: number;
  };
}

export interface CampaignFormData {
  // Basic Information
  name: string;
  tagline: string;
  description: string;
  type: string;
  status: string;
  visibility: string;
  startDate: string;
  endDate: string;
  
  // Media & Links
  banner: string;
  thumbnail: string;
  gallery: string[];
  video: string;
  website: string;
  socialMedia: {
    twitter: string;
    discord: string;
    telegram: string;
    linkedin: string;
  };
  documentation: string;
  resources: string[];
  
  // Campaign Details
  goals: string[];
  targetAmount: number;
  currency: string;
  milestones: CampaignMilestone[];
  
  // Project Association
  projectId: string;
  
  // Team & Contact
  teamMembers: TeamMember[];
  contactEmail: string;
  
  // Additional Information
  tags: string[];
  location: string;
  requirements: string[];
  benefits: string[];
  risks: string[];
}

export interface CampaignFormErrors {
  name: string;
  tagline: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  targetAmount: string;
  goals: string[];
  milestones: string[];
}

// Constants for campaign options
export const CAMPAIGN_TYPES: CampaignType[] = [
  'fundraising',
  'community',
  'marketing',
  'development',
  'research',
  'partnership',
  'event',
  'other'
];

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
];

export const CAMPAIGN_VISIBILITY: CampaignVisibility[] = [
  'public',
  'private',
  'restricted'
];

// Helper functions for type guards
export const isValidCampaignType = (type: string): type is CampaignType => {
  return CAMPAIGN_TYPES.includes(type as CampaignType);
};

export const isValidCampaignStatus = (status: string): status is CampaignStatus => {
  return CAMPAIGN_STATUSES.includes(status as CampaignStatus);
};

export const isValidCampaignVisibility = (visibility: string): visibility is CampaignVisibility => {
  return CAMPAIGN_VISIBILITY.includes(visibility as CampaignVisibility);
};