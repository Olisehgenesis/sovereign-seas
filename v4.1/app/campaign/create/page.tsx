'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  ArrowRight,
  Globe,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Image as ImageIcon,
  Video,
  Code,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  HelpCircle,
  Shield,
  Hash,
  CheckIcon,
  MapPin,
  Users,
  Star,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Mail,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Globe2,
  Bookmark,
  Tag,
  Target,
  Zap,
  Heart,
  Calendar,
  User,
  Briefcase,
  DollarSign,
  Clock,
  Trophy,
  Settings,
  Award,
  TrendingUp
} from 'lucide-react';
import { useCreateCampaign } from '@/hooks/useCampaignMethods';
import { uploadToIPFS } from '@/app/utils/imageUtils';
import { Address } from 'viem';

export default function CreateCampaign() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Form stages: 1: Basic Info, 2: Timeline & Funding, 3: Rules & Criteria, 4: Review & Submit
  const [currentStage, setCurrentStage] = useState(1);
  const totalStages = 4;
  
  // File handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  
  // Main campaign state
  const [campaign, setCampaign] = useState({
    // Basic Information
    name: '',
    description: '',
    campaignType: 'grants_round',
    category: '',
    tags: [''],
    
    // Media & Links
    logo: '',
    bannerImage: '',
    website: '',
    
    // Timeline & Funding
    startDate: '',
    endDate: '',
    fundingGoal: '',
    maxParticipants: '',
    adminFeePercentage: '5',
    maxWinners: '',
    
    // Distribution Settings
    useQuadraticDistribution: false,
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
    contactEmail: '',
    twitter: '',
    discord: '',
    telegram: '',
    
    // Additional Info
    submissionGuidelines: '',
    faq: [{
      question: '',
      answer: ''
    }],
    
    // Technical Settings
    payoutToken: process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS || '',
    feeToken: process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS || ''
  });

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;
  
  // Hook integration
  const {
    createCampaign: createCampaignHook,
    isPending,
    isError,
    error,
    isSuccess
  } = useCreateCampaign(contractAddress as Address);
  
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
    fundingGoal: '',
    contactEmail: '',
    eligibilityCriteria: [''],
    requirements: ['']
  });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle write errors
  useEffect(() => {
    if (error) {
      setErrorMessage(`Error creating campaign: ${error.message || 'Please try again later.'}`);
    }
  }, [error]);
  
  // Handle successful transaction
  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Campaign created successfully! Redirecting...');
      
      setTimeout(() => {
        router.push('/campaigns');
      }, 3000);
    }
  }, [isSuccess, router]);
  
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
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 
    'Climate', 'Social Impact', 'Research', 'Other'
  ];
  
  // Validation functions
  const validateBasicInfo = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
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
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateTimelineFunding = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
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
    
    if (!campaign.fundingGoal) {
      errors.fundingGoal = 'Funding goal is required';
      isValid = false;
    } else if (parseFloat(campaign.fundingGoal) <= 0) {
      errors.fundingGoal = 'Funding goal must be greater than 0';
      isValid = false;
    } else {
      errors.fundingGoal = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateRulesCriteria = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
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
    
    const validCriteria = campaign.eligibilityCriteria.filter(criteria => criteria.trim() !== '');
    if (validCriteria.length === 0) {
      errors.eligibilityCriteria = ['At least one eligibility criterion is required'];
      isValid = false;
    } else {
      errors.eligibilityCriteria = [''];
    }
    
    const validRequirements = campaign.requirements.filter(req => req.trim() !== '');
    if (validRequirements.length === 0) {
      errors.requirements = ['At least one requirement is required'];
      isValid = false;
    } else {
      errors.requirements = [''];
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateAllSteps = () => {
    return validateBasicInfo() && validateTimelineFunding() && validateRulesCriteria();
  };
  
  // Navigation functions
  const handleNext = () => {
    let canProceed = false;
    
    switch (currentStage) {
      case 1:
        canProceed = validateBasicInfo();
        break;
      case 2:
        canProceed = validateTimelineFunding();
        break;
      case 3:
        canProceed = validateRulesCriteria();
        break;
      default:
        canProceed = true;
    }
    
    if (canProceed && currentStage < totalStages) {
      setCurrentStage(currentStage + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handlePrevious = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
      window.scrollTo(0, 0);
    }
  };
  
  // Helper functions for dynamic arrays
  const addArrayItem = (field: string, defaultValue: any = '') => {
    setCampaign({
      ...campaign,
      [field]: [...(campaign[field as keyof typeof campaign] as any[]), defaultValue]
    });
  };
  
  const removeArrayItem = (field: string, index: number) => {
    const array = campaign[field as keyof typeof campaign] as any[];
    if (array.length <= 1) return;
    
    const updated = [...array];
    updated.splice(index, 1);
    setCampaign({
      ...campaign,
      [field]: updated
    });
  };
  
  const updateArrayItem = (field: string, index: number, value: any) => {
    const array = campaign[field as keyof typeof campaign] as any[];
    const updated = [...array];
    updated[index] = value;
    setCampaign({
      ...campaign,
      [field]: updated
    });
  };
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStage !== totalStages) {
      handleNext();
      return;
    }
    
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to create a campaign');
      return;
    }
    
    if (!validateAllSteps()) {
      setErrorMessage('Please fix the validation errors before submitting');
      return;
    }
    
    try {
      setLoading(true);
      setIsUploading(true);
      
      // Upload files to IPFS
      const campaignData = { ...campaign };
      
      if (logoFile) {
        const logoIpfsUrl = await uploadToIPFS(logoFile);
        campaignData.logo = logoIpfsUrl;
      }
      
      if (bannerFile) {
        const bannerIpfsUrl = await uploadToIPFS(bannerFile);
        campaignData.bannerImage = bannerIpfsUrl;
      }
      
      // Filter out empty values
      campaignData.tags = campaignData.tags.filter(tag => tag.trim() !== '');
      campaignData.eligibilityCriteria = campaignData.eligibilityCriteria.filter(criteria => criteria.trim() !== '');
      campaignData.requirements = campaignData.requirements.filter(req => req.trim() !== '');
      campaignData.judgesCriteria = campaignData.judgesCriteria.filter(criteria => criteria.trim() !== '');
      campaignData.rewards.distribution = campaignData.rewards.distribution.filter(dist => dist.trim() !== '');
      campaignData.faq = campaignData.faq.filter(item => item.question.trim() !== '' && item.answer.trim() !== '');
      
      // Create main info metadata
      const mainInfo = JSON.stringify({
        type: campaignData.campaignType,
        category: campaignData.category,
        maxParticipants: campaignData.maxParticipants ? parseInt(campaignData.maxParticipants) : 0,
        eligibilityCriteria: campaignData.eligibilityCriteria,
        requirements: campaignData.requirements,
        judgesCriteria: campaignData.judgesCriteria,
        rewards: campaignData.rewards,
        submissionGuidelines: campaignData.submissionGuidelines
      });
      
      // Create additional info metadata
      const additionalInfo = JSON.stringify({
        version: '1.0.0',
        timestamp: Date.now(),
        creator: address,
        tags: campaignData.tags,
        logo: campaignData.logo,
        bannerImage: campaignData.bannerImage,
        fundingGoal: campaignData.fundingGoal,
        additionalInfo: {
          website: campaignData.website,
          twitter: campaignData.twitter,
          discord: campaignData.discord,
          telegram: campaignData.telegram,
          contactEmail: campaignData.contactEmail,
          faq: campaignData.faq
        }
      });
      
      // Create custom distribution data
      const customDistributionData = campaignData.useCustomDistribution 
        ? JSON.stringify({
            distributionType: 'custom',
            notes: campaignData.customDistributionNotes || 'Manual distribution will be implemented by campaign admin'
          })
        : '';
      
      // Convert dates to Unix timestamps
      const startTimeUnix = BigInt(Math.floor(new Date(campaignData.startDate).getTime() / 1000));
      const endTimeUnix = BigInt(Math.floor(new Date(campaignData.endDate).getTime() / 1000));
      
      setIsUploading(false);
      
      // Call the hook function
      await createCampaignHook({
        name: campaignData.name,
        description: campaignData.description,
        mainInfo,
        additionalInfo,
        startTime: startTimeUnix,
        endTime: endTimeUnix,
        adminFeePercentage: BigInt(parseInt(campaignData.adminFeePercentage)),
        maxWinners: BigInt(campaignData.maxWinners ? parseInt(campaignData.maxWinners) : 0),
        useQuadraticDistribution: campaignData.useQuadraticDistribution,
        useCustomDistribution: campaignData.useCustomDistribution,
        customDistributionData,
        payoutToken: campaignData.payoutToken as Address,
        feeToken: campaignData.feeToken as Address
      });
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      setErrorMessage('Failed to create campaign. Please try again.');
      setLoading(false);
      setIsUploading(false);
    }
  };
  
  const getStageTitle = (stage: number) => {
    switch (stage) {
      case 1: return "Basic Information";
      case 2: return "Timeline & Funding";
      case 3: return "Rules & Criteria";
      case 4: return "Review & Submit";
      default: return "";
    }
  };
  
  const getStageDescription = (stage: number) => {
    switch (stage) {
      case 1: return "Define your campaign's core details and purpose";
      case 2: return "Set timeline, funding goals, and distribution settings";
      case 3: return "Establish eligibility, requirements, and judging criteria";
      case 4: return "Review everything before launch";
      default: return "";
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
  
  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-ss-sky-light py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-ss shadow-ss-card p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/campaigns')}
              className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </button>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4 animate-float">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-600 mb-4">
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
            <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-emerald-200 flex items-start">
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700">{successMessage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-red-200 flex items-start">
              <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Progress Steps */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-purple-100 mb-8 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex justify-between mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStage === step 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' 
                        : currentStage > step 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentStage > step ? <CheckIcon className="h-5 w-5" /> : step}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${
                      currentStage === step 
                        ? 'text-purple-600' 
                        : currentStage > step 
                          ? 'text-purple-700' 
                          : 'text-gray-500'
                    }`}>
                      {getStageTitle(step)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="relative mb-6">
                <div className="h-2 bg-gray-200 rounded-full absolute top-0 left-0 right-0"></div>
                <div 
                  className="h-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full absolute top-0 left-0 transition-all duration-700" 
                  style={{ width: `${(currentStage / totalStages) * 100}%` }}
                ></div>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Step {currentStage}: {getStageTitle(currentStage)}
                </h2>
                <p className="text-gray-600">{getStageDescription(currentStage)}</p>
              </div>
            </div>
          </div>
          
          {/* Main Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-purple-100 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10 p-8">
              <form onSubmit={handleSubmit}>
                {/* Stage 1: Basic Information */}
                {currentStage === 1 && (
                  <div className="space-y-8">
                    {/* Campaign Name & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-purple-700 font-medium mb-3 flex items-center">
                          <Hash className="h-4 w-4 mr-2" />
                          Campaign Name *
                        </label>
                        <input
                          type="text"
                          value={campaign.name}
                          onChange={(e) => setCampaign({...campaign, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                          placeholder="Enter your campaign name"
                        />
                        {formErrors.name && <p className="mt-2 text-red-500 text-sm">{formErrors.name}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-purple-700 font-medium mb-3 flex items-center">
                          <Tag className="h-4 w-4 mr-2" />
                          Category
                        </label>
                        <select
                          value={campaign.category}
                          onChange={(e) => setCampaign({...campaign, category: e.target.value})}
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
                      <label className="block text-purple-700 font-medium mb-3 flex items-center">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Campaign Type *
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {campaignTypes.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <div
                              key={type.value}
                              onClick={() => setCampaign({...campaign, campaignType: type.value})}
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
                      <label className="block text-purple-700 font-medium mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Campaign Description *
                      </label>
                      <textarea
                        value={campaign.description}
                        onChange={(e) => setCampaign({...campaign, description: e.target.value})}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                        placeholder="Provide a comprehensive description of your campaign, its goals, and what participants can expect..."
                      />
                      {formErrors.description && <p className="mt-2 text-red-500 text-sm">{formErrors.description}</p>}
                      <p className="mt-2 text-gray-500 text-sm">Minimum 100 characters • {campaign.description.length} characters</p>
                    </div>
                    
                    {/* Tags */}
                    <div>
                      <label className="block text-purple-700 font-medium mb-3 flex items-center">
                        <Bookmark className="h-4 w-4 mr-2" />
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

                    {/* Logo Upload */}
                    {/* Logo Upload */}
                   <div>
                     <label className="block text-purple-700 font-medium mb-3 flex items-center">
                       <ImageIcon className="h-4 w-4 mr-2" />
                       Campaign Logo
                     </label>
                     <div className="border-2 border-dashed border-purple-200 rounded-xl p-6 text-center hover:border-purple-300 transition-colors">
                       <input
                         type="file"
                         ref={logoFileInputRef}
                         accept="image/*"
                         onChange={(e) => {
                           if (e.target.files && e.target.files[0]) {
                             setLogoFile(e.target.files[0]);
                             setCampaign({...campaign, logo: `File selected: ${e.target.files[0].name}`});
                           }
                         }}
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
                             Choose Logo File
                           </button>
                           <p className="text-sm text-gray-500 mt-2">PNG, JPG, SVG up to 10MB</p>
                         </div>
                       </div>
                       {campaign.logo && (
                         <div className="mt-4 text-sm text-purple-600">
                           ✓ {campaign.logo.replace('File selected: ', '')}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Website */}
                   <div>
                     <label className="block text-purple-700 font-medium mb-3 flex items-center">
                       <Globe className="h-4 w-4 mr-2" />
                       Campaign Website
                     </label>
                     <input
                       type="url"
                       value={campaign.website}
                       onChange={(e) => setCampaign({...campaign, website: e.target.value})}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="https://yourcampaign.com"
                     />
                   </div>
                 </div>
               )}

               {/* Stage 2: Timeline & Funding */}
               {currentStage === 2 && (
                 <div className="space-y-8">
                   {/* Timeline */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <Calendar className="h-5 w-5 mr-2" />
                       Campaign Timeline
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-purple-700 font-medium mb-3">Start Date *</label>
                         <input
                           type="datetime-local"
                           value={campaign.startDate}
                           onChange={(e) => setCampaign({...campaign, startDate: e.target.value})}
                           className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                         />
                         {formErrors.startDate && <p className="mt-2 text-red-500 text-sm">{formErrors.startDate}</p>}
                       </div>
                       
                       <div>
                         <label className="block text-purple-700 font-medium mb-3">End Date *</label>
                         <input
                           type="datetime-local"
                           value={campaign.endDate}
                           onChange={(e) => setCampaign({...campaign, endDate: e.target.value})}
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

                   {/* Funding Goals */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <DollarSign className="h-5 w-5 mr-2" />
                       Funding & Rewards
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div>
                         <label className="block text-purple-700 font-medium mb-3">Funding Goal (CELO) *</label>
                         <input
                           type="number"
                           step="0.01"
                           min="0"
                           value={campaign.fundingGoal}
                           onChange={(e) => setCampaign({...campaign, fundingGoal: e.target.value})}
                           className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                           placeholder="50000"
                         />
                         {formErrors.fundingGoal && <p className="mt-2 text-red-500 text-sm">{formErrors.fundingGoal}</p>}
                       </div>
                       
                       <div>
                         <label className="block text-purple-700 font-medium mb-3">Admin Fee (%)</label>
                         <select
                           value={campaign.adminFeePercentage}
                           onChange={(e) => setCampaign({...campaign, adminFeePercentage: e.target.value})}
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

                     {/* Prize Pool */}
                     <div className="mb-6">
                       <label className="block text-purple-700 font-medium mb-3">Total Prize Pool (CELO)</label>
                       <input
                         type="number"
                         step="0.01"
                         min="0"
                         value={campaign.rewards.totalPrizePool}
                         onChange={(e) => setCampaign({
                           ...campaign, 
                           rewards: {...campaign.rewards, totalPrizePool: e.target.value}
                         })}
                         className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                         placeholder="Same as funding goal or different"
                       />
                     </div>

                     {/* Prize Distribution */}
                     <div>
                       <label className="block text-purple-700 font-medium mb-3">Prize Distribution</label>
                       {campaign.rewards.distribution.map((prize, index) => (
                         <div key={index} className="flex mb-3">
                           <input
                             type="text"
                             value={prize}
                             onChange={(e) => {
                               const updated = [...campaign.rewards.distribution];
                               updated[index] = e.target.value;
                               setCampaign({
                                 ...campaign,
                                 rewards: {...campaign.rewards, distribution: updated}
                               });
                             }}
                             className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                             placeholder="1st Place: 20,000 CELO"
                           />
                           {campaign.rewards.distribution.length > 1 && (
                             <button
                               type="button"
                               onClick={() => {
                                 const updated = [...campaign.rewards.distribution];
                                 updated.splice(index, 1);
                                 setCampaign({
                                   ...campaign,
                                   rewards: {...campaign.rewards, distribution: updated}
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
                         onClick={() => setCampaign({
                           ...campaign,
                           rewards: {
                             ...campaign.rewards,
                             distribution: [...campaign.rewards.distribution, '']
                           }
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
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <Users className="h-5 w-5 mr-2" />
                       Participation Settings
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-purple-700 font-medium mb-3">Max Participants</label>
                         <input
                           type="number"
                           min="0"
                           value={campaign.maxParticipants}
                           onChange={(e) => setCampaign({...campaign, maxParticipants: e.target.value})}
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
                           onChange={(e) => setCampaign({...campaign, maxWinners: e.target.value})}
                           className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                           placeholder="Leave empty for unlimited"
                         />
                       </div>
                     </div>
                   </div>

                   {/* Distribution Settings */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <Settings className="h-5 w-5 mr-2" />
                       Distribution Method
                     </h3>
                     
                     <div className="space-y-4">
                       <div className="flex items-center space-x-4">
                         <label className="flex items-center">
                           <input
                             type="radio"
                             name="distributionMethod"
                             checked={!campaign.useQuadraticDistribution && !campaign.useCustomDistribution}
                             onChange={() => setCampaign({
                               ...campaign, 
                               useQuadraticDistribution: false,
                               useCustomDistribution: false
                             })}
                             className="mr-2 text-purple-500"
                           />
                           <span className="font-medium">Linear Distribution</span>
                         </label>
                         <p className="text-gray-600 text-sm">Direct proportion to votes received</p>
                       </div>
                       
                       <div className="flex items-center space-x-4">
                         <label className="flex items-center">
                           <input
                             type="radio"
                             name="distributionMethod"
                             checked={campaign.useQuadraticDistribution}
                             onChange={() => setCampaign({
                               ...campaign, 
                               useQuadraticDistribution: true,
                               useCustomDistribution: false
                             })}
                             className="mr-2 text-purple-500"
                           />
                           <span className="font-medium">Quadratic Distribution</span>
                         </label>
                         <p className="text-gray-600 text-sm">Square root weighting for more balanced distribution</p>
                       </div>
                       
                       <div className="flex items-center space-x-4">
                         <label className="flex items-center">
                           <input
                             type="radio"
                             name="distributionMethod"
                             checked={campaign.useCustomDistribution}
                             onChange={() => setCampaign({
                               ...campaign, 
                               useQuadraticDistribution: false,
                               useCustomDistribution: true
                             })}
                             className="mr-2 text-purple-500"
                           />
                           <span className="font-medium">Custom Distribution</span>
                         </label>
                         <p className="text-gray-600 text-sm">Manual distribution by campaign admin</p>
                       </div>
                       
                       {campaign.useCustomDistribution && (
                         <div className="mt-4">
                           <label className="block text-purple-700 font-medium mb-3">Custom Distribution Notes</label>
                           <textarea
                             value={campaign.customDistributionNotes}
                             onChange={(e) => setCampaign({...campaign, customDistributionNotes: e.target.value})}
                             rows={3}
                             className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                             placeholder="Describe your custom distribution logic..."
                           />
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               )}

               {/* Stage 3: Rules & Criteria */}
               {currentStage === 3 && (
                 <div className="space-y-8">
                   {/* Contact Information */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <Mail className="h-5 w-5 mr-2" />
                       Contact Information
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-purple-700 font-medium mb-3">Contact Email *</label>
                         <input
                           type="email"
                           value={campaign.contactEmail}
                           onChange={(e) => setCampaign({...campaign, contactEmail: e.target.value})}
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
                           onChange={(e) => setCampaign({...campaign, website: e.target.value})}
                           className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                           placeholder="https://yourcampaign.com"
                         />
                       </div>
                     </div>
                   </div>

                   {/* Social Media */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <Globe2 className="h-5 w-5 mr-2" />
                       Social Media & Community
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div>
                         <label className="block text-purple-700 font-medium mb-3 flex items-center">
                           <Twitter className="h-4 w-4 mr-2" />
                           Twitter
                         </label>
                         <input
                           type="url"
                           value={campaign.twitter}
                           onChange={(e) => setCampaign({...campaign, twitter: e.target.value})}
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
                           onChange={(e) => setCampaign({...campaign, discord: e.target.value})}
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
                           onChange={(e) => setCampaign({...campaign, telegram: e.target.value})}
                           className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                           placeholder="https://t.me/yourcampaign"
                         />
                       </div>
                     </div>
                   </div>

                   {/* Eligibility Criteria */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <CheckCircle className="h-5 w-5 mr-2" />
                       Eligibility Criteria
                     </h3>
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
                     {formErrors.eligibilityCriteria[0] && <p className="mb-2 text-red-500 text-sm">{formErrors.eligibilityCriteria[0]}</p>}
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
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <FileText className="h-5 w-5 mr-2" />
                       Requirements
                     </h3>
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
                     {formErrors.requirements[0] && <p className="mb-2 text-red-500 text-sm">{formErrors.requirements[0]}</p>}
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
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <Award className="h-5 w-5 mr-2" />
                       Judging Criteria
                     </h3>
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
                     <label className="block text-purple-700 font-medium mb-3 flex items-center">
                       <Target className="h-4 w-4 mr-2" />
                       Submission Guidelines
                     </label>
                     <textarea
                       value={campaign.submissionGuidelines}
                       onChange={(e) => setCampaign({...campaign, submissionGuidelines: e.target.value})}
                       rows={4}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Detailed guidelines for project submissions, including required documents, formats, and deadlines..."
                     />
                   </div>

                   {/* FAQ Section */}
                   <div>
                     <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                       <HelpCircle className="h-5 w-5 mr-2" />
                       Frequently Asked Questions
                     </h3>
                     {campaign.faq.map((item, index) => (
                       <div key={index} className="bg-gray-50 rounded-xl p-6 mb-4 border border-gray-200">
                         <div className="grid grid-cols-1 gap-4">
                           <input
                             type="text"
                             value={item.question}
                             onChange={(e) => {
                               const updated = [...campaign.faq];
                               updated[index] = {...item, question: e.target.value};
                               setCampaign({...campaign, faq: updated});
                             }}
                             className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                             placeholder="Question"
                           />
                           <textarea
                             value={item.answer}
                             onChange={(e) => {
                               const updated = [...campaign.faq];
                               updated[index] = {...item, answer: e.target.value};
                               setCampaign({...campaign, faq: updated});
                             }}
                             rows={3}
                             className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                             placeholder="Answer"
                           />
                         </div>
                         {campaign.faq.length > 1 && (
                           <button
                             type="button"
                             onClick={() => {
                               const updated = [...campaign.faq];
                               updated.splice(index, 1);
                               setCampaign({...campaign, faq: updated});
                             }}
                             className="mt-3 bg-red-100 text-red-600 px-3 py-2 rounded-xl hover:bg-red-200 transition-colors flex items-center"
                           >
                             <Trash2 className="h-4 w-4 mr-2" />
                             Remove FAQ
                           </button>
                         )}
                       </div>
                     ))}
                     <button
                       type="button"
                       onClick={() => setCampaign({
                         ...campaign, 
                         faq: [...campaign.faq, {question: '', answer: ''}]
                       })}
                       className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors border border-purple-200"
                       >
                         <Plus className="h-4 w-4 mr-2" />
                         Add FAQ
                       </button>
                     </div>
                   </div>
                 )}
  
                 {/* Stage 4: Review & Submit */}
                 {currentStage === 4 && (
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
                           <span className="font-medium text-gray-600">Funding Goal:</span>
                           <p className="text-gray-800">{campaign.fundingGoal ? `${campaign.fundingGoal} CELO` : 'Not specified'}</p>
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
                             {campaign.useQuadraticDistribution ? 'Quadratic' : 
                              campaign.useCustomDistribution ? 'Custom' : 'Linear'}
                           </p>
                         </div>
                         <div>
                           <span className="font-medium text-gray-600">Prize Pool:</span>
                           <p className="text-gray-800">{campaign.rewards.totalPrizePool ? `${campaign.rewards.totalPrizePool} CELO` : 'Not specified'}</p>
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
  
                     {/* FAQ Summary */}
                     {campaign.faq.filter(item => item.question.trim() !== '' && item.answer.trim() !== '').length > 0 && (
                       <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                         <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                           <HelpCircle className="h-5 w-5 mr-2 text-purple-500" />
                           FAQ
                         </h4>
                         <div className="space-y-3">
                           {campaign.faq.filter(item => item.question.trim() !== '' && item.answer.trim() !== '').map((item, idx) => (
                             <div key={idx} className="border-l-2 border-purple-300 pl-4">
                               <p className="font-medium text-gray-700 text-sm">Q: {item.question}</p>
                               <p className="text-gray-600 text-sm mt-1">A: {item.answer}</p>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
  
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
                             <p>• Media files: {(logoFile ? 1 : 0) + (bannerFile ? 1 : 0)} file(s)</p>
                           </div>
                         </div>
                       </div>
                     </div>
  
                     {/* Upload Progress */}
                     {(isUploading || loading) && (
                       <div className="bg-white rounded-xl p-6 border border-gray-200">
                         <div className="flex items-center justify-between mb-2">
                           <span className="font-medium text-gray-700">
                             {isUploading ? 'Uploading Files...' : 'Creating Campaign...'}
                           </span>
                           {isPending && <Loader2 className="h-5 w-5 animate-spin text-purple-500" />}
                         </div>
                         <p className="text-sm text-gray-500">
                           {isUploading && 'Uploading media files to IPFS...'}
                           {isPending && 'Preparing transaction...'}
                         </p>
                       </div>
                     )}
                   </div>
                 )}
  
                 {/* Navigation Buttons */}
                 <div className="flex justify-between mt-12 pt-6 border-t border-gray-200">
                   <button
                     type="button"
                     onClick={handlePrevious}
                     className={`px-6 py-3 rounded-full bg-white text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center ${currentStage === 1 ? 'invisible' : ''}`}
                   >
                     <ArrowLeft className="h-4 w-4 mr-2" />
                     Previous
                   </button>
                   
                   {currentStage < totalStages ? (
                     <button
                       type="button"
                       onClick={handleNext}
                       className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group border border-purple-400/30 relative overflow-hidden"
                     >
                       Continue
                       <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                       <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                     </button>
                   ) : (
                     <button
                       type="submit"
                       disabled={loading || isPending || !isConnected}
                       className="px-8 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center group border border-emerald-400/30 relative overflow-hidden"
                     >
                       {loading || isPending ? (
                         <>
                           <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                           Processing...
                         </>
                       ) : (
                         <>
                           <Trophy className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                           Launch Campaign
                           <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                         </>
                       )}
                     </button>
                   )}
                 </div>
                 
                 {!isConnected && currentStage === totalStages && (
                   <p className="mt-4 text-amber-600 text-center flex items-center justify-center">
                     <AlertTriangle className="h-4 w-4 mr-2" />
                     Please connect your wallet to create a campaign
                   </p>
                 )}
               </form>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
  }