// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useCampaignDetails, useUpdateCampaign, useUpdateCampaignMetadata } from '@/hooks/useCampaignMethods';
import { useParams } from 'react-router-dom';
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
  Save,
  AlertTriangle
} from 'lucide-react';

interface CampaignFormData {
  id: number;
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
  payoutToken: string;
  feeToken: string;
  active: boolean;
  status: 'upcoming' | 'active' | 'ended' | 'paused';
}

type CampaignField = keyof CampaignFormData;

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

export default function EditCampaignDetails() {
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState('basic');
  const params = useParams();
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  
  // Get campaign ID from URL params
  const campaignId = params?.id ? BigInt(params.id as string) : undefined;
  
  // Fetch campaign details using the hook
  const { campaignDetails, isLoading: loadingDetails, error: detailsError, refetch } = useCampaignDetails(contractAddress, campaignId);
  
  // Update hooks
  const { 
    updateCampaign, 
    isPending: isUpdatingCampaign, 
    isError: updateCampaignError, 
    isSuccess: updateCampaignSuccess 
  } = useUpdateCampaign(contractAddress);
  
  const { 
    updateCampaignMetadata, 
    isPending: isUpdatingMetadata, 
    isError: updateMetadataError, 
    isSuccess: updateMetadataSuccess 
  } = useUpdateCampaignMetadata(contractAddress);
  
  // Initialize campaign state with data from the hook
  const [originalCampaign, setOriginalCampaign] = useState<CampaignFormData | null>(null);
  const [campaign, setCampaign] = useState<CampaignFormData | null>(null);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to parse metadata safely
  const parseMetadata = (jsonString: string, fallback: any = {}) => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (error) {
      console.warn('Failed to parse metadata:', error);
      return fallback;
    }
  };

  // Helper function to determine campaign status
  const getCampaignStatus = (startTime: bigint, endTime: bigint, active: boolean): 'upcoming' | 'active' | 'ended' | 'paused' => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(startTime);
    const end = Number(endTime);
    
    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end && active) {
      return 'active';
    } else if (now > end) {
      return 'ended';
    } else {
      return 'paused';
    }
  };

  useEffect(() => {
    if (campaignDetails) {
      const { campaign: campaignData, metadata } = campaignDetails;
      
      // Parse metadata
      const mainInfo = parseMetadata(metadata.mainInfo, {});
      const additionalInfo = parseMetadata(metadata.additionalInfo, {});
      
      const formattedCampaign: CampaignFormData = {
        id: Number(campaignData.id),
        name: campaignData.name,
        description: campaignData.description,
        campaignType: mainInfo.campaignType || 'hackathon',
        category: mainInfo.category || 'DeFi',
        tags: mainInfo.tags || [],
        logo: mainInfo.logo || '',
        website: mainInfo.website || '',
        videoLink: mainInfo.videoLink || '',
        startDate: new Date(Number(campaignData.startTime) * 1000).toISOString().slice(0, 16),
        endDate: new Date(Number(campaignData.endTime) * 1000).toISOString().slice(0, 16),
        prizePool: mainInfo.prizePool || '0',
        maxParticipants: mainInfo.maxParticipants || '0',
        maxWinners: campaignData.maxWinners.toString(),
        adminFeePercentage: campaignData.adminFeePercentage.toString(),
        useQuadraticDistribution: campaignData.useQuadraticDistribution,
        useCustomDistribution: campaignData.useCustomDistribution,
        customDistributionNotes: metadata.customDistributionData || '',
        eligibilityCriteria: additionalInfo.eligibilityCriteria || [''],
        requirements: additionalInfo.requirements || [''],
        judgesCriteria: additionalInfo.judgesCriteria || [''],
        rewards: {
          distribution: additionalInfo.rewards?.distribution || []
        },
        submissionGuidelines: additionalInfo.submissionGuidelines || '',
        twitter: additionalInfo.social?.twitter || '',
        discord: additionalInfo.social?.discord || '',
        telegram: additionalInfo.social?.telegram || '',
        contactEmail: additionalInfo.contactEmail || '',
        payoutToken: campaignData.payoutToken,
        feeToken: campaignData.feeToken,
        active: campaignData.active,
        status: getCampaignStatus(campaignData.startTime, campaignData.endTime, campaignData.active)
      };
      
      setOriginalCampaign(formattedCampaign);
      setCampaign(formattedCampaign);
    }
  }, [campaignDetails]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for changes - Fix to prevent infinite loops
  useEffect(() => {
    if (campaign && originalCampaign) {
      const hasChanged = JSON.stringify(campaign) !== JSON.stringify(originalCampaign);
      setHasChanges(hasChanged);
    }
  }, [campaign, originalCampaign]);

  // Handle success/error states
  useEffect(() => {
    if (updateCampaignSuccess || updateMetadataSuccess) {
      setSuccessMessage('Campaign updated successfully!');
      setErrorMessage('');
      // Refetch the data to get updated values
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  }, [updateCampaignSuccess, updateMetadataSuccess, refetch]);

  useEffect(() => {
    if (updateCampaignError || updateMetadataError) {
      setErrorMessage('Failed to update campaign. Please try again.');
      setSuccessMessage('');
    }
  }, [updateCampaignError, updateMetadataError]);

  // Handle field changes
  const handleFieldChange = (field: CampaignField, value: CampaignFormData[CampaignField]) => {
    if (!campaign) return;
    
    setCampaign(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  // Handle logo file change
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
      handleFieldChange('logo', `File selected: ${file.name}`);
      
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  // Array manipulation helpers
  const addArrayItem = (field: CampaignField, defaultValue = '') => {
    if (!campaign) return;
    const currentValue = campaign[field];
    if (Array.isArray(currentValue)) {
      handleFieldChange(field, [...currentValue, defaultValue] as CampaignFormData[CampaignField]);
    }
  };

  const removeArrayItem = (field: CampaignField, index: number) => {
    if (!campaign) return;
    const currentValue = campaign[field];
    if (!Array.isArray(currentValue) || currentValue.length <= 1) return;
    
    const updated = [...currentValue];
    updated.splice(index, 1);
    handleFieldChange(field, updated as CampaignFormData[CampaignField]);
  };

  const updateArrayItem = (field: CampaignField, index: number, value: string) => {
    if (!campaign) return;
    const currentValue = campaign[field];
    if (Array.isArray(currentValue) && currentValue.every(item => typeof item === 'string')) {
      const updated = [...currentValue];
      updated[index] = value;
      handleFieldChange(field, updated as CampaignFormData[CampaignField]);
    }
  };

  // Fixed validation - only validate fields that matter for submission
  const validateForm = () => {
    if (!campaign) return false;
    
    let isValid = true;
    const errors = { ...formErrors };
    
    // Description can always be updated
    if (!campaign.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    } else if (campaign.description.trim().length < 100) {
      errors.description = 'Description must be at least 100 characters long';
      isValid = false;
    } else {
      errors.description = '';
    }
    
    // Contact email can always be updated
    if (!campaign.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required';
      isValid = false;
    } else {
      errors.contactEmail = '';
    }
    
    // Only validate name if it can be edited
    if (canEditBasicInfo) {
      if (!campaign.name.trim()) {
        errors.name = 'Campaign name is required';
        isValid = false;
      } else {
        errors.name = '';
      }
    } else {
      errors.name = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };

  // Fixed edit permissions based on contract restrictions
  const canEditBasicInfo = campaign?.status === 'upcoming';
  const canEditDates = campaign?.status === 'upcoming';
  const canEditPrizePool = campaign?.status === 'upcoming' || campaign?.status === 'active';
  const canEditMaxWinners = campaign?.status === 'upcoming'; // Contract restriction: only before start
  const canEditMetadata = true; // Metadata can always be updated
  const canEditContactInfo = true; // Contact info can always be updated

  // Fixed submit handler to handle different update scenarios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaign || !campaignId || !contractAddress) {
      setErrorMessage('Missing required data');
      return;
    }

    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before submitting');
      return;
    }

    if (!hasChanges) {
      setErrorMessage('No changes to save');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare metadata
      const mainInfo = {
        campaignType: campaign.campaignType,
        category: campaign.category,
        tags: campaign.tags,
        logo: campaign.logo,
        website: campaign.website,
        videoLink: campaign.videoLink,
        prizePool: campaign.prizePool,
        maxParticipants: campaign.maxParticipants
      };

      const additionalInfo = {
        eligibilityCriteria: campaign.eligibilityCriteria,
        requirements: campaign.requirements,
        judgesCriteria: campaign.judgesCriteria,
        rewards: campaign.rewards,
        submissionGuidelines: campaign.submissionGuidelines,
        social: {
          twitter: campaign.twitter,
          discord: campaign.discord,
          telegram: campaign.telegram
        },
        contactEmail: campaign.contactEmail
      };

      // Always update metadata first (this is always allowed)
      await updateCampaignMetadata({
        campaignId,
        mainInfo: JSON.stringify(mainInfo),
        additionalInfo: JSON.stringify(additionalInfo)
      });

      // Only update basic campaign data if we can edit basic info or specific fields
      if (canEditBasicInfo || canEditDates || canEditPrizePool) {
        try {
          await updateCampaign({
            campaignId,
            name: campaign.name,
            description: campaign.description,
            startTime: BigInt(Math.floor(new Date(campaign.startDate).getTime() / 1000)),
            endTime: BigInt(Math.floor(new Date(campaign.endDate).getTime() / 1000)),
            adminFeePercentage: BigInt(campaign.adminFeePercentage),
            maxWinners: BigInt(campaign.maxWinners),
            useQuadraticDistribution: campaign.useQuadraticDistribution,
            useCustomDistribution: campaign.useCustomDistribution,
            payoutToken: campaign.payoutToken as `0x${string}`
          });
        } catch (contractError) {
          console.warn('Contract update failed, but metadata was updated:', contractError);
          setSuccessMessage('Metadata updated successfully. Some fields could not be updated due to campaign status.');
        }
      } else {
        setSuccessMessage('Metadata and contact information updated successfully!');
      }

    } catch (error) {
      console.error('Error updating campaign:', error);
      setErrorMessage('Failed to update campaign. Please try again.');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Calculate duration
  const getDurationInDays = () => {
    if (campaign?.startDate && campaign?.endDate) {
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

  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (detailsError || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load campaign details</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-gray-600 hover:text-purple-600 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
                <Save className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                Edit Campaign Details
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Update your campaign information. Some fields may be restricted based on campaign status.
              </p>
              
              {/* Status indicator */}
              <div className="inline-flex items-center mt-4 px-4 py-2 rounded-full bg-blue-100 text-blue-800">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  campaign.status === 'active' ? 'bg-green-500' :
                  campaign.status === 'upcoming' ? 'bg-blue-500' :
                  campaign.status === 'ended' ? 'bg-gray-500' : 'bg-yellow-500'
                }`}></div>
                Status: {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </div>
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

          {/* Changes indicator */}
          {hasChanges && (
            <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700">You have unsaved changes. Remember to save your updates.</p>
            </div>
          )}

          {/* Edit restrictions notice */}
          {campaign.status !== 'upcoming' && (
            <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-start">
              <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-blue-700">
                <p className="font-medium mb-1">Editing Restrictions</p>
                <p className="text-sm">
                  Some fields cannot be modified because your campaign is {campaign.status}. 
                  You can still update media, contact information, and campaign details.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Section 
              id="basic" 
              title="Basic Information" 
              icon={Hash} 
              required 
              expandedSection={expandedSection}
              toggleSection={toggleSection}
            >
              <div className="space-y-6">
                {/* Campaign Name & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-purple-700 font-medium mb-3">
                      Campaign Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={campaign.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      disabled={!canEditBasicInfo}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all ${
                        !canEditBasicInfo ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                      }`}
                      placeholder="Enter your campaign name"
                    />
                    {formErrors.name && <p className="mt-2 text-red-500 text-sm">{formErrors.name}</p>}
                    {!canEditBasicInfo && <p className="mt-2 text-gray-500 text-sm">Cannot edit once campaign has started</p>}
                  </div>
                  
                  <div>
                    <label className="block text-purple-700 font-medium mb-3">
                      Category
                    </label>
                    <select
                      value={campaign.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      disabled={!canEditBasicInfo}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all ${
                        !canEditBasicInfo ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                      }`}
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
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
              id="timeline" 
              title="Timeline & Funding" 
              icon={Calendar}
              expandedSection={expandedSection}
              toggleSection={toggleSection}
            >
              <div className="space-y-6">
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
                       disabled={!canEditDates}
                       className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all ${
                         !canEditDates ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                       }`}
                     />
                     {!canEditDates && <p className="mt-2 text-gray-500 text-sm">Cannot edit dates once campaign has started</p>}
                   </div>
                   
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">
                       End Date <span className="text-red-500">*</span>
                     </label>
                     <input
                       type="datetime-local"
                       value={campaign.endDate}
                       onChange={(e) => handleFieldChange('endDate', e.target.value)}
                       disabled={campaign.status === 'ended'}
                       className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all ${
                         campaign.status === 'ended' ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                       }`}
                     />
                     {campaign.status === 'ended' && <p className="mt-2 text-gray-500 text-sm">Campaign has ended</p>}
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

               {/* Prize Pool */}
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
                   disabled={!canEditPrizePool}
                   className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all ${
                     !canEditPrizePool ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                   }`}
                   placeholder="50000"
                 />
                 {!canEditPrizePool && campaign.status === 'ended' && (
                   <p className="mt-2 text-gray-500 text-sm">Cannot edit prize pool after campaign has ended</p>
                 )}
               </div>

               {/* Max Winners - Fixed with proper restriction */}
               <div>
                 <label className="block text-purple-700 font-medium mb-3">
                   Maximum Winners
                 </label>
                 <input
                   type="number"
                   min="1"
                   value={campaign.maxWinners}
                   onChange={(e) => handleFieldChange('maxWinners', e.target.value)}
                   disabled={!canEditMaxWinners}
                   className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all ${
                     !canEditMaxWinners ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                   }`}
                   placeholder="10"
                 />
                 {!canEditMaxWinners && (
                   <p className="mt-2 text-gray-500 text-sm">Winner count cannot be changed after campaign starts</p>
                 )}
               </div>

               {/* Distribution Options */}
               <div className="space-y-4">
                 <h4 className="text-lg font-semibold text-purple-700">Distribution Method</h4>
                 
                 <div className="flex items-center space-x-4">
                   <label className="flex items-center">
                     <input
                       type="checkbox"
                       checked={campaign.useQuadraticDistribution}
                       onChange={(e) => handleFieldChange('useQuadraticDistribution', e.target.checked)}
                       disabled={!canEditBasicInfo}
                       className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                     />
                     <span className="ml-2 text-gray-700">Use Quadratic Distribution</span>
                   </label>
                 </div>

                 <div className="flex items-center space-x-4">
                   <label className="flex items-center">
                     <input
                       type="checkbox"
                       checked={campaign.useCustomDistribution}
                       onChange={(e) => handleFieldChange('useCustomDistribution', e.target.checked)}
                       disabled={!canEditBasicInfo}
                       className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                     />
                     <span className="ml-2 text-gray-700">Use Custom Distribution</span>
                   </label>
                 </div>

                 {campaign.useCustomDistribution && (
                   <div>
                     <label className="block text-purple-700 font-medium mb-3">
                       Custom Distribution Notes
                     </label>
                     <textarea
                       value={campaign.customDistributionNotes || ''}
                       onChange={(e) => handleFieldChange('customDistributionNotes', e.target.value)}
                       rows={3}
                       className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                       placeholder="Describe your custom distribution logic..."
                     />
                   </div>
                 )}
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
                 
                 {(logoPreview || campaign.logo) && (
                   <div className="mb-4 flex justify-center">
                     <div className="relative">
                       <img
                         src={logoPreview || campaign.logo}
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
             id="contact" 
             title="Contact & Social" 
             icon={Users}
             required
             expandedSection={expandedSection}
             toggleSection={toggleSection}
           >
             <div className="space-y-6">
               {/* Contact Email */}
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
             </div>
           </Section>

           <Section 
             id="rules" 
             title="Rules & Criteria" 
             icon={Shield}
             expandedSection={expandedSection}
             toggleSection={toggleSection}
           >
             <div className="space-y-6">
               {/* Eligibility Criteria */}
               <div>
                 <label className="block text-purple-700 font-medium mb-3">Eligibility Criteria</label>
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
                 <label className="block text-purple-700 font-medium mb-3">Requirements</label>
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

               {/* Submission Guidelines */}
               <div>
                 <label className="block text-purple-700 font-medium mb-3">Submission Guidelines</label>
                 <textarea
                   value={campaign.submissionGuidelines}
                   onChange={(e) => handleFieldChange('submissionGuidelines', e.target.value)}
                   rows={4}
                   className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-800 transition-all"
                   placeholder="Detailed guidelines for project submissions..."
                 />
               </div>
             </div>
           </Section>

           {/* Save Button */}
           <div className="mt-8 flex justify-center">
             <button
               type="submit"
               disabled={isUpdatingCampaign || isUpdatingMetadata || !hasChanges}
               className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center border border-purple-400/30 relative overflow-hidden"
             >
               {isUpdatingCampaign || isUpdatingMetadata ? (
                 <>
                   <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                   Saving Changes...
                 </>
               ) : (
                 <>
                   <Save className="h-5 w-5 mr-3" />
                   {hasChanges ? 'Save Changes' : 'No Changes to Save'}
                 </>
               )}
             </button>
           </div>
         </form>
       </div>
     </div>
   </div>
 );
}