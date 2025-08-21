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
  ChevronUp,
  Award,
  Coins,
  Gift
} from 'lucide-react';
import { uploadToIPFS } from '@/utils/imageUtils';
import { Address } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther } from 'viem';
import { useNavigate } from 'react-router-dom';
import { useBridge } from '@/hooks/useBridge';
import { useReadContract, useWriteContract } from 'wagmi';
import { contractABI as abi } from '@/abi/seas4ABI';

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
  maxParticipants: string;
  maxWinners: string;
  poolProjectId: string;
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

export default function CreateCampaignV2() {
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();
  
  // Get CELO token address from environment
  const celoToken = import.meta.env.VITE_CELO_TOKEN as Address;
  const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;
  
  // Collapsible sections state
  const [expandedSection, setExpandedSection] = useState('basic');
  
  // Wallet and contract hooks
  const { authenticated, ready, user } = usePrivy();
  
  // Read campaign creation fee directly from contract
  const { data: campaignCreationFee } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'campaignCreationFee',
    query: {
      enabled: !!contractAddress
    }
  });
  
  // Cast the fee to bigint and add type guard
  const feeAmount = campaignCreationFee as bigint | undefined;
  
  // Check if user can bypass fees (super admin)
  const { data: canBypass } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'superAdmins',
    args: [user?.wallet?.address || '0x0'],
    query: {
      enabled: !!contractAddress && !!user?.wallet?.address
    }
  });

  // Use the new useBridge hook
  const { 
    useCreateCampaign
  } = useBridge();
  
  // Get the individual hooks
  const { 
    createCampaign, 
    isPending: isCreatingCampaign, 
    isSuccess: campaignCreated
  } = useCreateCampaign();

  // Temporary: Direct contract interaction for testing
  const { writeContract, isPending: isDirectPending, isSuccess: isDirectSuccess } = useWriteContract();

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
    
    // Timeline (Required fields marked)
    startDate: '', // Required
    endDate: '', // Required
    maxParticipants: '',
    maxWinners: '5', // Required
    
    // Pool Configuration (Optional)
    poolProjectId: '', // Optional
    
    // Distribution Settings
    eligibilityCriteria: [''],
    requirements: [''],
    judgesCriteria: [''],
    
    // Rewards & Prizes
    rewards: {
      distribution: ['']
    },
    
    // Contact & Social
    contactEmail: '', // Required
    twitter: '',
    discord: '',
    telegram: '',
    
    // Additional Info
    submissionGuidelines: '',
  });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<CampaignField, string>>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (campaignCreated) {
      setShowSuccessModal(true);
      // Reset form
      setCampaign({
        name: '',
        description: '',
        campaignType: 'grants_round',
        category: '',
        tags: [''],
        logo: '',
        website: '',
        videoLink: '',
        startDate: '',
        endDate: '',
        maxParticipants: '',
        maxWinners: '5',
        poolProjectId: '',
        eligibilityCriteria: [''],
        requirements: [''],
        judgesCriteria: [''],
        rewards: { distribution: [''] },
        submissionGuidelines: '',
        twitter: '',
        discord: '',
        telegram: '',
        contactEmail: '',
      });
    }
  }, [campaignCreated]);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const handleInputChange = (field: CampaignField, value: any) => {
    setCampaign(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleArrayInputChange = (field: CampaignField, index: number, value: string) => {
    setCampaign(prev => {
      const newArray = [...(prev[field] as string[])];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: CampaignField) => {
    setCampaign(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayItem = (field: CampaignField, index: number) => {
    setCampaign(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setLoading(true);
      const ipfsHash = await uploadToIPFS(file);
      setCampaign(prev => ({ ...prev, logo: ipfsHash }));
      setLogoPreview(URL.createObjectURL(file));
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<CampaignField, string>> = {};

    if (!campaign.name.trim()) errors.name = 'Campaign name is required';
    if (!campaign.description.trim()) errors.description = 'Campaign description is required';
    if (!campaign.startDate) errors.startDate = 'Start date is required';
    if (!campaign.endDate) errors.endDate = 'End date is required';
    if (!campaign.maxWinners) errors.maxWinners = 'Max winners is required';
    if (!campaign.contactEmail) errors.contactEmail = 'Contact email is required';

    // Check if CELO token is available
    if (!celoToken) {
      errors.name = 'CELO token configuration is missing. Please check your environment variables.';
    }

    // Validate dates
    if (campaign.startDate && campaign.endDate) {
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      if (startDate >= endDate) {
        errors.endDate = 'End date must be after start date';
      }
      if (startDate <= new Date()) {
        errors.startDate = 'Start date must be in the future';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!authenticated) {
      alert('Please connect your wallet first');
      return;
    }

    if (!celoToken) {
      alert('CELO token configuration is missing. Please check your environment variables.');
      return;
    }

    // Check if user has sufficient CELO for the fee
    if (!canBypass && feeAmount && feeAmount > 0n) {
      // Note: We can't easily check CELO balance here since we're using useBridge
      // The transaction will fail if insufficient funds, but we can warn the user
      console.log('Campaign creation fee required:', (Number(feeAmount) / 1e18).toFixed(6), 'CELO');
    }

    try {
      setLoading(true);

      // Convert dates to timestamps
      const startTime = BigInt(Math.floor(new Date(campaign.startDate).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(campaign.endDate).getTime() / 1000));

      // Create campaign with minimal required data
      await createCampaign({
        name: campaign.name,
        description: campaign.description,
        mainInfo: JSON.stringify({
          type: campaign.campaignType,
          category: campaign.category || 'Other',
          maxParticipants: campaign.maxParticipants ? parseInt(campaign.maxParticipants) : 1000,
          eligibilityCriteria: campaign.eligibilityCriteria.filter(c => c.trim() !== '').length > 0 
            ? campaign.eligibilityCriteria.filter(c => c.trim() !== '')
            : ['Open to all participants'],
          requirements: campaign.requirements.filter(r => r.trim() !== '').length > 0
            ? campaign.requirements.filter(r => r.trim() !== '')
            : ['Valid project submission'],
          judgesCriteria: campaign.judgesCriteria.filter(c => c.trim() !== '').length > 0
            ? campaign.judgesCriteria.filter(c => c.trim() !== '')
            : ['Innovation and impact'],
          rewards: {
            totalPrizePool: '0',
            distribution: campaign.rewards.distribution.filter(d => d.trim() !== '').length > 0 
              ? campaign.rewards.distribution.filter(d => d.trim() !== '')
              : ['Equal distribution among winners']
          },
          submissionGuidelines: campaign.submissionGuidelines || 'Submit your project with detailed description and any relevant media.'
        }),
        additionalInfo: JSON.stringify({
          version: '1.0.0',
          timestamp: Date.now(),
          creator: user?.wallet?.address || '0x0',
          tags: campaign.tags.filter(t => t.trim() !== ''),
          logo: campaign.logo,
          prizePool: '0',
          media: {
            website: campaign.website,
            videoLink: campaign.videoLink
          },
          social: {
            twitter: campaign.twitter,
            discord: campaign.discord,
            telegram: campaign.telegram,
            contactEmail: campaign.contactEmail
          }
        }),
        startTime: startTime,
        endTime: endTime,
        adminFeePercentage: BigInt(0), // Default to 0%
        maxWinners: BigInt(parseInt(campaign.maxWinners)),
        useQuadraticDistribution: false,
        useCustomDistribution: false,
        customDistributionData: 'default',
        payoutToken: celoToken,
        feeToken: celoToken,
        goodDollarPoolAmount: 0n, // No initial deposit required
        poolProjectId: campaign.poolProjectId || `campaign-${Date.now()}`, // Auto-generate if not provided
        poolIpfs: 'QmDefaultHashForEmptyPool', // Default IPFS hash
        feeAmount: !canBypass && feeAmount ? feeAmount : 0n, // Send fee if not bypassed
      });

    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/campaign-pools');
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  if (!isMounted) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to create a campaign</p>
          <button
            onClick={() => navigate('/campaign-pools')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Campaign Pools
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Campaign Pools
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Create Campaign
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Launch a new campaign with integrated Direct Payments pools
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mt-8 mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <>
              <Section
                id="basic"
                title="Basic Information"
                icon={Globe}
                required
                expandedSection={expandedSection}
                toggleSection={toggleSection}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      value={campaign.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter campaign name"
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Type
                    </label>
                    <select
                      value={campaign.campaignType}
                      onChange={(e) => handleInputChange('campaignType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="grants_round">Grants Round</option>
                      <option value="hackathon">Hackathon</option>
                      <option value="bounty">Bounty</option>
                      <option value="contest">Contest</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={campaign.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Describe your campaign..."
                    />
                    {validationErrors.description && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={campaign.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., DeFi, NFT, DAO"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={campaign.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.contactEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="your@email.com"
                    />
                    {validationErrors.contactEmail && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.contactEmail}</p>
                    )}
                  </div>
                </div>
              </Section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next: Campaign Details
                </button>
              </div>
            </>
          )}

          {/* Step 2: Campaign Details */}
          {currentStep === 2 && (
            <>
              <Section
                id="details"
                title="Campaign Details"
                icon={Info}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
              >
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-6">
                  <div className="flex items-center mb-4">
                    <Info className="w-6 h-6 text-blue-600 mr-2" />
                    <h4 className="text-lg font-semibold text-blue-800">Campaign Configuration</h4>
                  </div>
                  <p className="text-blue-700 mb-4">
                    Configure your campaign settings. Most fields are optional and can be updated later.
                  </p>
                  
                  {/* Fee Information */}
                  {(() => {
                    if (!canBypass && feeAmount && feeAmount > 0n) {
                      return (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center">
                            <Award className="w-5 h-5 text-yellow-600 mr-2" />
                            <div>
                              <p className="text-yellow-800 font-medium">Campaign Creation Fee</p>
                              <p className="text-yellow-700 text-sm">
                                You will need to pay {(Number(feeAmount) / 1e18).toFixed(6)} CELO to create this campaign.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Winners *
                    </label>
                    <input
                      type="number"
                      value={campaign.maxWinners}
                      onChange={(e) => handleInputChange('maxWinners', e.target.value)}
                      min="1"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.maxWinners ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="5"
                    />
                    {validationErrors.maxWinners && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.maxWinners}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={campaign.maxParticipants}
                      onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pool Project ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={campaign.poolProjectId}
                      onChange={(e) => handleInputChange('poolProjectId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="campaign-001 (auto-generated if empty)"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Leave empty to auto-generate
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={campaign.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Submission Guidelines
                    </label>
                    <textarea
                      value={campaign.submissionGuidelines}
                      onChange={(e) => handleInputChange('submissionGuidelines', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Guidelines for project submissions..."
                    />
                  </div>
                </div>
              </Section>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next: Timeline & Social
                </button>
              </div>
            </>
          )}

          {/* Step 3: Timeline & Social */}
          {currentStep === 3 && (
            <>
              <Section
                id="timeline"
                title="Timeline & Social"
                icon={Calendar}
                required
                expandedSection={expandedSection}
                toggleSection={toggleSection}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={campaign.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.startDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.startDate && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={campaign.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.endDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.endDate && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.endDate}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Social Media & Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter
                      </label>
                      <input
                        type="text"
                        value={campaign.twitter}
                        onChange={(e) => handleInputChange('twitter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="@username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discord
                      </label>
                      <input
                        type="text"
                        value={campaign.discord}
                        onChange={(e) => handleInputChange('discord', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Discord server link"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telegram
                      </label>
                      <input
                        type="text"
                        value={campaign.telegram}
                        onChange={(e) => handleInputChange('telegram', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Telegram group link"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="submit"
                  disabled={loading || isCreatingCampaign}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading || isCreatingCampaign ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Campaign...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Campaign Created!</h2>
              <p className="text-gray-600 mb-6">
                Your campaign has been successfully created on the blockchain.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/campaign-pools')}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Campaign Pools
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
