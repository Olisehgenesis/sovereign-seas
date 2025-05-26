'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Image as ImageIcon,
  Code,
  Plus,
  X,
  Trash2,
  HelpCircle,
  Shield,
  Hash,
  Users,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Twitter,
  Target,
  Calendar,
  DollarSign,
  Trophy,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { uploadToIPFS } from '@/utils/imageUtils';
import { useCreateCampaignWithFees } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

interface Campaign {
  name: string;
  description: string;
  campaignType: string;
  category: string;
  tags: string[];
  logo: string;
  website: string;
  videoLink: string;
  startDate: string;
  endDate: string;
  prizePool: string;
  maxParticipants: string;
  maxWinners: string;
  adminFeePercentage: string;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  customDistributionNotes?: string;
  eligibilityCriteria: string[];
  requirements: string[];
  judgesCriteria: string[];
  rewards: {
    distribution: string[];
    [key: string]: any;
  };
  submissionGuidelines: string;
  twitter: string;
  discord: string;
  telegram: string;
  contactEmail: string;
  payoutToken: Address;
  feeToken: Address;
}

type CampaignField = keyof Campaign;

interface SectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  required?: boolean;
  expandedSection: string;
  toggleSection: (id: string) => void;
}

const Section = ({ id, title, icon: Icon, children, required = false, expandedSection, toggleSection }: SectionProps) => {
  const isExpanded = expandedSection === id;
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100 mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full p-6 flex items-center justify-between hover:bg-purple-50 transition-colors"
      >
        <div className="flex items-center">
          <Icon className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-xl font-semibold text-gray-800">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="pt-6">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default function CreateCampaign() {
  const [isMounted, setIsMounted] = useState(false);
  
  // Collapsible sections state
  const [expandedSection, setExpandedSection] = useState('basic');
  const celoToken = import.meta.env.VITE_CELO_TOKEN;
  const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;
  
  // Wallet and contract hooks
  const { address, isConnected } = useAccount();
  const { authenticated, ready } = usePrivy();
  const {
    createCampaignWithFees,
    isPending,
    isError,
    error: contractError,
    isSuccess,
    campaignCreationFee,
    canBypass
  } = useCreateCampaignWithFees(contractAddress, address || '0x0');

  console.log(isError)
  
  // File handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Main campaign state
  const [campaign, setCampaign] = useState<Campaign>({
    // Basic Information (Required fields marked)
    name: '', // Required
    description: '', // Required
    campaignType: 'grants_round', // Required
    category: '',
    tags: [''],
    
    // Media & Links
    logo: '',
    website: '',
    videoLink: '',
    
    // Timeline & Funding (Required fields marked)
    startDate: '', // Required
    endDate: '', // Required
    prizePool: '', // Required (was fundingGoal)
    maxParticipants: '',
    adminFeePercentage: '5',
    maxWinners: '',
    
    // Distribution Settings
    useQuadraticDistribution: true, // Default to true
    useCustomDistribution: false,
    customDistributionNotes: '',
    
    // Rewards & Prizes
    rewards: {
      totalPrizePool: '',
      distribution: ['']
    },
    
    // Eligibility & Requirements
    eligibilityCriteria: [''],
    requirements: [''],
    judgesCriteria: [''],
    
    // Contact & Social
    contactEmail: '', // Required
    twitter: '',
    discord: '',
    telegram: '',
    
    // Additional Info
    submissionGuidelines: '',
    
    // Technical Settings - CELO only for now
    payoutToken: celoToken, // CELO
    feeToken: celoToken // CELO
  });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    campaignType: '',
    startDate: '',
    endDate: '',
    prizePool: '',
    contactEmail: ''
  });
  
  // Ref for name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle name change


  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cleanup function for memory management
  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  // Handle contract success state
  useEffect(() => {
    if (isSuccess) {
      setLoading(false);
      setSuccessMessage('Campaign created successfully! Redirecting...');
      
      setTimeout(() => {
        window.location.href = '/explorer';
      }, 5000);
    }
  }, [isSuccess]);

  // Handle contract error state
  useEffect(() => {
    if (contractError) {
      setLoading(false);
      setErrorMessage(`Transaction failed: ${contractError.message || 'Unknown error'}`);
    }
  }, [contractError]);

  // Update loading state based on contract pending state
  useEffect(() => {
    if (isPending && !isUploading) {
      setLoading(true);
    }
  }, [isPending, isUploading]);

  // Campaign types and options
  const campaignTypes = [
    { value: 'grants_round', label: 'Grants Round', icon: DollarSign, desc: 'Fund innovative projects with grants' },
    { value: 'hackathon', label: 'Hackathon', icon: Code, desc: 'Time-limited building competition' },
    { value: 'accelerator', label: 'Accelerator', icon: TrendingUp, desc: 'Long-term program with mentorship' },
    { value: 'bounty', label: 'Bounty Program', icon: Target, desc: 'Reward specific tasks or solutions' },
    { value: 'community_funding', label: 'Community Funding', icon: Users, desc: 'Community-driven funding initiative' },
    { value: 'innovation_challenge', label: 'Innovation Challenge', icon: Sparkles, desc: 'Challenge-based innovation contest' }
  ];
  
  const categories = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'Healthcare', 'Education', 
    'Climate', 'Social Impact', 'Research', 'Other'
  ];

  // Available tokens - CELO only for now


  // Handle logo file selection and preview
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Logo file size must be less than 10MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file');
        return;
      }
      
      setLogoFile(file);
      setCampaign({...campaign, logo: `File selected: ${file.name}`});
      
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };
  
  // Validation functions
  const validateForm = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    // Required fields validation
    if (!campaign.name.trim()) {
      errors.name = 'Campaign name is required';
      isValid = false;
    } else {
      errors.name = '';
    }
    
    if (!campaign.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    } else if (campaign.description.trim().length < 100) {
      errors.description = 'Description must be at least 100 characters long';
      isValid = false;
    } else {
      errors.description = '';
    }
    
    if (!campaign.campaignType) {
      errors.campaignType = 'Campaign type is required';
      isValid = false;
    } else {
      errors.campaignType = '';
    }
    
    if (!campaign.startDate) {
      errors.startDate = 'Start date is required';
      isValid = false;
    } else {
      errors.startDate = '';
    }
    
    if (!campaign.endDate) {
      errors.endDate = 'End date is required';
      isValid = false;
    } else if (new Date(campaign.endDate) <= new Date(campaign.startDate)) {
      errors.endDate = 'End date must be after start date';
      isValid = false;
    } else {
      errors.endDate = '';
    }
    
    if (!campaign.prizePool) {
      errors.prizePool = 'Prize pool is required';
      isValid = false;
    } else if (parseFloat(campaign.prizePool) <= 0) {
      errors.prizePool = 'Prize pool must be greater than 0';
      isValid = false;
    } else {
      errors.prizePool = '';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!campaign.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required';
      isValid = false;
    } else if (!emailRegex.test(campaign.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
      isValid = false;
    } else {
      errors.contactEmail = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Helper functions for dynamic arrays
  const addArrayItem = (field: CampaignField, defaultValue = '') => {
    const currentValue = campaign[field];
    if (Array.isArray(currentValue)) {
      setCampaign({
        ...campaign,
        [field]: [...currentValue, defaultValue]
      });
    }
  };
  
  const removeArrayItem = (field: CampaignField, index: number) => {
    const currentValue = campaign[field];
    if (!Array.isArray(currentValue) || currentValue.length <= 1) return;
    
    const updated = [...currentValue];
    updated.splice(index, 1);
    setCampaign({
      ...campaign,
      [field]: updated
    });
  };
  
  const updateArrayItem = (field: CampaignField, index: number, value: string) => {
    const currentValue = campaign[field];
    if (Array.isArray(currentValue) && currentValue.every(item => typeof item === 'string')) {
      const updated = [...currentValue];
      updated[index] = value;
      setCampaign({
        ...campaign,
        [field]: updated
      });
    }
  };

  const handleFieldChange = (field: CampaignField, value: Campaign[CampaignField]) => {
    setCampaign(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrorMessage('');
    
    if (!ready) {
      setErrorMessage('Wallet connection is initializing...');
      return;
    }

    if (!authenticated || !isConnected || !address) {
      console.log('not authenticated', authenticated, isConnected, address);
      setErrorMessage('Please connect your wallet to create a campaign');
      return;
    }

    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before submitting');
      return;
    }
    
    try {
      setLoading(true);
      setIsUploading(true);
      
      // Upload logo to IPFS if file is selected
      let logoIpfsUrl = '';
      if (logoFile) {
        try {
          console.log('Uploading logo to IPFS...');
          logoIpfsUrl = await uploadToIPFS(logoFile);
          console.log('Logo uploaded to IPFS:', logoIpfsUrl);
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError);
          throw new Error(`Failed to upload logo: ${uploadError as string || 'Unknown error'}`);
        }
      }
      
      // Prepare campaign data with cleaned arrays
      const cleanedCampaign: Campaign = {
        ...campaign,
        logo: logoIpfsUrl || campaign.logo,
        tags: campaign.tags.filter(tag => tag.trim() !== ''),
        eligibilityCriteria: campaign.eligibilityCriteria.filter(c => c.trim() !== ''),
        requirements: campaign.requirements.filter(r => r.trim() !== ''),
        judgesCriteria: campaign.judgesCriteria.filter(c => c.trim() !== ''),
        rewards: {
          ...campaign.rewards,
          distribution: campaign.rewards.distribution.filter(d => d.trim() !== '')
        }
      } as const;

      // Create main info metadata (for contract)
      const mainInfoData = {
        type: cleanedCampaign.campaignType,
        category: cleanedCampaign.category,
        maxParticipants: cleanedCampaign.maxParticipants ? parseInt(cleanedCampaign.maxParticipants) : 0,
        eligibilityCriteria: cleanedCampaign.eligibilityCriteria,
        requirements: cleanedCampaign.requirements,
        judgesCriteria: cleanedCampaign.judgesCriteria,
        rewards: cleanedCampaign.rewards,
        submissionGuidelines: cleanedCampaign.submissionGuidelines
      };

      // Create additional info metadata (for contract)
      const additionalInfoData = {
        version: '1.0.0',
        timestamp: Date.now(),
        creator: address,
        tags: cleanedCampaign.tags,
        logo: cleanedCampaign.logo,
        prizePool: cleanedCampaign.prizePool,
        media: {
          website: cleanedCampaign.website,
          videoLink: cleanedCampaign.videoLink
        },
        social: {
          twitter: cleanedCampaign.twitter,
          discord: cleanedCampaign.discord,
          telegram: cleanedCampaign.telegram,
          contactEmail: cleanedCampaign.contactEmail
        }
      };

      // Convert dates to Unix timestamps (BigInt)
      const startTimeUnix = BigInt(Math.floor(new Date(cleanedCampaign.startDate).getTime() / 1000));
      const endTimeUnix = BigInt(Math.floor(new Date(cleanedCampaign.endDate).getTime() / 1000));

      // Validate timestamps
      const nowUnix = BigInt(Math.floor(Date.now() / 1000));
      if (startTimeUnix <= nowUnix) {
        throw new Error('Start date must be in the future');
      }
      if (endTimeUnix <= startTimeUnix) {
        throw new Error('End date must be after start date');
      }

      // Create custom distribution data
      const customDistributionData = cleanedCampaign.useCustomDistribution 
        ? JSON.stringify({
            distributionType: 'custom',
            notes: cleanedCampaign.customDistributionNotes || 'Manual distribution will be implemented by campaign admin'
          })
        : '';

      setIsUploading(false);
      
      console.log('Creating campaign with contract...');
      console.log('Campaign creation fee:', campaignCreationFee?.toString());
      console.log('Can bypass fees:', canBypass);

      // Call the contract method
      await createCampaignWithFees({
        name: cleanedCampaign.name,
        description: cleanedCampaign.description,
        mainInfo: JSON.stringify(mainInfoData),
        additionalInfo: JSON.stringify(additionalInfoData),
        startTime: startTimeUnix,
        endTime: endTimeUnix,
        adminFeePercentage: BigInt(parseInt(cleanedCampaign.adminFeePercentage)),
        maxWinners: BigInt(cleanedCampaign.maxWinners ? parseInt(cleanedCampaign.maxWinners) : 0),
        useQuadraticDistribution: cleanedCampaign.useQuadraticDistribution,
        useCustomDistribution: cleanedCampaign.useCustomDistribution,
        customDistributionData,
        payoutToken: cleanedCampaign.payoutToken as Address,
        feeToken: cleanedCampaign.feeToken as Address
      });
      
    } catch (error) {
      console.error('Campaign creation error:', error);
      
      let userFriendlyMessage = 'Failed to create campaign. ';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('user rejected')) {
        userFriendlyMessage += 'Transaction was rejected by user.';
      } else if (errorMessage.includes('insufficient funds')) {
        userFriendlyMessage += 'Insufficient funds for transaction fees.';
      } else if (errorMessage.includes('gas')) {
        userFriendlyMessage += 'Gas estimation failed. Please check your parameters.';
      } else if (errorMessage.includes('network')) {
        userFriendlyMessage += 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('revert')) {
        userFriendlyMessage += 'Contract execution reverted. Please check your parameters.';
      } else {
        userFriendlyMessage += errorMessage;
      }
      
      setErrorMessage(userFriendlyMessage);
      setLoading(false);
      setIsUploading(false);
    }
  };

  // Calculate duration in days
  const getDurationInDays = () => {
    if (campaign.startDate && campaign.endDate) {
      const start = new Date(campaign.startDate);
      const end = new Date(campaign.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  // Section toggle handler
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => console.log('Navigate back')}
              className="inline-flex items-center text-gray-600 hover:text-purple-600 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </button>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                Launch Your Campaign
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Create funding rounds, hackathons, and innovation challenges. 
                Drive community participation and reward exceptional projects.
              </p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-start">
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700">{successMessage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 bg-red-50 rounded-xl p-4 border border-red-200 flex items-start">
              <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit}>
            <Section 
              id="basic" 
              title="Basic Information" 
              icon={Hash} 
              required 
              expandedSection={expandedSection}
              toggleSection={toggleSection}
            >
              {/* Basic Information content */}
              <div className="space-y-6">
                {/* Campaign Name & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-purple-700 font-medium mb-3">
                      Campaign Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={campaign.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                      placeholder="Enter your campaign name"
                    />
                    {formErrors.name && <p className="mt-2 text-red-500 text-sm">{formErrors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-purple-700 font-medium mb-3">
                      Category
                    </label>
                    <select
                      value={campaign.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Campaign Type Selection */}
                <div>
                  <label className="block text-purple-700 font-medium mb-3">
                    Campaign Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaignTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.value}
                          onClick={() => handleFieldChange('campaignType', type.value)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            campaign.campaignType === type.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <IconComponent className={`h-5 w-5 mr-2 ${
                              campaign.campaignType === type.value ? 'text-purple-600' : 'text-gray-500'
                            }`} />
                            <span className={`font-medium ${
                              campaign.campaignType === type.value ? 'text-purple-700' : 'text-gray-700'
                            }`}>
                              {type.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{type.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                  {formErrors.campaignType && <p className="mt-2 text-red-500 text-sm">{formErrors.campaignType}</p>}
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-purple-700 font-medium mb-3">
                    Campaign Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={campaign.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                    placeholder="Provide a comprehensive description of your campaign, its goals, and what participants can expect..."
                  />
                  {formErrors.description && <p className="mt-2 text-red-500 text-sm">{formErrors.description}</p>}
                  <p className="mt-2 text-gray-500 text-sm">Minimum 100 characters • {campaign.description.length} characters</p>
                </div>
                
                {/* Tags */}
                <div>
                  <label className="block text-purple-700 font-medium mb-3">
                    Tags
                  </label>
                  {campaign.tags.map((tag, index) => (
                    <div key={index} className="flex mb-3">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                        placeholder="Enter tag (e.g., Innovation, DeFi, Social Impact)"
                      />
                      {campaign.tags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tags', index)}
                          className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('tags')}
                    className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors border border-purple-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tag
                  </button>
                </div>
              </div>
            </Section>

            <Section 
              id="media" 
              title="Media & Links" 
              icon={ImageIcon}
              expandedSection={expandedSection}
              toggleSection={toggleSection}
            >
              <div className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-purple-700 font-medium mb-3">
                    Campaign Logo
                  </label>
                  
                  {logoPreview && (
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-32 h-32 object-cover rounded-xl border-2 border-purple-200 shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                            handleFieldChange('logo', '');
                            if (logoFileInputRef.current) {
                              logoFileInputRef.current.value = '';
                            }
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-2 border-dashed border-purple-200 rounded-xl p-6 text-center hover:border-purple-300 transition-colors">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                        <Upload className="h-8 w-8 text-purple-500" />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center mx-auto"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {logoFile ? 'Change Logo' : 'Choose Logo File'}
                        </button>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG, SVG up to 10MB</p>
                        <p className="text-xs text-gray-400 mt-1">Recommended: 400x400px square format</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Website & Video */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-purple-700 font-medium mb-3">
                      Campaign Website
                    </label>
                    <input
                      type="url"
                      value={campaign.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                      placeholder="https://yourcampaign.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-purple-700 font-medium mb-3">
                      Video Link
                    </label>
                    <input
                      type="url"
                      value={campaign.videoLink}
                      onChange={(e) => handleFieldChange('videoLink', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section 
              id="funding" 
              title="Timeline & Funding" 
              icon={Calendar} 
              required
              expandedSection={expandedSection}
              toggleSection={toggleSection}
            >
              <div className="space-y-8">
                {/* Timeline */}
                <div>
                  <h4 className="text-lg font-semibold text-purple-700 mb-4">Campaign Timeline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-purple-700 font-medium mb-3">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={campaign.startDate}
                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                      />
                      {formErrors.startDate && <p className="mt-2 text-red-500 text-sm">{formErrors.startDate}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-purple-700 font-medium mb-3">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={campaign.endDate}
                        onChange={(e) => handleFieldChange('endDate', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                      />
                      {formErrors.endDate && <p className="mt-2 text-red-500 text-sm">{formErrors.endDate}</p>}
                    </div>
                  </div>
                  
                  {campaign.startDate && campaign.endDate && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <p className="text-purple-700 font-medium">
                        Duration: {getDurationInDays()} days
                      </p>
                    </div>
                  )}
                </div>

                {/* Prize Pool & Token Settings */}
                <div>
                  <h4 className="text-lg font-semibold text-purple-700 mb-4">Prize Pool & Tokens</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-purple-700 font-medium mb-3">
                        Prize Pool (CELO) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={campaign.prizePool}
                        onChange={(e) => handleFieldChange('prizePool', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                        placeholder="50000"
                      />
                      {formErrors.prizePool && <p className="mt-2 text-red-500 text-sm">{formErrors.prizePool}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-purple-700 font-medium mb-3">Admin Fee (%)</label>
                      <select
                       value={campaign.adminFeePercentage}
                       onChange={(e) => handleFieldChange('adminFeePercentage', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                     >
                       <option value="0">0% - No admin fee</option>
                       <option value="3">3% - Low fee</option>
                       <option value="5">5% - Standard fee</option>
                       <option value="8">8% - Higher fee</option>
                       <option value="10">10% - Premium fee</option>
                     </select>
                   </div>
                 </div>

                 {/* Payout & Fee Token Selection - CELO Only */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">
                       Payout Token <span className="text-red-500">*</span>
                     </label>
                     <div className="px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-700">
                       CELO (More tokens coming soon)
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">
                       Fee Token <span className="text-red-500">*</span>
                     </label>
                     <div className="px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-700">
                       CELO (More tokens coming soon)
                     </div>
                   </div>
                 </div>

                 {/* Prize Distribution */}
                 <div>
                   <label className="block text-purple-700 font-medium mb-3">Prize Distribution (CELO)</label>
                   {campaign.rewards.distribution.map((prize, index) => (
                     <div key={index} className="flex mb-3">
                       <input
                         type="text"
                         value={prize}
                         onChange={(e) => {
                           const updated = [...campaign.rewards.distribution];
                           updated[index] = e.target.value;
                           handleFieldChange('rewards', {
                             ...campaign.rewards,
                             distribution: updated
                           });
                         }}
                         className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                         placeholder={`1st Place: 20,000 CELO`}
                       />
                       {campaign.rewards.distribution.length > 1 && (
                         <button
                           type="button"
                           onClick={() => {
                             const updated = [...campaign.rewards.distribution];
                             updated.splice(index, 1);
                             handleFieldChange('rewards', {
                               ...campaign.rewards,
                               distribution: updated
                             });
                           }}
                           className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       )}
                     </div>
                   ))}
                   <button
                     type="button"
                     onClick={() => handleFieldChange('rewards', {
                       ...campaign.rewards,
                       distribution: [...campaign.rewards.distribution, '']
                     })}
                     className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors border border-purple-200"
                   >
                     <Plus className="h-4 w-4 mr-2" />
                     Add Prize
                   </button>
                 </div>
               </div>

               {/* Participants & Winners */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4">Participation Settings</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">Max Participants</label>
                     <input
                       type="number"
                       min="0"
                       value={campaign.maxParticipants}
                       onChange={(e) => handleFieldChange('maxParticipants', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Leave empty for unlimited"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">Max Winners</label>
                     <input
                       type="number"
                       min="0"
                       value={campaign.maxWinners}
                       onChange={(e) => handleFieldChange('maxWinners', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Leave empty for unlimited"
                     />
                   </div>
                 </div>
               </div>

               {/* Distribution Method */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                   Funding Options
                   <a 
                     href="https://seas.xyz/docs/funding" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="ml-2 text-purple-500 hover:text-purple-700 transition-colors"
                   >
                     <HelpCircle className="h-4 w-4" />
                   </a>
                 </h4>
                 
                 <div className="space-y-4">
                   <div className="flex items-start space-x-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50">
                     <label className="flex items-center mt-1">
                       <input
                         type="radio"
                         name="distributionMethod"
                         checked={campaign.useQuadraticDistribution && !campaign.useCustomDistribution}
                         onChange={() => handleFieldChange('useQuadraticDistribution', true)}
                         className="mr-3 text-purple-500"
                       />
                       <span className="font-medium text-purple-800">Quadratic Distribution (Recommended)</span>
                     </label>
                     <div>
                       <p className="text-purple-700 text-sm">Square root weighting for more balanced and democratic distribution</p>
                     </div>
                   </div>
                   
                   <div className="flex items-start space-x-4 p-4 rounded-xl border border-gray-200">
                     <label className="flex items-center mt-1">
                       <input
                         type="radio"
                         name="distributionMethod"
                         checked={!campaign.useQuadraticDistribution && !campaign.useCustomDistribution}
                         onChange={() => handleFieldChange('useQuadraticDistribution', false)}
                         className="mr-3 text-purple-500"
                       />
                       <span className="font-medium">Linear Distribution</span>
                     </label>
                     <div>
                       <p className="text-gray-600 text-sm">Direct proportion to votes received</p>
                     </div>
                   </div>
                   
                   <div className="flex items-start space-x-4 p-4 rounded-xl border border-gray-200">
                     <label className="flex items-center mt-1">
                       <input
                         type="radio"
                         name="distributionMethod"
                         checked={campaign.useCustomDistribution}
                         onChange={() => handleFieldChange('useCustomDistribution', true)}
                         className="mr-3 text-purple-500"
                       />
                       <span className="font-medium">Custom Distribution</span>
                     </label>
                     <div>
                       <p className="text-gray-600 text-sm">Manual distribution by campaign admin</p>
                     </div>
                   </div>
                   
                   {campaign.useCustomDistribution && (
                     <div className="mt-4">
                       <label className="block text-purple-700 font-medium mb-3">Custom Distribution Notes</label>
                       <textarea
                         value={campaign.customDistributionNotes}
                         onChange={(e) => handleFieldChange('customDistributionNotes', e.target.value)}
                         rows={3}
                         className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                         placeholder="Describe your custom distribution logic..."
                       />
                     </div>
                   )}
                 </div>
               </div>
             </div>
           </Section>

           <Section 
             id="rules" 
             title="Rules & Criteria" 
             icon={Shield} 
             required
             expandedSection={expandedSection}
             toggleSection={toggleSection}
           >
             <div className="space-y-8">
               {/* Contact Information */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4">Contact Information</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">
                       Contact Email <span className="text-red-500">*</span>
                     </label>
                     <input
                       type="email"
                       value={campaign.contactEmail}
                       onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="contact@yourcampaign.com"
                     />
                     {formErrors.contactEmail && <p className="mt-2 text-red-500 text-sm">{formErrors.contactEmail}</p>}
                   </div>
                   
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">Website</label>
                     <input
                       type="url"
                       value={campaign.website}
                       onChange={(e) => handleFieldChange('website', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="https://yourcampaign.com"
                     />
                   </div>
                 </div>
               </div>

               {/* Social Media */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4">Social Media & Community</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                     <label className="block text-purple-700 font-medium mb-3 flex items-center">
                       <Twitter className="h-4 w-4 mr-2" />
                       Twitter
                     </label>
                     <input
                       type="url"
                       value={campaign.twitter}
                       onChange={(e) => handleFieldChange('twitter', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="https://twitter.com/yourcampaign"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-purple-700 font-medium mb-3 flex items-center">
                       <Globe className="h-4 w-4 mr-2" />
                       Discord
                     </label>
                     <input
                       type="url"
                       value={campaign.discord}
                       onChange={(e) => handleFieldChange('discord', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="https://discord.gg/yourcampaign"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-purple-700 font-medium mb-3 flex items-center">
                       <Globe className="h-4 w-4 mr-2" />
                       Telegram
                     </label>
                     <input
                       type="url"
                       value={campaign.telegram}
                       onChange={(e) => handleFieldChange('telegram', e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="https://t.me/yourcampaign"
                     />
                   </div>
                 </div>
               </div>

               {/* Eligibility Criteria */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4">Eligibility Criteria</h4>
                 {campaign.eligibilityCriteria.map((criteria, index) => (
                   <div key={index} className="flex mb-3">
                     <input
                       type="text"
                       value={criteria}
                       onChange={(e) => updateArrayItem('eligibilityCriteria', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Must be building on blockchain technology"
                     />
                     {campaign.eligibilityCriteria.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('eligibilityCriteria', index)}
                         className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('eligibilityCriteria')}
                   className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors border border-purple-200"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Criterion
                 </button>
               </div>

               {/* Requirements */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4">Requirements</h4>
                 {campaign.requirements.map((requirement, index) => (
                   <div key={index} className="flex mb-3">
                     <input
                       type="text"
                       value={requirement}
                       onChange={(e) => updateArrayItem('requirements', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Working prototype or MVP"
                     />
                     {campaign.requirements.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('requirements', index)}
                         className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('requirements')}
                   className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors border border-purple-200"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Requirement
                 </button>
               </div>

               {/* Judging Criteria */}
               <div>
                 <h4 className="text-lg font-semibold text-purple-700 mb-4">Judging Criteria</h4>
                 {campaign.judgesCriteria.map((criteria, index) => (
                   <div key={index} className="flex mb-3">
                     <input
                       type="text"
                       value={criteria}
                       onChange={(e) => updateArrayItem('judgesCriteria', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Technical innovation (30%)"
                     />
                     {campaign.judgesCriteria.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('judgesCriteria', index)}
                         className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('judgesCriteria')}
                   className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors border border-purple-200"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Criterion
                 </button>
               </div>

               {/* Submission Guidelines */}
               <div>
                 <label className="block text-purple-700 font-medium mb-3">Submission Guidelines</label>
                 <textarea
                   value={campaign.submissionGuidelines}
                   onChange={(e) => handleFieldChange('submissionGuidelines', e.target.value)}
                   rows={4}
                   className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                   placeholder="Detailed guidelines for project submissions, including required documents, formats, and deadlines..."
                 />
               </div>
             </div>
           </Section>

           <Section 
             id="review" 
             title="Review & Submit" 
             icon={CheckCircle}
             expandedSection={expandedSection}
             toggleSection={toggleSection}
           >
             <div className="space-y-8">
               <div className="text-center mb-8">
                 <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mb-4">
                   <CheckCircle className="h-8 w-8 text-white" />
                 </div>
                 <h3 className="text-2xl font-bold text-gray-800 mb-2">Campaign Summary</h3>
                 <p className="text-gray-600">Review your campaign details before launch</p>
               </div>

               {/* Basic Information Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <Info className="h-5 w-5 mr-2 text-purple-500" />
                   Campaign Overview
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Campaign Name:</span>
                     <p className="text-gray-800">{campaign.name || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Type:</span>
                     <p className="text-gray-800">{campaignTypes.find(t => t.value === campaign.campaignType)?.label || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Category:</span>
                     <p className="text-gray-800">{campaign.category || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Duration:</span>
                     <p className="text-gray-800">{getDurationInDays()} days</p>
                   </div>
                 </div>
                 <div className="mt-4">
                   <span className="font-medium text-gray-600">Description:</span>
                   <p className="text-gray-800 mt-1">{campaign.description || 'Not specified'}</p>
                 </div>
                 <div className="mt-4">
                   <span className="font-medium text-gray-600">Tags:</span>
                   <p className="text-gray-800">
                     {campaign.tags.filter(t => t.trim() !== '').join(', ') || 'Not specified'}
                   </p>
                 </div>
               </div>

               {/* Timeline & Funding Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                   Timeline & Funding
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Start Date:</span>
                     <p className="text-gray-800">{campaign.startDate ? new Date(campaign.startDate).toLocaleString() : 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">End Date:</span>
                     <p className="text-gray-800">{campaign.endDate ? new Date(campaign.endDate).toLocaleString() : 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Prize Pool:</span>
                     <p className="text-gray-800">{campaign.prizePool ? `${campaign.prizePool} CELO` : 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Admin Fee:</span>
                     <p className="text-gray-800">{campaign.adminFeePercentage}%</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Max Participants:</span>
                     <p className="text-gray-800">{campaign.maxParticipants || 'Unlimited'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Max Winners:</span>
                     <p className="text-gray-800">{campaign.maxWinners || 'Unlimited'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Distribution Method:</span>
                     <p className="text-gray-800">
                       {campaign.useQuadraticDistribution ? 'Quadratic' : campaign.useCustomDistribution ? 'Custom' : 'Linear'}
                     </p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Tokens:</span>
                     <p className="text-gray-800">CELO (Payout & Fees)</p>
                   </div>
                 </div>
                 
                 {campaign.rewards.distribution.filter(d => d.trim() !== '').length > 0 && (
                   <div className="mt-4">
                     <span className="font-medium text-gray-600">Prize Distribution:</span>
                     <div className="mt-2 space-y-1">
                       {campaign.rewards.distribution.filter(d => d.trim() !== '').map((prize, idx) => (
                         <p key={idx} className="text-gray-800 text-sm">• {prize}</p>
                       ))}
                     </div>
                   </div>
                 )}
               </div>

               {/* Rules & Criteria Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <Shield className="h-5 w-5 mr-2 text-purple-500" />
                   Rules & Criteria
                 </h4>
                 
                 <div className="space-y-4 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Contact Email:</span>
                     <p className="text-gray-800">{campaign.contactEmail || 'Not specified'}</p>
                   </div>
                   
                   {campaign.eligibilityCriteria.filter(c => c.trim() !== '').length > 0 && (
                     <div>
                       <span className="font-medium text-gray-600">Eligibility Criteria:</span>
                       <div className="mt-2 space-y-1">
                         {campaign.eligibilityCriteria.filter(c => c.trim() !== '').map((criteria, idx) => (
                           <p key={idx} className="text-gray-800">• {criteria}</p>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {campaign.requirements.filter(r => r.trim() !== '').length > 0 && (
                     <div>
                       <span className="font-medium text-gray-600">Requirements:</span>
                       <div className="mt-2 space-y-1">
                         {campaign.requirements.filter(r => r.trim() !== '').map((requirement, idx) => (
                           <p key={idx} className="text-gray-800">• {requirement}</p>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {campaign.judgesCriteria.filter(c => c.trim() !== '').length > 0 && (
                     <div>
                       <span className="font-medium text-gray-600">Judging Criteria:</span>
                       <div className="mt-2 space-y-1">
                         {campaign.judgesCriteria.filter(c => c.trim() !== '').map((criteria, idx) => (
                           <p key={idx} className="text-gray-800">• {criteria}</p>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {campaign.submissionGuidelines && (
                     <div>
                       <span className="font-medium text-gray-600">Submission Guidelines:</span>
                       <p className="text-gray-800 mt-1">{campaign.submissionGuidelines}</p>
                     </div>
                   )}
                 </div>
               </div>

               {/* Links & Social Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <LinkIcon className="h-5 w-5 mr-2 text-purple-500" />
                   Links & Media
                 </h4>
                 <div className="space-y-2 text-sm">
                   {campaign.website && (
                     <div>
                       <span className="font-medium text-gray-600">Website:</span>
                       <a href={campaign.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.website}
                       </a>
                     </div>
                   )}
                   {campaign.twitter && (
                     <div>
                       <span className="font-medium text-gray-600">Twitter:</span>
                       <a href={campaign.twitter} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.twitter}
                       </a>
                     </div>
                   )}
                   {campaign.discord && (
                     <div>
                       <span className="font-medium text-gray-600">Discord:</span>
                       <a href={campaign.discord} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.discord}
                       </a>
                     </div>
                   )}
                   {campaign.telegram && (
                     <div>
                       <span className="font-medium text-gray-600">Telegram:</span>
                       <a href={campaign.telegram} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.telegram}
                       </a>
                     </div>
                   )}
                   <div>
                     <span className="font-medium text-gray-600">Logo:</span>
                     <span className="text-gray-800 ml-2">
                       {campaign.logo ? (campaign.logo.startsWith('File selected:') ? 'File uploaded ✓' : 'URL provided ✓') : 'Not provided'}
                     </span>
                   </div>
                 </div>
               </div>

               {/* Campaign Creation Info */}
               <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                 <div className="flex items-start">
                   <Info className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                   <div>
                     <p className="text-purple-700 font-medium mb-2">Campaign Launch</p>
                     <p className="text-purple-600 text-sm">
                       Your campaign will be deployed on the Sovereign Seas platform with comprehensive metadata. 
                       All media files will be uploaded to IPFS for decentralized storage, and your campaign 
                       will be immediately available for project submissions and community participation.
                     </p>
                     <div className="mt-3 text-xs text-purple-600">
                       <p>• Campaign Type: {campaignTypes.find(t => t.value === campaign.campaignType)?.label}</p>
                       <p>• Duration: {getDurationInDays()} days</p>
                       <p>• Distribution: {campaign.useQuadraticDistribution ? 'Quadratic' : campaign.useCustomDistribution ? 'Custom' : 'Linear'}</p>
                       <p>• Media files: {logoFile ? 1 : 0} file(s)</p>
                       <p>• Token: CELO (Payout & Fees)</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </Section>

           {/* Submit Button and related elements moved outside of Section */}
           <div className="mt-8 space-y-6">
             {/* Upload Progress */}
             {(isUploading || loading) && (
               <div className="bg-white rounded-xl p-6 border border-gray-200">
                 <div className="flex items-center justify-between mb-2">
                   <span className="font-medium text-gray-700">
                     {isUploading ? 'Uploading Files...' : 'Creating Campaign...'}
                   </span>
                   <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                 </div>
                 <p className="text-sm text-gray-500">
                   {isUploading && 'Uploading media files to IPFS...'}
                   {loading && !isUploading && 'Preparing transaction...'}
                 </p>
               </div>
             )}

             {/* Submit Button */}
             <div className="flex justify-center pt-6">
               <button
                 type="submit"
                 disabled={loading || isUploading}
                 className="px-12 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center group border border-emerald-400/30 relative overflow-hidden"
               >
                 {loading || isUploading ? (
                   <>
                     <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                     Processing...
                   </>
                 ) : (
                   <>
                     <Trophy className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                     Launch Campaign
                     <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                   </>
                 )}
               </button>
             </div>
             
             <div className="text-center text-sm text-gray-500 mt-4">
               <p>* Required fields must be completed before submission</p>
               <p className="mt-1">Questions? Visit <a href="https://seas.xyz/docs/funding" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700">seas.xyz/docs/funding</a> for more information</p>
             </div>
           </div>
         </form>
       </div>
     </div>
   </div>
 );
}