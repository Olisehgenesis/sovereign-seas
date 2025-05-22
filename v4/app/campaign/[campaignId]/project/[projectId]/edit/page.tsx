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
  Lock,
  Edit,
  Hash
} from 'lucide-react';
import { useSovereignSeas } from '../../../../../../hooks/useSovereignSeas';
import { ParamValue } from 'next/dist/server/request/params';

export default function EditProject() {
  const router = useRouter();
  const { campaignId, projectId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Project form state
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
  
  // Campaign and project data
  const [campaign, setCampaign] = useState<any>(null);
  const [originalProject, setOriginalProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [hasVotes, setHasVotes] = useState(false);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    github: '',
    social: '',
    logo: '',
    contracts: [''],
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'media', 'contracts'
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    updateProject,
    formatCampaignTime,
    isCampaignAdmin,
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
    if (isInitialized && campaignId && projectId) {
      loadCampaignAndProject();
    }
  }, [isInitialized, campaignId, projectId, address]);
  
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
      setErrorMessage(`Error updating project: ${writeError.message || 'Please try again later.'}`);
      resetWrite();
    }
  }, [writeError, resetWrite]);
  
  // Redirect on successful update
  useEffect(() => {
    if (isTxSuccess) {
      setSuccessMessage('Project updated successfully! Redirecting to project page...');
      
      // Redirect after a delay
      const timer = setTimeout(() => {
        router.push(`/campaign/${campaignId}/project/${projectId}`);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isTxSuccess, campaignId, projectId, router]);
  
  const loadCampaignAndProject = async () => {
    setLoading(true);
    try {
      // Load all campaigns
      const allCampaigns = await loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          
          // Load project data
          const projects = await loadProjects(Number(campaignId));
          const projectData = projects.find((p: { id: { toString: () => ParamValue; }; }) => p.id.toString() === projectId);
          
          if (projectData) {
            setOriginalProject(projectData);
            
            // Check if project has votes (restricts what can be edited)
            setHasVotes(projectData.voteCount > 0 && projectData.approved);
            
            // Format contract addresses for the form
            let contractList = projectData.contracts;
            if (!contractList || contractList.length === 0) {
              contractList = [''];
            }
            
            // Set form data
            setProject({
              name: projectData.name,
              description: projectData.description,
              githubLink: projectData.githubLink,
              socialLink: projectData.socialLink,
              testingLink: projectData.testingLink,
              logo: projectData.logo,
              demoVideo: projectData.demoVideo,
              contracts: contractList,
            });
            
            // Check if user is authorized to edit
            const isAdmin = await isCampaignAdmin(Number(campaignId));
            const isOwner = address && address.toLowerCase() === projectData.owner.toLowerCase();
            
            if (isAdmin || isOwner) {
              setAuthorized(true);
            } else {
              setErrorMessage('You do not have permission to edit this project.');
            }
          } else {
            setErrorMessage('Project not found');
          }
        } else {
          setErrorMessage('Campaign not found');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Error loading project data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = () => {
    let isValid = true;
    const errors = {
      name: '',
      description: '',
      github: '',
      social: '',
      logo: '',
      contracts: [''],
    };
    
    // If project has votes and is approved, some fields cannot be edited
    if (!hasVotes) {
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
    }

    // Validate GitHub link (now required)
    if (!project.githubLink.trim()) {
      errors.github = 'GitHub repository link is required';
      isValid = false;
    }

    // Validate Karma Gap link (now required)
    if (!project.socialLink.trim()) {
      errors.social = 'Karma Gap project link is required';
      isValid = false;
    }
    
    // Validate URLs if provided
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+|localhost)(:[0-9]{1,5})?(\.[a-z.]{2,6})?(\/[\w .-]*)*\/?$/;

    
    if (project.githubLink && !urlRegex.test(project.githubLink)) {
      errors.github = 'Please enter a valid GitHub URL';
      isValid = false;
    }
    
    if (project.socialLink && !urlRegex.test(project.socialLink)) {
      errors.social = 'Please enter a valid Karma Gap URL';
      isValid = false;
    }
    
    if (project.logo && !urlRegex.test(project.logo)) {
      errors.logo = 'Please enter a valid logo URL';
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
      setErrorMessage('Please connect your wallet to edit this project');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Filter out empty contract addresses
      const contracts = project.contracts.filter(c => c.trim() !== '');
      
      await updateProject(
        Number(campaignId),
        Number(projectId),
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
      console.error('Error updating project:', error);
      setErrorMessage('Error updating project. Please try again later.');
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    // If project has votes and is approved, only allow editing certain fields
    if (hasVotes && (field === 'name' || field === 'description')) {
      return;
    }
    
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-lg text-emerald-600">Loading project data...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign || !originalProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-3 text-gray-800">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
          >
            Back to Campaign
          </button>
        </div>
      </div>
    );
  }
  
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200">
          <Lock className="h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-3 text-gray-800">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to edit this project. Only the project owner or campaign administrators can make changes.</p>
          <button
            onClick={() => router.push(`/campaign/${campaignId}/project/${projectId}`)}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
          >
            View Project
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
          onClick={() => router.push(`/campaign/${campaignId}/project/${projectId}`)}
          className="inline-flex items-center text-gray-600 hover:text-emerald-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </button>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center tilt-neon text-gray-800">
            <Edit className="h-7 w-7 text-emerald-500 mr-2" />
            Edit Project
          </h1>
          <p className="text-gray-600 mt-1">Campaign: {campaign.name}</p>
        </div>

        {hasVotes && (
          <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200 relative shadow-sm">
            <div className="flex items-start">
              <Info className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-700 flex items-center">
                  Limited Editing Mode
                </h3>
                <p className="text-amber-700 mt-1">
                  This project already has votes, so name and description cannot be changed. You can still update links, media, and contract addresses.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-xl border border-gray-200 mb-6 shadow-md overflow-hidden">
          {/* Success message */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mx-6 mt-6 flex items-start shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700">{successMessage}</p>
            </div>
          )}
          
          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mx-6 mt-6 flex items-start shadow-sm">
              <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}
          
          {/* Form Tabs */}
          <div className="flex border-b border-gray-200 px-6 mt-6">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'basic' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'media' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'contracts' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Contracts
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="px-6 pt-6 pb-4">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-emerald-700 font-medium mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 ${hasVotes ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="Enter project name"
                    disabled={hasVotes}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-red-500 text-sm">{formErrors.name}</p>
                  )}
                  {hasVotes && (
                    <p className="mt-1 text-amber-600 text-sm">Project name cannot be changed once it has received votes</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-emerald-700 font-medium mb-2">Description *</label>
                  <textarea
                    value={project.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={5}
                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 ${hasVotes ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="Describe your project in detail. What problem does it solve?"
                    disabled={hasVotes}
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-red-500 text-sm">{formErrors.description}</p>
                  )}
                  {hasVotes ? (
                    <p className="mt-1 text-amber-600 text-sm">Description cannot be changed once the project has received votes</p>
                  ) : (
                    <p className="mt-1 text-gray-500 text-sm">Minimum 20 characters</p>
                  )}
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
                    Karma Gap Project Link *
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
            
            {/* Media Tab */}
            {activeTab === 'media' && (
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
                    Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={project.logo}
                    onChange={(e) => handleInputChange('logo', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                    placeholder="https://example.com/logo.png or IPFS hash"
                  />
                  {formErrors.logo && (
                    <p className="mt-1 text-red-500 text-sm">{formErrors.logo}</p>
                  )}
                  <p className="mt-1 text-gray-500 text-sm">Add your project logo (URL to an image file)</p>
                  
                  {project.logo && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => openMediaPreview('image', project.logo)}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs hover:bg-emerald-200 transition-colors inline-flex items-center border border-emerald-200 shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Preview Logo
                      </button>
                    </div>
                  )}
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
            
            {/* Contracts Tab */}
            {activeTab === 'contracts' && (
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
              
              <div className="mt-8 mb-2">
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isWritePending || isWaitingForTx || !isConnected}
                    className="flex-1 py-2.5 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-full hover:from-teal-600 hover:to-emerald-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm"
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
                    onClick={() => router.push(`/campaign/${campaignId}/project/${projectId}`)}
                    className="py-2.5 px-6 bg-white text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
                
                {!isConnected && (
                  <p className="mt-3 text-amber-600 text-center">
                    Please connect your wallet to edit this project
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Media Preview Modal */}
      {showMediaPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                src={previewUrl || ''} 
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
                    src={previewUrl || ''}
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
};