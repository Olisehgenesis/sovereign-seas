import type { Address } from 'viem';

export interface ParsedMetadata {
  tagline?: string;
  category?: string;
  tags?: string[];
  location?: string;
  establishedDate?: string;
  website?: string;
  projectType?: string;
  maturityLevel?: string;
  status?: string;
  openSource?: boolean;
  blockchain?: string;
  smartContracts?: string[];
  techStack?: string[];
  license?: string;
  developmentStage?: string;
  auditReports?: string[];
  kycCompliant?: boolean;
  regulatoryCompliance?: string[];
  logo?: string;
  demoVideo?: string;
  coverImage?: string;
  demoUrl?: string;
  githubRepo?: string;
  documentation?: string;
  karmaGapProfile?: string;
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
  youtube?: string;
  instagram?: string;
  teamMembers?: TeamMember[];
  contactEmail?: string;
  businessEmail?: string;
  phone?: string;
  keyFeatures?: string[];
  innovation?: string;
  useCases?: string[];
  targetAudience?: string;
  milestones?: Milestone[];
  launchDate?: string;
  userCount?: string;
  transactionVolume?: string;
  tvl?: string;
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

export interface EnhancedProject {
  id: bigint;
  owner: Address;
  name: string;
  description: string;
  transferrable: boolean;
  active: boolean;
  createdAt: bigint;
  campaignIds: bigint[];
  contracts?: Address[];
  metadata?: ParsedMetadata;
}

export interface CampaignStatus {
  bgClass: string;
  textClass: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export type TabId = 'overview' | 'campaigns' | 'milestones' | 'technical' | 'team' | 'analytics' | 'admin';

export interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface SharePlatform {
  id: 'twitter' | 'linkedin' | 'copy';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  description: string;
}

