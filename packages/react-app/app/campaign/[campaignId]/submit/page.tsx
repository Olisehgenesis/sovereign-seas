'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Waves, 
  Github,
  Globe,
  FileText,
  Calendar,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Image as ImageIcon,
  Video,
  Code,
  Plus,
  X,
  Trash,
  AlertTriangle,
  HelpCircle,
  Eye,
  Shield
} from 'lucide-react';
import { useSovereignSeas, PROJECT_CREATION_FEE } from '../../../../hooks/useSovereignSeas';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`; 
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}`; 


export default function SubmitProject() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Enhanced form state with new fields
  const [project, setProject] = useState({
    name: '',
    description: '',
    githubLink: '',
    socialLink: '',
    testingLink: '',
    logo: '',
    demoVideo: '',
    contracts: [''],
  });
  
  // Campaign data
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    logo: '',
    demoVideo: '',
    contracts: [''],
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'media', 'contracts'
  const [urlPreview, setUrlPreview] = useState({
    logo: null,
    demoVideo: null,
  });
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    submitProject,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    txReceipt,
    writeError,
    resetWrite
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (isInitialized && campaignId) {
      loadCampaignData();
    }
  }, [isInitialized, campaignId]);
  
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
      setErrorMessage(`Error submitting project: ${writeError.message || 'Please try again later.'}`);
      resetWrite();
    }
  }, [writeError, resetWrite]);
  
  // Redirect or reset form on successful submission
  useEffect(() => {
    if (isTxSuccess) {
      setSuccessMessage('Project submitted successfully! Redirecting to campaign dashboard...');
      resetForm();
      
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
          setCampaign(campaignData);
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
  
  const validateForm = () => {
    let isValid = true;
    const errors = {
      name: '',
      description: '',
      logo: '',
      demoVideo: '',
      contracts: [''],
    };
    
    if (!project.name.trim()) {
      errors.name = 'Project name is required';
      isValid = false;
    }
    
    if (!project.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    } else if (project.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters long';
      isValid = false;
    }
    
    // Validate URLs if provided
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    
    if (project.githubLink && !urlRegex.test(project.githubLink)) {
      errors.name = 'Please enter a valid GitHub URL';
      isValid = false;
    }
    
    if (project.socialLink && !urlRegex.test(project.socialLink)) {
      errors.name = 'Please enter a valid social media URL';
      isValid = false;
    }
    
    if (project.testingLink && !urlRegex.test(project.testingLink)) {
      errors.name = 'Please enter a valid testing/demo URL';
      isValid = false;
    }
    
    if (project.logo && !urlRegex.test(project.logo)) {
      errors.logo = 'Please enter a valid logo URL';
      isValid = false;
    }
    
    if (project.demoVideo && !urlRegex.test(project.demoVideo)) {
      errors.demoVideo = 'Please enter a valid demo video URL';
      isValid = false;
    }
    
    // Validate contracts if any are provided
    const validContracts = project.contracts.filter(c => c.trim() !== '');
    if (validContracts.length > 0) {
      const contractRegex = /^0x[a-fA-F0-9]{40}$/;
      for (let i = 0; i < validContracts.length; i++) {
        if (!contractRegex.test(validContracts[i])) {
          errors.contracts[i] = 'Please enter a valid Ethereum address (0x...)';
          isValid = false;
        }
      }
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to submit a project');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Filter out empty contract addresses
      const contracts = project.contracts.filter(c => c.trim() !== '');
      
      await submitProject(
        Number(campaignId),
        project.name,
        project.description,
        project.githubLink,
        project.socialLink,
        project.testingLink,
        project.logo,
        project.demoVideo,
        contracts
      );
    } catch (error) {
      console.error('Error submitting project:', error);
      setErrorMessage('Error submitting project. Please try again later.');
    }
  };
  
  const resetForm = () => {
    setProject({
      name: '',
      description: '',
      githubLink: '',
      socialLink: '',
      testingLink: '',
      logo: '',
      demoVideo: '',
      contracts: [''],
    });
    setFormErrors({
      name: '',
      description: '',
      logo: '',
      demoVideo: '',
      contracts: [''],
    });
    setActiveTab('basic');
  };
  
  const handleInputChange = (field: string, value: string) => {
    setProject({
      ...project,
      [field]: value,
    });
    
    // Clear validation error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [field]: '',
      });
    }
  };
  
  const handleContractChange = (index: number, value: string) => {
    const updatedContracts = [...project.contracts];
    updatedContracts[index] = value;
    setProject({
      ...project,
      contracts: updatedContracts
    });
    
    // Clear contract validation error
    if (formErrors.contracts[index]) {
      const updatedContractErrors = [...formErrors.contracts];
      updatedContractErrors[index] = '';
      setFormErrors({
        ...formErrors,
        contracts: updatedContractErrors
      });
    }
  };
  
  const handleAddContract = () => {
    setProject({
      ...project,
      contracts: [...project.contracts, '']
    });
    setFormErrors({
      ...formErrors,
      contracts: [...formErrors.contracts, '']
    });
  };
  
  const handleRemoveContract = (index: number) => {
    if (project.contracts.length <= 1) return;
    
    const updatedContracts = [...project.contracts];
    updatedContracts.splice(index, 1);
    setProject({
      ...project,
      contracts: updatedContracts
    });
    
    const updatedErrors = [...formErrors.contracts];
    updatedErrors.splice(index, 1);
    setFormErrors({
      ...formErrors,
      contracts: updatedErrors
    });
  };
  
  // Function to open media preview modal
  const openMediaPreview = (type: string, url: string) => {
    if (!url) return;
    
    setPreviewType(type);
    setPreviewUrl(url);
    setShowMediaPreview(true);
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-lime-500 animate-spin mb-4" />
          <p className="text-lg text-lime-300">Loading campaign data...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6">
          <XCircle className="h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold mb-3">Campaign Not Found</h1>
          <p className="text-slate-300 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors"
          >
            View All Campaigns
          </button>
        </div>
      </div>
    );
  }
  
  const isActive = isCampaignActive(campaign);
  const timeRemaining = getCampaignTimeRemaining(campaign);
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  // Check if campaign is still accepting submissions (even if not yet started)
  const canSubmit = !hasEnded && campaign.active;
  
  if (hasEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
              className="inline-flex items-center text-slate-300 hover:text-white mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20 text-center">
              <Info className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-3">Campaign Has Ended</h1>
              <p className="text-slate-300 mb-6">
                This campaign has ended and is no longer accepting project submissions.
              </p>
              <button
                onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors"
              >
                View Campaign Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-slate-300 hover:text-white mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center">
              <Waves className="h-8 w-8 text-lime-500 mr-3" />
              Submit Project to Campaign
            </h1>
            <p className="text-slate-300 mt-2">{campaign.name}</p>
          </div>

          {/* Fee Notice */}
          <div className="mb-6 bg-amber-900/40 backdrop-blur-sm rounded-lg p-4 border border-amber-500/30 relative">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-400 flex items-center">
                  Project Submission Fee Required
                  <button 
                    type="button" 
                    onClick={() => setShowFeeTooltip(!showFeeTooltip)}
                    className="text-amber-400/70 hover:text-amber-300 ml-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </h3>
                <p className="text-amber-100/90 mt-1">
                  A fee of <span className="font-semibold">{PROJECT_CREATION_FEE} CELO</span> will be charged to submit this project.
                </p>
                <p className="text-amber-100/70 text-sm mt-2">
                  This fee helps prevent spam submissions and ensures project quality.
                </p>
                
                {showFeeTooltip && (
                  <div className="absolute right-4 top-4 w-64 p-3 bg-slate-800 rounded-md shadow-lg z-10 text-sm border border-amber-500/30">
                    <p className="text-amber-100">
                      Submission fees are collected to prevent spam and ensure only quality projects are submitted. These fees support platform maintenance and development.
                    </p>
                    <button 
                      type="button" 
                      className="absolute top-1 right-1 text-slate-400 hover:text-white"
                      onClick={() => setShowFeeTooltip(false)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              {hasStarted ? (
                <div className="flex items-center text-yellow-400">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="font-medium">Time Remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m</span>
                </div>
              ) : (
                <div className="flex items-center text-lime-400">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span className="font-medium">Starts: {formatCampaignTime(campaign.startTime)}</span>
                </div>
              )}
              <div className="flex items-center text-slate-300">
                <Calendar className="h-4 w-4 mr-2" />
                Ends: {formatCampaignTime(campaign.endTime)}
              </div>
            </div>
            
            {!hasStarted && (
              <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4 mb-6 flex items-start">
                <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300">
                  This campaign hasn't started yet, but you can submit your project early! Your project will need approval from the campaign admin before it appears in the list of projects.
                </p>
              </div>
            )}
            
            {/* Success message */}
            {successMessage && (
              <div className="bg-green-900/30 border border-green-500/40 rounded-lg p-4 mb-6 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-green-300">{successMessage}</p>
              </div>
            )}
            
            {/* Error message */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4 mb-6 flex items-start">
                <XCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-300">{errorMessage}</p>
              </div>
            )}
            
            {/* Form Tabs */}
            <div className="flex border-b border-slate-700 mb-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'basic' 
                    ? 'text-lime-400 border-b-2 border-lime-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'media' 
                    ? 'text-lime-400 border-b-2 border-lime-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Media
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'contracts' 
                    ? 'text-lime-400 border-b-2 border-lime-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Contracts
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-lime-300 mb-2">Project Name *</label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="Enter project name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-red-400 text-sm">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2">Description *</label>
                    <textarea
                      value={project.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="Describe your project in detail. What problem does it solve? How does it relate to ocean conservation?"
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-red-400 text-sm">{formErrors.description}</p>
                    )}
                    <p className="mt-1 text-slate-400 text-sm">Minimum 20 characters</p>
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <Github className="h-4 w-4 mr-2" />
                      GitHub Repository (Optional)
                    </label>
                    <input
                      type="url"
                      value={project.githubLink}
                      onChange={(e) => handleInputChange('githubLink', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="https://github.com/yourusername/yourproject"
                    />
                    <p className="mt-1 text-slate-400 text-sm">Link to your project's GitHub repository</p>
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Social Media Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={project.socialLink}
                      onChange={(e) => handleInputChange('socialLink', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="https://twitter.com/yourproject"
                    />
                    <p className="mt-1 text-slate-400 text-sm">Link to your project's social media page</p>
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Demo/Testing Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={project.testingLink}
                      onChange={(e) => handleInputChange('testingLink', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="https://demo.yourproject.com"
                    />
                    <p className="mt-1 text-slate-400 text-sm">Link to a demo or testing version of your project</p>
                  </div>
                </div>
              )}
              
              {/* Media Tab */}
              {activeTab === 'media' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-lime-300">Media Content</h3>
                    <div className="flex items-center text-sm text-slate-400">
                      <Info className="h-3.5 w-3.5 mr-2" />
                      Project media enhances visibility
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Logo URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={project.logo}
                      onChange={(e) => handleInputChange('logo', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="https://example.com/logo.png or IPFS hash"
                    />
                    {formErrors.logo && (
                      <p className="mt-1 text-red-400 text-sm">{formErrors.logo}</p>
                    )}
                    <p className="mt-1 text-slate-400 text-sm">Add your project logo (URL to an image file)</p>
                    
                    {project.logo && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openMediaPreview('image', project.logo)}
                          className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors inline-flex items-center"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview Logo
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      Demo Video URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={project.demoVideo}
                      onChange={(e) => handleInputChange('demoVideo', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                      placeholder="https://example.com/demo.mp4 or IPFS hash"
                    />
                    {formErrors.demoVideo && (
                      <p className="mt-1 text-red-400 text-sm">{formErrors.demoVideo}</p>
                    )}
                    <p className="mt-1 text-slate-400 text-sm">Add a video demonstrating your project</p>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-lg p-4 mt-4">
                    <div className="flex items-start">
                      <HelpCircle className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-300 text-sm">
                          <span className="font-medium text-white">Media Tips:</span> Adding visual content significantly increases engagement with your project. Upload your media to a hosting service or IPFS and paste the URL here.
                        </p>
                        <p className="text-slate-400 text-sm mt-2">
                          Recommended image formats: PNG, JPG, SVG<br />
                          Recommended video formats: MP4, WebM
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Contracts Tab */}
              {activeTab === 'contracts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-lime-300">Smart Contracts</h3>
                    <div className="flex items-center text-sm text-slate-400">
                      <Info className="h-3.5 w-3.5 mr-2" />
                      Add project contracts
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="flex justify-between items-center text-lime-300 mb-3">
                      <span className="flex items-center">
                        <Code className="h-4 w-4 mr-2" />
                        Contract Addresses (Optional)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddContract}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors inline-flex items-center"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Contract
                      </button>
                    </label>
                    
                    {project.contracts.map((contract, index) => (
                      <div key={index} className="flex mb-3">
                        <input
                          type="text"
                          value={contract}
                          onChange={(e) => handleContractChange(index, e.target.value)}
                          className="flex-grow px-4 py-2 rounded-l-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white font-mono"
                          placeholder="0x..."
                        />
                        {project.contracts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContract(index)}
                            className="bg-slate-700 text-slate-300 px-3 py-2 rounded-r-lg hover:bg-slate-600 transition-colors"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                        </div>
                    ))}
                    
                    {formErrors.contracts[0] && (
                      <p className="mt-1 text-red-400 text-sm">{formErrors.contracts[0]}</p>
                    )}
                    <p className="mt-1 text-slate-400 text-sm">
                      Add Ethereum-compatible contract addresses associated with your project
                    </p>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-lg p-4 mt-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-300 text-sm">
                          <span className="font-medium text-white">Important:</span> Only add verified contracts that are part of your project. Contract addresses must be valid Ethereum-format addresses (0x followed by 40 hexadecimal characters).
                        </p>
                        <p className="text-slate-400 text-sm mt-2">
                          These contracts will be publicly linked to your project and visible to all users.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-slate-700/30 rounded-lg p-4 mt-8 mb-6">
                <p className="text-slate-300 text-sm">
                  Your project will be submitted to campaign: <span className="text-lime-400 font-medium">{campaign.name}</span>. 
                  Once submitted, it will need to be approved by the campaign admin before it appears in the list of projects.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isWritePending || isWaitingForTx || !isConnected}
                  className="flex-1 py-3 px-6 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:bg-slate-500 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {isWritePending || isWaitingForTx ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isWritePending ? 'Preparing Submission...' : 'Submitting...'}
                    </div>
                  ) : (
                    'Submit Project'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                  className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              {!isConnected && (
                <p className="mt-3 text-yellow-400 text-center">
                  Please connect your wallet to submit a project
                </p>
              )}
              
              <p className="mt-4 text-center text-slate-400 text-sm">
                By submitting this project, you agree to pay the {PROJECT_CREATION_FEE} CELO submission fee
              </p>
            </form>
          </div>
        </div>
      </div>
      
      {/* Media Preview Modal */}
      {showMediaPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl p-6 relative">
            <button
              onClick={() => setShowMediaPreview(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4">
              {previewType === 'image' ? 'Logo Preview' : 'Demo Video Preview'}
            </h3>
            
            <div className="flex items-center justify-center bg-slate-900 rounded-lg p-4 min-h-[300px]">
              {previewType === 'image' ? (
                <img 
                  src={previewUrl} 
                  alt="Project Logo" 
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
              <p className="text-slate-400 text-sm break-all">{previewUrl}</p>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowMediaPreview(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
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