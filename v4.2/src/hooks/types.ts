// types/index.ts

import { Address } from 'viem';

// ==================== SHARED TYPES ====================

export interface BaseMetadata {
  version: string;
  timestamp: number;
  creator: Address;
}

// ==================== PROJECT TYPES ====================

export interface ProjectMetadata {
  bio: string;
  contractInfo: string;
  additionalData: string;
  logo?: string;
}

export interface Project {
  id: bigint;
  owner: Address;
  name: string;
  description: string;
  tagline?: string;
  transferrable: boolean;
  active: boolean;
  createdAt: bigint;
  campaignIds: bigint[];
  metadata?: ProjectMetadata;
  verified?: boolean;
}

export interface ProjectDetails {
  project: Project;
  metadata: ProjectMetadata;
  contracts: Address[];
}

// Enhanced Project interface for components
export interface EnhancedProject {
  id: number;
  owner: Address;
  name: string;
  description: string;
  tagline?: string;
  transferrable: boolean;
  active: boolean;
  createdAt: bigint;
  campaignIds: bigint[];
  metadata?: {
    bio: string;
    contractInfo: string;
    additionalData: string;
    // Parsed metadata fields
    category?: string;
    tags?: string[];
    location?: string;
    establishedDate?: string;
    website?: string;
    projectType?: string;
    maturityLevel?: string;
    status?: string;
    openSource?: boolean;
    // Media & Links
    logo?: string;
    demoVideo?: string;
    demoUrl?: string;
    documentation?: string;
    karmaGapProfile?: string;
    githubRepo?: string;
    // Social Media
    social?: {
      twitter?: string;
      linkedin?: string;
      discord?: string;
      telegram?: string;
      youtube?: string;
      instagram?: string;
    };
    // Team & Contact
    teamMembers?: TeamMember[];
    contactEmail?: string;
    businessEmail?: string;
    phone?: string;
    // Technical Details
    blockchain?: string;
    techStack?: string[];
    smartContracts?: string[];
    license?: string;
    developmentStage?: string;
    keyFeatures?: string[];
    innovation?: string;
    useCases?: string[];
    targetAudience?: string;
    // Milestones & Metrics
    milestones?: Milestone[];
    launchDate?: string;
    userCount?: string;
    transactionVolume?: string;
    tvl?: string;
    // Security & Compliance
    auditReports?: string[];
    kycCompliant?: boolean;
    regulatoryCompliance?: string[];
    [key: string]: any;
  };
  contracts?: Address[];
}

export interface TeamMember {
  name: string;
  role: string;
  email: string;
  linkedin: string;
  twitter: string;
  avatar: string;
}

export interface Milestone {
  title: string;
  description: string;
  targetDate: string;
  status: 'planned' | 'in-progress' | 'completed';
}

// Project creation form interface
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
  karmaGapProfile: string;
  documentation: string;
  
  // Social Media Links
  twitter: string;
  linkedin: string;
  discord: string;
  telegram: string;
  youtube: string;
  instagram: string;
  
  // Team & Contact Information
  teamMembers: TeamMember[];
  contactEmail: string;
  businessEmail: string;
  phone: string;
  
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
  
  // Milestones & Roadmap
  milestones: Milestone[];
  
  // Project Status & Metrics
  status: string;
  launchDate: string;
  userCount: string;
  transactionVolume: string;
  tvl: string;
  
  // Compliance & Security
  auditReports: string[];
  kycCompliant: boolean;
  regulatoryCompliance: string[];
  
  // Additional Metadata
  projectType: string;
  maturityLevel: string;
  openSource: boolean;
  
  // Transferable ownership
  transferrable: boolean;
}

// ==================== CAMPAIGN TYPES ====================

export interface CampaignMetadata {
  mainInfo: string;
  additionalInfo: string;
  customDistributionData: string;
}

export interface Campaign {
  id: bigint;
  admin: Address;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  payoutToken: Address;
  feeToken: Address;
  active: boolean;
  totalFunds: bigint;
}

export interface CampaignDetails {
  campaign: Campaign;
  metadata: CampaignMetadata;
}

// Enhanced Campaign interface for components
export interface EnhancedCampaign {
  id: number;
  admin: Address;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: number;
  maxWinners: number;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  payoutToken: Address;
  feeToken: Address;
  active: boolean;
  totalFunds: bigint;
  metadata?: {
    mainInfo: string;
    additionalInfo: string;
    customDistributionData: string;
    // Parsed metadata fields
    type?: string;
    category?: string;
    maxParticipants?: number;
    eligibilityCriteria?: string[];
    requirements?: string[];
    judgesCriteria?: string[];
    rewards?: CampaignRewards;
    submissionGuidelines?: string;
    tags?: string[];
    logo?: string;
    prizePool?: string;
    media?: {
      website?: string;
      videoLink?: string;
    };
    social?: {
      twitter?: string;
      discord?: string;
      telegram?: string;
      contactEmail?: string;
    };
    [key: string]: any;
  };
  status: 'upcoming' | 'active' | 'ended' | 'paused';
  daysRemaining?: number;
  fundingProgress?: number;
}

export interface CampaignRewards {
  totalPrizePool?: string;
  distribution: string[];
  [key: string]: any;
}

// Campaign creation form interface
export interface CampaignFormData {
  // Basic Information (Required fields marked)
  name: string; // Required
  description: string; // Required
  campaignType: string; // Required
  category: string;
  tags: string[];
  
  // Media & Links
  logo: string;
  website: string;
  videoLink: string;
  
  // Timeline & Funding (Required fields marked)
  startDate: string; // Required
  endDate: string; // Required
  prizePool: string; // Required
  maxParticipants: string;
  adminFeePercentage: string;
  maxWinners: string;
  
  // Distribution Settings
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  customDistributionNotes?: string;
  
  // Rewards & Prizes
  rewards: CampaignRewards;
  
  // Eligibility & Requirements
  eligibilityCriteria: string[];
  requirements: string[];
  judgesCriteria: string[];
  
  // Contact & Social
  contactEmail: string; // Required
  twitter: string;
  discord: string;
  telegram: string;
  
  // Additional Info
  submissionGuidelines: string;
  
  // Technical Settings
  payoutToken: Address;
  feeToken: Address;
}

// Campaign type options
export interface CampaignTypeOption {
  value: string;
  label: string;
  icon: any; // React component
  desc: string;
}

// ==================== PARTICIPATION & VOTING TYPES ====================

export interface Participation {
  approved: boolean;
  voteCount: bigint;
  fundsReceived: bigint;
}

export interface Vote {
  voter: Address;
  campaignId: bigint;
  projectId: bigint;
  token: Address;
  amount: bigint;
  celoEquivalent: bigint;
}

export interface ProjectParticipation {
  [projectId: number]: {
    approved: boolean;
    voteCount: bigint;
    fundsReceived: bigint;
  };
}

// ==================== HOOK PARAMETER TYPES ====================

// Project creation parameters
export interface CreateProjectParams {
  name: string;
  description: string;
  bio: string;
  contractInfo: string;
  additionalData: string;
  contracts?: Address[];
  transferrable?: boolean;
}

// Project update parameters
export interface UpdateProjectParams {
  projectId: bigint;
  name: string;
  description: string;
  bio: string;
  contractInfo: string;
  additionalData: string;
  contracts: Address[];
}

// Campaign creation parameters
export interface CreateCampaignParams {
  name: string;
  description: string;
  mainInfo: string;
  additionalInfo: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  customDistributionData: string;
  payoutToken: Address;
  feeToken: Address;
}

// Campaign creation with fees parameters
export interface CreateCampaignWithFeesParams extends Omit<CreateCampaignParams, 'feeToken'> {
  feeToken: Address;
}

// Add project to campaign parameters
export interface AddProjectToCampaignParams {
  campaignId: bigint;
  projectId: bigint;
  feeToken: Address;
  feeAmount?: bigint;
  shouldPayFee?: boolean;
}

// Voting parameters
export interface VoteParams {
  campaignId: bigint;
  projectId: bigint;
  token: Address;
  amount: bigint;
  bypassCode?: string;
}

// ==================== FORM VALIDATION TYPES ====================

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

export interface CampaignFormErrors {
  name: string;
  description: string;
  campaignType: string;
  startDate: string;
  endDate: string;
  prizePool: string;
  contactEmail: string;
}

// ==================== SECTION COMPONENT TYPES ====================

export interface SectionProps {
  id: string;
  title: string;
  icon: any; // React component
  children: React.ReactNode;
  required?: boolean;
  expandedSection: string;
  toggleSection: (section: string) => void;
}

// ==================== API RESPONSE TYPES ====================

export interface ContractReadResult<T = any> {
  data?: T;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
}

export interface ContractWriteResult {
  writeContract: (args: any) => Promise<any>;
  isPending: boolean;
  isError: boolean;
  error?: Error;
  isSuccess: boolean;
  data?: any;
}

// ==================== UTILITY TYPES ====================

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'deprecated';
export type CampaignStatus = 'upcoming' | 'active' | 'ended' | 'paused';
export type DistributionMethod = 'linear' | 'quadratic' | 'custom';

// Union types for form field names
export type ProjectField = keyof ProjectFormData;
export type CampaignField = keyof CampaignFormData;