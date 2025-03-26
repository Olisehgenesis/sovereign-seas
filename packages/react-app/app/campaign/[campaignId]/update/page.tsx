'use client';

import { useState, useEffect, SetStateAction } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Edit,
  Image as ImageIcon,
  Video,
  Shield,
  Settings,
  HelpCircle,
  PencilLine,
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';

export default function EditCampaign() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Campaign data
  interface Campaign {
    id: bigint;
    admin: string;
    name: string;
    description: string;
    logo: string;
    demoVideo: string;
    startTime: bigint;
    endTime: bigint;
    adminFeePercentage: bigint;
    voteMultiplier: bigint;
    maxWinners: bigint;
    useQuadraticDistribution: boolean;
    active: boolean;
    totalFunds: bigint;
  };
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [originalCampaign, setOriginalCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [campaignActive, setCampaignActive] = useState(false);
  const [campaignStarted, setCampaignStarted] = useState(false);
  const [showRestrictionWarning, setShowRestrictionWarning] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    demoVideo: '',
    startTime: '',
    endTime: '',
    adminFeePercentage: 5,
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'media', 'timeline', 'fees'
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    logo: '',
    demoVideo: '',
    startTime: '',
    endTime: '',
    adminFeePercentage: '',
  });
  
  // Contract interaction
  const {
    isInitialized,

    loadCampaigns,
    updateCampaign,
    isCampaignAdmin,
    isCampaignActive,
    formatCampaignTime,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    txReceipt,
    writeError,
    resetWrite,
    isSuperAdmin,
  } = useSovereignSeas();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (isInitialized && campaignId) {
      loadCampaignData();
    }
  }, [isInitialized, campaignId, address]);
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // Check for write errors
  useEffect(() => {
    if (writeError) {
      setErrorMessage(`Error updating campaign: ${writeError.message || 'Please try again later.'}`);
      resetWrite();
    }
  }, [writeError, resetWrite]);
  
  // Redirect on successful update
  useEffect(() => {
    if (isTxSuccess) {
      setSuccessMessage('Campaign updated successfully! Redirecting to dashboard...');
      
      // Redirect after a delay
      const timer = setTimeout(() => {
        router.push(`/campaign/${campaignId}/dashboard`);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isTxSuccess, campaignId, router]);
  
  const loadCampaignData = async () => {
    setLoading(true);
    try {
      // Load all campaigns
      const allCampaigns = await loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign({ 
            ...campaignData
          });
          setOriginalCampaign({
            ...campaignData
          });
          
          // Set form data
          setFormData({
            name: campaignData.name,
            description: campaignData.description,
            logo: campaignData.logo || '',
            demoVideo: campaignData.demoVideo || '',
            startTime: formatDatetimeLocal(Number(campaignData.startTime)),
            endTime: formatDatetimeLocal(Number(campaignData.endTime)),
            adminFeePercentage: Number(campaignData.adminFeePercentage),
          });
          
          // Check if campaign active and started
          const now = Math.floor(Date.now() / 1000);
          setCampaignActive(campaignData.active);
          setCampaignStarted(Number(campaignData.startTime) <= now);
          
          // Check if user is authorized to edit
          const isAdmin = await isCampaignAdmin(Number(campaignId));
          const isOwner = address && address.toLowerCase() === campaignData.admin.toLowerCase();
          
          if (isAdmin || isOwner || isSuperAdmin) {
            setAuthorized(true);
          } else {
            setErrorMessage('You do not have permission to edit this campaign.');
          }
        } else {
          setErrorMessage('Campaign not found');
        }
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      setErrorMessage('Error loading campaign data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format Unix timestamp to datetime-local input format
  const formatDatetimeLocal = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);
  };
  
  // Handle input changes
  const handleInputChange = (field: keyof typeof formErrors, value: string) => {
    // Show warning if trying to edit restricted fields
    if (campaignStarted && (field === 'startTime' || ['voteMultiplier', 'maxWinners', 'useQuadraticDistribution'].includes(field as string))) {
      setShowRestrictionWarning(true);
      return;
    }
    
    setFormData({
      ...formData,
      [field]: value,
    });
    
    // Clear validation error when user starts typing
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: '',
      });
    }
  };
  
  // Validate form
  const validateForm = () => {
    let isValid = true;
    const errors = {
      name: '',
      description: '',
      logo: '',
      demoVideo: '',
      startTime: '',
      endTime: '',
      adminFeePercentage: '',
    };
    
    // Basic validation
    if (!formData.name.trim()) {
      errors.name = 'Campaign name is required';
      isValid = false;
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    }
    
    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
      isValid = false;
    }
    
    if (!formData.endTime) {
      errors.endTime = 'End time is required';
      isValid = false;
    } else {
      // Validate end time is after start time
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      
      if (endDate <= startDate) {
        errors.endTime = 'End time must be after start time';
        isValid = false;
      }
    }
    
    // Validate admin fee (0-30%)
    if (formData.adminFeePercentage < 0 || formData.adminFeePercentage > 30) {
      errors.adminFeePercentage = 'Admin fee must be between 0% and 30%';
      isValid = false;
    }
    
    // Validate URLs if provided
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    
    if (formData.logo && !urlRegex.test(formData.logo)) {
      errors.logo = 'Please enter a valid logo URL';
      isValid = false;
    }
    
    if (formData.demoVideo && !urlRegex.test(formData.demoVideo)) {
      errors.demoVideo = 'Please enter a valid demo video URL';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to edit this campaign');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Convert dates to unix timestamps
      const startTimestamp = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      await updateCampaign(
        Number(campaignId),
        formData.name,
        formData.description,
        formData.logo,
        formData.demoVideo,
        startTimestamp,
        endTimestamp,
        formData.adminFeePercentage
      );
      
      setSuccessMessage('Campaign update submitted. Please wait for confirmation...');
    } catch (error) {
      console.error('Error updating campaign:', error);
      setErrorMessage('Error updating campaign. Please try again later.');
    }
  };
  
  // Function to open media preview
  const openMediaPreview = (type: SetStateAction<string>, url: SetStateAction<string>) => {
    if (!url) return;
    
    setPreviewType(type);
    setPreviewUrl(url);
    setShowPreview(true);
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-lg text-emerald-600">Loading campaign data...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
          <XCircle className="h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold mb-3">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">The campaign you're trying to edit doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            View All Campaigns
          </button>
        </div>
      </div>
    );
  }
  
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
          <Shield className="h-16 w-16 text-amber-400 mb-4" />
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to edit this campaign. Only campaign administrators can make changes.</p>
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            View Campaign
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-gray-500 hover:text-emerald-600 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center">
              <Edit className="h-8 w-8 text-emerald-500 mr-3" />
              Edit Campaign
            </h1>
            <p className="text-gray-500 mt-2 flex items-center">
              <PencilLine className="h-4 w-4 mr-2" />
              Making changes to: <span className="text-emerald-600 ml-1 font-medium">{campaign.name}</span>
            </p>
          </div>

          {campaignStarted && (
            <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-sm">
              <div className="flex items-start">
                <Info className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                <h3 className="font-semibold text-amber-600">Limited Editing Mode</h3>
                  <p className="text-amber-700 mt-1">
                    This campaign has already started, so some settings can't be modified. You can still update basic information, media, and adjust the end time and admin fee.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {showRestrictionWarning && (
            <div className="mb-6 bg-red-50 rounded-xl p-4 border border-red-200 shadow-sm">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-600">Editing Restricted</h3>
                  <p className="text-red-700 mt-1">
                    Some settings cannot be modified once a campaign has started. These include start time, voting mechanism settings, and distribution method.
                  </p>
                  <button 
                    onClick={() => setShowRestrictionWarning(false)}
                    className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 mb-6">
            {/* Success message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-green-700">{successMessage}</p>
              </div>
            )}
            
            {/* Error message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
                <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{errorMessage}</p>
              </div>
            )}
            
            {/* Form Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2 font-medium whitespace-nowrap ${
                  activeTab === 'basic' 
                    ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' 
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`px-4 py-2 font-medium whitespace-nowrap ${
                  activeTab === 'media' 
                    ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' 
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                Media Content
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 font-medium whitespace-nowrap ${
                  activeTab === 'timeline' 
                    ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' 
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('fees')}
                className={`px-4 py-2 font-medium whitespace-nowrap ${
                  activeTab === 'fees' 
                    ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' 
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                Fee Settings
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-emerald-600 flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Basic Campaign Information
                    </h3>
                  </div>
                  
                  <div>
                    <label className="block text-emerald-600 mb-2">Campaign Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Enter campaign name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-red-500 text-sm">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-emerald-600 mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Describe your campaign"
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-red-500 text-sm">{formErrors.description}</p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg text-sm">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-700">
                        A clear name and detailed description will help projects and voters understand the purpose of your campaign.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Media Tab */}
              {activeTab === 'media' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-emerald-600 flex items-center">
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Media Content
                    </h3>
                  </div>
                  
                  <div>
                    <label className="block text-emerald-600 mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Logo URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.logo}
                      onChange={(e) => handleInputChange('logo', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="https://example.com/logo.png or IPFS hash"
                    />
                    {formErrors.logo && (
                      <p className="mt-1 text-red-500 text-sm">{formErrors.logo}</p>
                    )}
                    <p className="mt-1 text-gray-500 text-sm">Add your campaign logo (URL to an image file)</p>
                    
                    {formData.logo && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openMediaPreview('image', formData.logo)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors inline-flex items-center"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                          Preview Logo
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-emerald-600 mb-2 flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      Demo Video URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.demoVideo}
                      onChange={(e) => handleInputChange('demoVideo', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="https://example.com/demo.mp4 or IPFS hash"
                    />
                    {formErrors.demoVideo && (
                      <p className="mt-1 text-red-500 text-sm">{formErrors.demoVideo}</p>
                    )}
                    <p className="mt-1 text-gray-500 text-sm">Add a video demonstrating your campaign</p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg text-sm">
                    <div className="flex items-start">
                      <HelpCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-700">
                          <span className="font-medium">Media Tips:</span> Adding visual content significantly increases engagement with your campaign. Upload your media to a hosting service or IPFS and paste the URL here.
                        </p>
                        <p className="text-blue-600 text-sm mt-2">
                          Recommended image formats: PNG, JPG, SVG<br />
                          Recommended video formats: MP4, WebM
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-emerald-600 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Campaign Timeline
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-emerald-600 mb-2">Start Date *</label>
                      <input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className={`w-full px-4 py-2.5 rounded-lg bg-white border focus:outline-none focus:ring-1 ${
                          campaignStarted 
                            ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500'
                        }`}
                        disabled={campaignStarted}
                      />
                      {formErrors.startTime && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.startTime}</p>
                      )}
                      {campaignStarted && (
                        <p className="mt-1 text-amber-500 text-sm">Start time cannot be changed once the campaign has started</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-emerald-600 mb-2">End Date *</label>
                      <input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        min={formData.startTime || new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {formErrors.endTime && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.endTime}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg text-sm">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-700">
                        Campaign duration affects exposure and funding potential. You can extend the end date, but shortening it may reduce voting opportunities for projects.
                      </p>
                    </div>
                  </div>
                  
                  {campaignStarted && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-sm">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-700">
                          Since this campaign has already started, you can only modify the end date. The start date and other distribution settings are locked.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Fees Tab */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-emerald-600 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <Settings className="h-5 w-5 mr-2" />
                      Fee Settings
                    </h3>
                  </div>
                  
                  <div>
                    <label className="block text-emerald-600 mb-2">Admin Fee Percentage (%)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={formData.adminFeePercentage}
                        onChange={(e) => handleInputChange('adminFeePercentage', parseInt(e.target.value).toString())}
                        min="0"
                        max="30"
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="ml-2 text-gray-500">%</span>
                    </div>
                    <p className="mt-1 text-gray-500 text-sm">
                      This is your fee as the campaign admin (max 30%). The platform also takes a 15% fee.
                    </p>
                    {formErrors.adminFeePercentage && (
                      <p className="mt-1 text-red-500 text-sm">{formErrors.adminFeePercentage}</p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg mt-4 text-sm">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-700">
                          <span className="font-medium">Fees Breakdown:</span> Admin fees are charged only when funds are distributed. The total fees are:
                        </p>
                        <ul className="text-blue-600 list-disc list-inside mt-2 space-y-1">
                          <li>Platform fee: 15% (fixed)</li>
                          <li>Admin fee: {formData.adminFeePercentage}% (adjustable)</li>
                          <li>Projects receive: {85 - formData.adminFeePercentage}% of total funds</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Unchangeable Distribution Settings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Vote Multiplier:</span>
                        <span className="font-medium text-gray-800">{campaign.voteMultiplier.toString()}x</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Distribution Method:</span>
                        <span className="font-medium text-gray-800">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Winners:</span>
                        <span className="font-medium text-gray-800">
                          {campaign.maxWinners.toString() === '0' ? 'Unlimited (All Projects)' : campaign.maxWinners.toString()}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-gray-500 text-xs">These settings were locked when the campaign was created and cannot be modified.</p>
                  </div>
                </div>
              )}
              
              <div className="mt-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isWritePending || isWaitingForTx || !isConnected}
                    className="flex-1 py-3 px-6 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isWritePending || isWaitingForTx ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {isWritePending ? 'Preparing Update...' : 'Updating...'}
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                    className="py-3 px-6 bg-white border border-gray-200 text-gray-600 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
                
                {!isConnected && (
                  <p className="mt-3 text-amber-500 text-center">
                    Please connect your wallet to edit this campaign
                  </p>
                )}
              </div>
            </form>
          </div>
          
          {/* Read-only information box */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Locked Campaign Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Campaign ID:</span>
                <span className="font-mono text-gray-800">{campaign.id.toString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Admin Address:</span>
                <span className="font-mono text-gray-800 truncate max-w-[220px]">{campaign.admin}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Status:</span>
                <span className={`font-medium ${campaignActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {campaignActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Funds:</span>
                <span className="font-medium text-emerald-600">{Number(campaign.totalFunds) / 10**18} CELO</span>
              </div>
            </div>
            <p className="mt-4 text-gray-500 text-xs">This information is stored on the blockchain and cannot be modified.</p>
          </div>
        </div>
      </div>
      
      {/* Media Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4">
              {previewType === 'image' ? 'Logo Preview' : 'Demo Video Preview'}
            </h3>
            
            <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[300px]">
              {previewType === 'image' ? (
                <img 
                  src={previewUrl} 
                  alt="Campaign Logo" 
                  className="max-w-full max-h-[400px] object-contain rounded"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-image.png';
                    setErrorMessage('Could not load image. Please check the URL.');
                  }}
                />
              ) : (
                <div className="w-full">
                  <video 
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-[400px] mx-auto rounded"
                    onError={() => {
                      setErrorMessage('Could not load video. Please check the URL or try a different format.');
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm break-all">{previewUrl}</p>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}