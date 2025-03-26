'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  ArrowRight,
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
  Shield,
  Hash,
  CheckIcon
} from 'lucide-react';
import { useSovereignSeas, PROJECT_CREATION_FEE } from '../../../../hooks/useSovereignSeas';
import { uploadToIPFS } from '@/app/utils/imageUtils';


export default function SubmitProject() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  
  // Form stages (1: Basic Info, 2: Media, 3: Contracts, 4: Review & Submit)
  const [currentStage, setCurrentStage] = useState(1);
  const totalStages = 4;
  
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
    github: '',
    social: '',
    // logo: '',
    demoVideo: '',
    contracts: [''],

  });
  
  // UI state
  const [urlPreview, setUrlPreview] = useState({
    logo: null,
    demoVideo: null,
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
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
  } = useSovereignSeas();
  
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
  
  const validateBasicInfo = () => {
    let isValid = true;
    const errors = {
      ...formErrors,
      name: '',
      description: '',
      github: '',
      social: '',
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
    if (!project.githubLink.trim()) {
      errors.github = 'GitHub repository link is required';
      isValid = false;
    }
    if (!project.socialLink.trim()) {
      errors.social = 'Karma Gap project link is required';
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
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateMedia = () => {
    let isValid = true;
    const errors = {
      ...formErrors,
      // logo: '',
      demoVideo: '',
    };
    
    // Validate URLs if provided
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    // Skip validation if it's a file selection placeholder
  
    
  
    if (project.demoVideo && !urlRegex.test(project.demoVideo)) {
      errors.demoVideo = 'Please enter a valid demo video URL';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateContracts = () => {
    let isValid = true;
    const errors = {
      ...formErrors,
      contracts: [...formErrors.contracts],
    };
    
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
  
  const validateAllSteps = () => {
    const isBasicValid = validateBasicInfo();
    const isMediaValid = validateMedia();
    const isContractsValid = validateContracts();
    
    return isBasicValid && isMediaValid && isContractsValid;
  };
  
  const handleNext = () => {
    if (currentStage === 1 && !validateBasicInfo()) return;
    if (currentStage === 2 && !validateMedia()) return;
    if (currentStage === 3 && !validateContracts()) return;
    
    if (currentStage < totalStages) {
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
  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to submit a project');
      return;
    }
    
    if (!validateAllSteps()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a copy of the project data to work with
      const projectData = {...project};
      
      // Upload logo if a file was selected - use the stored file object instead of trying to get it from the ref
      if (projectData.logo && projectData.logo.startsWith('File selected:') && logoFile) {
        setIsUploadingLogo(true);
        
        try {
          console.log('Uploading logo file:', logoFile.name);
          
          const logoIpfsUrl = await uploadToIPFS(logoFile); // Use the stored file
          console.log('IPFS upload result:', logoIpfsUrl);
          
          if (!logoIpfsUrl) {
            throw new Error('Failed to get IPFS URL');
          }
          
          projectData.logo = logoIpfsUrl;
          console.log('Logo uploaded to IPFS:', logoIpfsUrl);
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
          if (uploadError instanceof Error) {
            setErrorMessage(`Failed to upload logo: ${uploadError.message || 'Unknown error'}`);
          } else {
            setErrorMessage('Failed to upload logo: Unknown error');
          }
          setLoading(false);
          setIsUploadingLogo(false);
          return;
        }
        
        setIsUploadingLogo(false);
      } else if (projectData.logo.startsWith('File selected:')) {
        // If there's a file reference but no actual file, handle the error
        setErrorMessage('File reference exists but no file was found. Please re-select your logo file.');
        setLoading(false);
        return;
      }
      // Filter out empty contract addresses
      const contracts = projectData.contracts.filter(c => c.trim() !== '');
      
      console.log('Submitting project with data:', {
        campaignId: Number(campaignId),
        name: projectData.name,
        logo: projectData.logo,
        // other fields...
      });
      
      // Submit the project with the updated data
      await submitProject(
        Number(campaignId),
        projectData.name,
        projectData.description,
        projectData.githubLink,
        projectData.socialLink,
        projectData.testingLink,
        projectData.logo,
        projectData.demoVideo,
        contracts
      );
    } catch (error) {
      console.error('Error submitting project:', error);
      if (error instanceof Error) {
        setErrorMessage(`Error submitting project: ${error.message || 'Please try again'}`);
      } else {
        setErrorMessage('Error submitting project: Please try again');
      }
      setLoading(false);
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
      // logo: '',
      github: '',
      social: '',
      demoVideo: '',
      contracts: [''],

    });
    setCurrentStage(1);
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
  
  
  // Get stage title
  const getStageTitle = (stage: number) => {
    switch (stage) {
      case 1: return "Basic Information";
      case 2: return "Media Content";
      case 3: return "Smart Contracts";
      case 4: return "Review & Submit";
      default: return "";
    }
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
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-3 text-gray-800">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
              className="inline-flex items-center text-gray-600 hover:text-emerald-600 mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center shadow-md">
              <Info className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-3 text-gray-800">Campaign Has Ended</h1>
              <p className="text-gray-600 mb-6">
                This campaign has ended and is no longer accepting project submissions.
              </p>
              <button
                onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-gray-600 hover:text-emerald-600 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center tilt-neon text-gray-800">
              <Hash className="h-7 w-7 text-emerald-500 mr-2" />
              Submit Project to Campaign
            </h1>
            <p className="text-gray-600 mt-1">{campaign.name}</p>
          </div>

          {/* Fee Notice */}
          <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200 relative shadow-sm">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-700 flex items-center">
                  Project Submission Fee Required
                  <button 
                    type="button" 
                    onClick={() => setShowFeeTooltip(!showFeeTooltip)}
                    className="text-amber-500 hover:text-amber-600 ml-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </h3>
                <p className="text-amber-700 mt-1">
                  A fee of <span className="font-semibold">{PROJECT_CREATION_FEE} CELO</span> will be charged to submit this project. 
                </p>
                <p className="text-amber-600 text-sm mt-2">
                  Admins are exempt from this fee.
                </p>
                <p className="text-amber-600 text-sm mt-2">
                  This fee helps prevent spam submissions and ensures project quality.
                </p>
                
                {showFeeTooltip && (
                  <div className="absolute right-4 top-4 w-64 p-3 bg-white rounded-xl shadow-lg z-10 text-sm border border-amber-200">
                    <p className="text-amber-700">
                      Submission fees are collected to prevent spam and ensure only quality projects are submitted. These fees support platform maintenance and development.
                    </p>
                    <button 
                      type="button" 
                      className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowFeeTooltip(false)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 mb-6 shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                {hasStarted ? (
                  <div className="flex items-center text-amber-600 text-sm bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 shadow-sm">
                    <Clock className="h-4 w-4 mr-1.5" />
                    <span className="font-medium">⏳ Time Remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {Math.floor((Number(campaign.endTime) - now) % 60)}s</span>
                  </div>
                ) : (
                  <div className="flex items-center text-blue-600 text-sm bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    <span className="font-medium">🚀 Campaign launches in: {Math.floor((Number(campaign.startTime) - now) / 86400)}d {Math.floor(((Number(campaign.startTime) - now) % 86400) / 3600)}h {Math.floor(((Number(campaign.startTime) - now) % 3600) / 60)}m {Math.floor((Number(campaign.startTime) - now) % 60)}s</span>
                  </div>
                )}
              </div>
              
              {!hasStarted && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2 flex items-start shadow-sm">
                  <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-700">
                    This campaign hasn't started yet, but you can submit your project early! Your project will need approval from the campaign admin before it appears in the list of projects.
                  </p>
                </div>
              )}
              
              {/* Success message */}
              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-2 flex items-start shadow-sm">
                  <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700">{successMessage}</p>
                </div>
              )}
              
              {/* Error message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-2 flex items-start shadow-sm">
                  <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">{errorMessage}</p>
                </div>
              )}
            </div>
            
            {/* Progress Steps */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex justify-between mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStage === step 
                        ? 'bg-emerald-500 text-white' 
                        : currentStage > step 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-gray-100 text-gray-400'
                    } transition-colors duration-300`}>
                      {currentStage > step ? <CheckIcon className="h-5 w-5" /> : step}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${
                      currentStage === step 
                        ? 'text-emerald-600' 
                        : currentStage > step 
                          ? 'text-emerald-700' 
                          : 'text-gray-500'
                    }`}>
                      Step {step}
                    </div>
                    <div className={`text-xs ${
                      currentStage === step 
                        ? 'text-emerald-600' 
                        : 'text-gray-500'
                    }`}>
                      {getStageTitle(step)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="relative mb-6">
                <div className="h-1 bg-gray-200 rounded-full absolute top-0 left-0 right-0"></div>
                <div 
                  className="h-1 bg-emerald-500 rounded-full absolute top-0 left-0 transition-all duration-500" 
                  style={{ width: `${(currentStage / totalStages) * 100}%` }}
                ></div>
              </div>
              
              <h2 className="text-xl font-semibold text-emerald-700 mb-6">
                Step {currentStage}: {getStageTitle(currentStage)}
              </h2>
              
              <form onSubmit={handleSubmit}>
                {/* Stage 1: Basic Info */}
                {currentStage === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-emerald-700 font-medium mb-2">Project Name *</label>
                      <input
                        type="text"
                        value={project.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                        placeholder="Enter project name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-emerald-700 font-medium mb-2">Description *</label>
                      <textarea
                        value={project.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={5}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                        placeholder="Describe your project in detail. What problem does it solve?"
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.description}</p>
                      )}
                      <p className="mt-1 text-gray-500 text-sm">Minimum 20 characters</p>
                    </div>
                    
                    <div>
                      <label className="block text-emerald-700 font-medium mb-2 flex items-center">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub Repository *
                      </label>
                      <input
                        type="url"
                        required={true}
                        value={project.githubLink}
                        onChange={(e) => handleInputChange('githubLink', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                        placeholder="https://github.com/yourusername/yourproject"
                      />
                      <p className="mt-1 text-gray-500 text-sm">Link to your project's GitHub repository</p>
                      {formErrors.github && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.github}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-emerald-700 font-medium mb-2 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Karma Gap  Project Link*
                      </label>
                      <input
                        type="url"
                        value={project.socialLink}
                        required={true}
                        onChange={(e) => handleInputChange('socialLink', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                        placeholder="https://gap.karmahq.xyz/project/sovereign-seas"
                      />
                      <p className="mt-1 text-gray-500 text-sm">Link to your project's Karma Gap page</p>
                      {formErrors.social && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.social}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-emerald-700 font-medium mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Demo/Testing Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={project.testingLink}
                        onChange={(e) => handleInputChange('testingLink', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                        placeholder="https://demo.yourproject.com"
                      />
                      <p className="mt-1 text-gray-500 text-sm">Link to a demo or testing version of your project</p>
                    </div>
                  </div>
                )}
                
                {/* Stage 2: Media Content */}
                {currentStage === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                      <h3 className="text-lg font-medium text-emerald-700">Media Content</h3>
                      <div className="flex items-center text-sm text-gray-500">
                      <Info className="h-3.5 w-3.5 mr-2" />
                        Project media enhances visibility
                      </div>
                    </div>
                    <div>
  <label className="block text-emerald-700 font-medium mb-2 flex items-center">
    <ImageIcon className="h-4 w-4 mr-2" />
    Logo (Upload an image)
  </label>
  
  <div className="flex items-center space-x-3">
  <input
  type="file"
  ref={logoFileInputRef}
  accept="image/*"
  onChange={(e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file); // Store the actual file object
      setProject({
        ...project,
        logo: `File selected: ${file.name}`
      });
    }
  }}
  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
/>
    
    {project.logo && (
      <button
      type="button"
      onClick={() => {
        // Clear the file input and logo state
        if (logoFileInputRef.current) {
          logoFileInputRef.current.value = '';
        }
        setLogoFile(null); // Clear the file object
        setProject({
          ...project,
          logo: ''
        });
      }}
      className="bg-gray-100 text-gray-600 p-2.5 rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
    >
      <X className="h-4 w-4" />
    </button>
    )}
  </div>
  
  {project.logo && (
    <div className="mt-2 text-sm text-emerald-600 flex items-center">
      <CheckIcon className="h-4 w-4 mr-1" />
      {project.logo.replace('File selected: ', '')}
    </div>
  )}
  
  <p className="mt-1 text-gray-500 text-sm">Upload a logo image for your project</p>
</div>


                    
                    
                    
                    <div>
                      <label className="block text-emerald-700 font-medium mb-2 flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        Demo Video URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={project.demoVideo}
                        onChange={(e) => handleInputChange('demoVideo', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                        placeholder="https://example.com/demo.mp4 or IPFS hash"
                      />
                      {formErrors.demoVideo && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.demoVideo}</p>
                      )}
                      <p className="mt-1 text-gray-500 text-sm">Add a video demonstrating your project</p>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4 mt-4 border border-blue-100 shadow-sm">
                      <div className="flex items-start">
                        <HelpCircle className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-700 text-sm">
                            <span className="font-medium text-blue-800">Media Tips:</span> Adding visual content significantly increases engagement with your project. Upload your media to a hosting service or IPFS and paste the URL here.
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
                
                {/* Stage 3: Contracts */}
                {currentStage === 3 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                      <h3 className="text-lg font-medium text-emerald-700">Smart Contracts</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Info className="h-3.5 w-3.5 mr-2" />
                        Add project contracts
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="flex justify-between items-center text-emerald-700 font-medium mb-3">
                        <span className="flex items-center">
                          <Code className="h-4 w-4 mr-2" />
                          Contract Addresses (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={handleAddContract}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs hover:bg-emerald-200 transition-colors inline-flex items-center border border-emerald-200 shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Contract
                        </button>
                      </label>
                      
                      {project.contracts.map((contract, index) => (
                        <div key={index} className="flex mb-3">
                          <input
                            type="text"
                            value={contract}
                            onChange={(e) => handleContractChange(index, e.target.value)}
                            className="flex-grow px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 font-mono"
                            placeholder="0x..."
                          />
                          {project.contracts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveContract(index)}
                              className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {formErrors.contracts[0] && (
                        <p className="mt-1 text-red-500 text-sm">{formErrors.contracts[0]}</p>
                      )}
                      <p className="mt-1 text-gray-500 text-sm">
                        Add Ethereum-compatible contract addresses associated with your project
                      </p>
                    </div>
                    
                    <div className="bg-amber-50 rounded-xl p-4 mt-4 border border-amber-100 shadow-sm">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-700 text-sm">
                            <span className="font-medium text-amber-800">Important:</span> Only add verified contracts that are part of your project. Contract addresses must be valid Ethereum-format addresses (0x followed by 40 hexadecimal characters).
                          </p>
                          <p className="text-amber-600 text-sm mt-2">
                            These contracts will be publicly linked to your project and visible to all users.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Stage 4: Review & Submit */}
                {currentStage === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                      <h3 className="text-lg font-medium text-emerald-700">Project Summary</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Info className="h-3.5 w-3.5 mr-2" />
                        Review your submission
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-3">Basic Information</h4>
                      <div className="space-y-2">
                        <div className="flex">
                          <span className="font-medium text-gray-600 w-32">Project Name:</span>
                          <span className="text-gray-800">{project.name}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-600 mb-1">Description:</span>
                          <p className="text-gray-800 text-sm bg-white p-3 rounded-lg border border-gray-100">{project.description}</p>
                        </div>
                        {project.githubLink && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-32">GitHub:</span>
                            <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 truncate">{project.githubLink}</a>
                          </div>
                        )}
                        {project.socialLink && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-32">Project Karma GAP link:</span>
                            <a href={project.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 truncate">{project.socialLink}</a>
                          </div>
                        )}
                        {project.testingLink && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-32">Demo/Testing:</span>
                            <a href={project.testingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 truncate">{project.testingLink}</a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-3">Media Content</h4>
                      <div className="space-y-2">
                      {project.logo ? (
  <div className="flex items-center">
    <span className="font-medium text-gray-600 w-32">Logo:</span>
    {project.logo.startsWith('File selected:') ? (
      <span className="text-gray-700">
        {project.logo} (Will be uploaded on submission)
      </span>
    ) : (
      <button
        type="button"
        onClick={() => openMediaPreview('image', project.logo)}
        className="text-blue-600 hover:text-blue-700 flex items-center"
      >
        <Eye className="h-4 w-4 mr-1" /> View Logo
      </button>
    )}
  </div>
) : (
  <div className="flex">
    <span className="font-medium text-gray-600 w-32">Logo:</span>
    <span className="text-gray-500">None provided</span>
  </div>
)}
                        
                        {project.demoVideo ? (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-32">Demo Video:</span>
                            <button
                              type="button"
                              onClick={() => openMediaPreview('video', project.demoVideo)}
                              className="text-blue-600 hover:text-blue-700 flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" /> View Demo Video
                            </button>
                          </div>
                        ) : (
                          <div className="flex">
                            <span className="font-medium text-gray-600 w-32">Demo Video:</span>
                            <span className="text-gray-500">None provided</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-3">Smart Contracts</h4>
                      <div className="space-y-2">
                        {project.contracts.some(c => c.trim() !== '') ? (
                          project.contracts.filter(c => c.trim() !== '').map((contract, idx) => (
                            <div key={idx} className="font-mono text-sm bg-white p-2 rounded-lg border border-gray-100">
                              {contract}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500">No contracts provided</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-sm">
                      <div className="flex items-start">
                        <Shield className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-700 text-sm">
                            <span className="font-medium">Submission Fee:</span> A fee of {PROJECT_CREATION_FEE} CELO will be charged when you submit this project. Please ensure you have sufficient funds in your wallet.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 shadow-sm">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="text-emerald-700 text-sm">
                          Your project will be submitted to campaign: <span className="font-medium">{campaign.name}</span>. 
                          Once submitted, it will need to be approved by the campaign admin before it appears in the list of projects.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 mb-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className={`px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-colors shadow-sm flex items-center ${currentStage === 1 ? 'invisible' : ''}`}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  
                  {currentStage < totalStages ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-5 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm flex items-center"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isWritePending || isWaitingForTx || !isConnected}
                      className="px-5 py-2.5 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md flex items-center"
                    >
                      {isWritePending || isWaitingForTx ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          {isWritePending ? 'Preparing...' : 'Submitting...'}
                        </div>
                      ) : (
                        <>
                          Submit Project
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {!isConnected && currentStage === totalStages && (
                  <p className="mt-3 text-amber-600 text-center">
                    Please connect your wallet to submit a project
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Media Preview Modal */}
      {showMediaPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative shadow-lg">
            <button
              onClick={() => setShowMediaPreview(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {previewType === 'image' ? 'Logo Preview' : 'Demo Video Preview'}
            </h3>
            
            <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4 min-h-[300px] border border-gray-200">
              {previewType === 'image' ? (
                <img 
                  src={previewUrl} 
                  alt="Project Logo" 
                  className="max-w-full max-h-[400px] object-contain rounded-lg"
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
                    className="max-w-full max-h-[400px] mx-auto rounded-lg"
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
                onClick={() => setShowMediaPreview(false)}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
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