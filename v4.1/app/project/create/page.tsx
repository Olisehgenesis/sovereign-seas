'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  ArrowRight,
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
  Briefcase
} from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjectMethods';
import { uploadToIPFS } from '@/app/utils/imageUtils';
import { Address } from 'viem';

export default function CreateProject() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Form stages: 1: Basic Info, 2: Media & Links, 3: Team & Technical, 4: Review & Submit
  const [currentStage, setCurrentStage] = useState(1);
  const totalStages = 4;
  
  // File handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Main project state
  const [project, setProject] = useState({
    // Basic Information
    name: '',
    tagline: '',
    description: '',
    category: '',
    tags: [''],
    location: '',
    establishedDate: '',
    website: '',
    
    // Media & Links
    logo: '',
    demoVideo: '',
    demoUrl: '',
    
    // Repository & Technical Links
    githubRepo: '',
    documentation: '',
    
    // Social Media Links
    twitter: '',
    linkedin: '',
    discord: '',
    telegram: '',
    
    // Team & Contact Information
    teamMembers: [{
      name: '',
      role: '',
      email: '',
      linkedin: '',
      twitter: ''
    }],
    contactEmail: '',
    
    // Technical Details
    techStack: [''],
    blockchain: '',
    smartContracts: [''],
    license: '',
    developmentStage: '',
    
    // Features & Innovation
    keyFeatures: [''],
    innovation: '',
    useCases: [''],
    targetAudience: '',
    
    // Project Status
    status: 'active',
    projectType: 'dapp',
    maturityLevel: 'early',
    openSource: true,
    transferrable: true
  });

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;
  
  // Hook integration
  const {
    createProject: createProjectHook,
    isPending,
    isError,
    error,
    isSuccess
  } = useCreateProject(contractAddress as Address);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    tagline: '',
    description: '',
    category: '',
    githubRepo: '',
    contactEmail: '',
    techStack: [''],
    keyFeatures: ['']
  });
  
  // Preview modal state
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle write errors
  useEffect(() => {
    if (error) {
      setErrorMessage(`Error creating project: ${error.message || 'Please try again later.'}`);
    }
  }, [error]);
  
  // Handle successful transaction
  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Project created successfully! Redirecting...');
      
      setTimeout(() => {
        router.push('/projects');
      }, 3000);
    }
  }, [isSuccess, router]);
  
  // Categories and options
  const categories = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 'Other'
  ];
  
  const blockchains = [
    'Celo', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche',
    'Solana', 'Near', 'Cosmos', 'Polkadot', 'Cardano', 'Multi-chain', 'Other'
  ];
  
  const techStackOptions = [
    'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Node.js', 'Python', 'Rust',
    'Solidity', 'Go', 'TypeScript', 'JavaScript', 'Web3.js', 'Ethers.js', 'Wagmi',
    'Hardhat', 'Foundry', 'Truffle', 'IPFS', 'PostgreSQL', 'MongoDB', 'Redis'
  ];
  
  const licenses = [
    'MIT', 'Apache 2.0', 'GPL v3', 'GPL v2', 'BSD 3-Clause', 'BSD 2-Clause',
    'MPL 2.0', 'LGPL v3', 'AGPL v3', 'ISC', 'Unlicense', 'Proprietary', 'Other'
  ];
  
  const developmentStages = [
    'Concept', 'Design', 'Development', 'Testing', 'Beta', 'Production', 'Maintenance'
  ];
  
  // Validation functions
  const validateBasicInfo = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    if (!project.name.trim()) {
      errors.name = 'Project name is required';
      isValid = false;
    } else {
      errors.name = '';
    }
    
    if (!project.tagline.trim()) {
      errors.tagline = 'Project tagline is required';
      isValid = false;
    } else {
      errors.tagline = '';
    }
    
    if (!project.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    } else if (project.description.trim().length < 50) {
      errors.description = 'Description must be at least 50 characters long';
      isValid = false;
    } else {
      errors.description = '';
    }
    
    if (!project.category) {
      errors.category = 'Category is required';
      isValid = false;
    } else {
      errors.category = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateMediaLinks = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    
    if (project.githubRepo && !urlRegex.test(project.githubRepo)) {
      errors.githubRepo = 'Please enter a valid GitHub URL';
      isValid = false;
    } else {
      errors.githubRepo = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateTeamTechnical = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!project.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required';
      isValid = false;
    } else if (!emailRegex.test(project.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
      isValid = false;
    } else {
      errors.contactEmail = '';
    }
    
    const validTechStack = project.techStack.filter(tech => tech.trim() !== '');
    if (validTechStack.length === 0) {
      errors.techStack = ['At least one technology is required'];
      isValid = false;
    } else {
      errors.techStack = [''];
    }
    
    const validFeatures = project.keyFeatures.filter(feature => feature.trim() !== '');
    if (validFeatures.length === 0) {
      errors.keyFeatures = ['At least one key feature is required'];
      isValid = false;
    } else {
      errors.keyFeatures = [''];
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateAllSteps = () => {
    return validateBasicInfo() && validateMediaLinks() && validateTeamTechnical();
  };
  
  // Navigation functions
  const handleNext = () => {
    let canProceed = false;
    
    switch (currentStage) {
      case 1:
        canProceed = validateBasicInfo();
        break;
      case 2:
        canProceed = validateMediaLinks();
        break;
      case 3:
        canProceed = validateTeamTechnical();
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
    setProject({
      ...project,
      [field]: [...(project[field as keyof typeof project] as any[]), defaultValue]
    });
  };
  
  const removeArrayItem = (field: string, index: number) => {
    const array = project[field as keyof typeof project] as any[];
    if (array.length <= 1) return;
    
    const updated = [...array];
    updated.splice(index, 1);
    setProject({
      ...project,
      [field]: updated
    });
  };
  
  const updateArrayItem = (field: string, index: number, value: any) => {
    const array = project[field as keyof typeof project] as any[];
    const updated = [...array];
    updated[index] = value;
    setProject({
      ...project,
      [field]: updated
    });
  };
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    
    if (currentStage !== totalStages) {
      handleNext();
      return;
    }
    
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to create a project');
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
      const projectData = { ...project };
      
      if (logoFile) {
        const logoIpfsUrl = await uploadToIPFS(logoFile);
        projectData.logo = logoIpfsUrl;
      }
      
      if (demoVideoFile) {
        const videoIpfsUrl = await uploadToIPFS(demoVideoFile);
        projectData.demoVideo = videoIpfsUrl;
      }
      
      // Filter out empty values
      projectData.techStack = projectData.techStack.filter(tech => tech.trim() !== '');
      projectData.keyFeatures = projectData.keyFeatures.filter(feature => feature.trim() !== '');
      projectData.useCases = projectData.useCases.filter(useCase => useCase.trim() !== '');
      projectData.tags = projectData.tags.filter(tag => tag.trim() !== '');
      projectData.smartContracts = projectData.smartContracts.filter(contract => contract.trim() !== '');
      projectData.teamMembers = projectData.teamMembers.filter(member => member.name.trim() !== '');
      
      // Create metadata JSON
      const metadata = {
        version: '1.0.0',
        timestamp: Date.now(),
        creator: address,
        ...projectData
      };
      
      const metadataString = JSON.stringify(metadata);
      
      setIsUploading(false);
      
      // Call the hook function
      await createProjectHook({
        name: projectData.name,
        description: projectData.description,
        bio: projectData.tagline,
        contractInfo: metadataString,
        additionalData: JSON.stringify({
          category: projectData.category,
          techStack: projectData.techStack,
          features: projectData.keyFeatures,
          links: {
            github: projectData.githubRepo,
            website: projectData.website,
            demo: projectData.demoUrl
          }
        }),
        contracts: projectData.smartContracts,
        transferrable: projectData.transferrable
      });
      
    } catch (error) {
      console.error('Error creating project:', error);
      setErrorMessage('Failed to create project. Please try again.');
      setLoading(false);
      setIsUploading(false);
    }
  };
  
  const getStageTitle = (stage: number) => {
    switch (stage) {
      case 1: return "Basic Information";
      case 2: return "Media & Links";
      case 3: return "Team & Technical";
      case 4: return "Review & Submit";
      default: return "";
    }
  };
  
  const getStageDescription = (stage: number) => {
    switch (stage) {
      case 1: return "Tell us about your project fundamentals";
      case 2: return "Add media content and important links";
      case 3: return "Team details and technical specifications";
      case 4: return "Review everything before submission";
      default: return "";
    }
  };
  
  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-ss-sky-light py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-ss shadow-ss-card p-6 sm:p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/projects')}
              className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </button>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 animate-float">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 mb-4">
                Create Your Project
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Showcase your innovation to the world. Build your comprehensive project profile 
                with rich media, detailed specifications, and professional presentation.
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
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100 mb-8 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex justify-between mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStage === step 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                        : currentStage > step 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentStage > step ? <CheckIcon className="h-5 w-5" /> : step}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${
                      currentStage === step 
                        ? 'text-blue-600' 
                        : currentStage > step 
                          ? 'text-blue-700' 
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
                  className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full absolute top-0 left-0 transition-all duration-700" 
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
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-blue-100 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10 p-8">
              <form onSubmit={handleSubmit}>
                {/* Stage 1: Basic Information */}
                {currentStage === 1 && (
                  <div className="space-y-8">
                    {/* Project Name & Tagline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Hash className="h-4 w-4 mr-2" />
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={project.name}
                          onChange={(e) => setProject({...project, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="Enter your project name"
                        />
                        {formErrors.name && <p className="mt-2 text-red-500 text-sm">{formErrors.name}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Star className="h-4 w-4 mr-2" />
                          Tagline *
                        </label>
                        <input
                          type="text"
                          value={project.tagline}
                          onChange={(e) => setProject({...project, tagline: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="Brief, catchy description"
                        />
                        {formErrors.tagline && <p className="mt-2 text-red-500 text-sm">{formErrors.tagline}</p>}
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label className="block text-blue-700 font-medium mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Project Description *
                      </label>
                      <textarea
                        value={project.description}
                        onChange={(e) => setProject({...project, description: e.target.value})}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        placeholder="Provide a comprehensive description of your project, its purpose, and value proposition..."
                      />
                      {formErrors.description && <p className="mt-2 text-red-500 text-sm">{formErrors.description}</p>}
                      <p className="mt-2 text-gray-500 text-sm">Minimum 50 characters • {project.description.length} characters</p>
                    </div>
                    
                    {/* Category & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Tag className="h-4 w-4 mr-2" />
                          Category *
                        </label>
                        <select
                          value={project.category}
                          onChange={(e) => setProject({...project, category: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        >
                          <option value="">Select category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        {formErrors.category && <p className="mt-2 text-red-500 text-sm">{formErrors.category}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Project Type
                        </label>
                        <select
                          value={project.projectType}
                          onChange={(e) => setProject({...project, projectType: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        >
                          <option value="dapp">DApp</option>
                          <option value="protocol">Protocol</option>
                          <option value="infrastructure">Infrastructure</option>
                          <option value="tooling">Developer Tooling</option>
                          <option value="defi">DeFi</option>
                          <option value="nft">NFT</option>
                          <option value="gaming">Gaming</option>
                          <option value="dao">DAO</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div>
                      <label className="block text-blue-700 font-medium mb-3 flex items-center">
                        <Bookmark className="h-4 w-4 mr-2" />
                        Tags
                      </label>
                      {project.tags.map((tag, index) => (
                        <div key={index} className="flex mb-3">
                          <input
                            type="text"
                            value={tag}
                            onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="Enter tag (e.g., DeFi, Cross-chain)"
                          />
                          {project.tags.length > 1 && (
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
                        className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tag
                      </button>
                    </div>
                    
                    {/* Location & Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          Location
                        </label>
                        <input
                          type="text"
                          value={project.location}
                          onChange={(e) => setProject({...project, location: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="City, Country"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Established Date
                        </label>
                        <input
                          type="date"
                          value={project.establishedDate}
                          onChange={(e) => setProject({...project, establishedDate: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </label>
                        <input
                          type="url"
                          value={project.website}
                          onChange={(e) => setProject({...project, website: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="https://yourproject.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 2: Media & Links */}
                {currentStage === 2 && (
                  <div className="space-y-8">
                    {/* Logo Upload */}
                    <div>
                      <label className="block text-blue-700 font-medium mb-3 flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Project Logo
                      </label>
                      <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
                        <input
                          type="file"
                          ref={logoFileInputRef}
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setLogoFile(e.target.files[0]);
                              setProject({...project, logo: `File selected: ${e.target.files[0].name}`});
                            }
                          }}
                          className="hidden"
                        />
                        <div className="space-y-4">
                          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Upload className="h-8 w-8 text-blue-500" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => logoFileInputRef.current?.click()}
                              className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center mx-auto"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Logo File
                            </button>
                            <p className="text-sm text-gray-500 mt-2">PNG, JPG, SVG up to 10MB</p>
                          </div>
                        </div>
                        {project.logo && (
                          <div className="mt-4 text-sm text-blue-600">
                            ✓ {project.logo.replace('File selected: ', '')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Demo Video Upload */}
                    <div>
                      <label className="block text-blue-700 font-medium mb-3 flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        Demo Video (Optional)
                      </label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
                        <input
                          type="file"
                          ref={videoFileInputRef}
                          accept="video/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDemoVideoFile(e.target.files[0]);
                              setProject({...project, demoVideo: `File selected: ${e.target.files[0].name}`});
                            }
                          }}
                          className="hidden"
                        />
                        <div className="space-y-4">
                          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-500" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => videoFileInputRef.current?.click()}
                              className="px-6 py-3 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center mx-auto"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Video File
                            </button>
                            <p className="text-sm text-gray-500 mt-2">MP4, WebM up to 100MB</p>
                          </div>
                        </div>
                        {project.demoVideo && (
                          <div className="mt-4 text-sm text-blue-600">
                            ✓ {project.demoVideo.replace('File selected: ', '')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Repository Links */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Github className="h-4 w-4 mr-2" />
                          GitHub Repository *
                        </label>
                        <input
                          type="url"
                          value={project.githubRepo}
                          onChange={(e) => setProject({...project, githubRepo: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="https://github.com/username/project"
                        />
                        {formErrors.githubRepo && <p className="mt-2 text-red-500 text-sm">{formErrors.githubRepo}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          Demo URL
                        </label>
                        <input
                          type="url"
                          value={project.demoUrl}
                          onChange={(e) => setProject({...project, demoUrl: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="https://demo.yourproject.com"
                        />
                      </div>
                    </div>

                    {/* Documentation */}
                    <div>
                      <label className="block text-blue-700 font-medium mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentation
                      </label>
                      <input
                        type="url"
                        value={project.documentation}
                        onChange={(e) => setProject({...project, documentation: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        placeholder="https://docs.yourproject.com"
                      />
                    </div>

                    {/* Social Media Links */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                        <Globe2 className="h-5 w-5 mr-2" />
                        Social Media & Community
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Twitter className="h-4 w-4 mr-2" />
                            Twitter
                          </label>
                          <input
                            type="url"
                            value={project.twitter}
                            onChange={(e) => setProject({...project, twitter: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="https://twitter.com/yourproject"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Linkedin className="h-4 w-4 mr-2" />
                            LinkedIn
                          </label>
                          <input
                            type="url"
                            value={project.linkedin}
                            onChange={(e) => setProject({...project, linkedin: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="https://linkedin.com/company/yourproject"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Globe className="h-4 w-4 mr-2" />
                            Discord
                          </label>
                          <input
                            type="url"
                            value={project.discord}
                            onChange={(e) => setProject({...project, discord: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="https://discord.gg/yourproject"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Globe className="h-4 w-4 mr-2" />
                            Telegram
                          </label>
                          <input
                            type="url"
                            value={project.telegram}
                            onChange={(e) => setProject({...project, telegram: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="https://t.me/yourproject"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 3: Team & Technical */}
                {currentStage === 3 && (
                  <div className="space-y-8">
                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                        <Mail className="h-5 w-5 mr-2" />
                        Contact Information
                      </h3>
                      <div>
                        <label className="block text-blue-700 font-medium mb-3">Contact Email *</label>
                        <input
                          type="email"
                          value={project.contactEmail}
                          onChange={(e) => setProject({...project, contactEmail: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          placeholder="contact@yourproject.com"
                        />
                        {formErrors.contactEmail && <p className="mt-2 text-red-500 text-sm">{formErrors.contactEmail}</p>}
                      </div>
                    </div>

                    {/* Team Members */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Team Members
                      </h3>
                      {project.teamMembers.map((member, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-6 mb-4 border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => {
                                const updated = [...project.teamMembers];
                                updated[index] = {...member, name: e.target.value};
                                setProject({...project, teamMembers: updated});
                              }}
                              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                              placeholder="Full Name"
                            />
                            <input
                              type="text"
                              value={member.role}
                              onChange={(e) => {
                                const updated = [...project.teamMembers];
                                updated[index] = {...member, role: e.target.value};
                                setProject({...project, teamMembers: updated});
                              }}
                              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                              placeholder="Role/Position"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                              type="email"
                              value={member.email}
                              onChange={(e) => {
                                const updated = [...project.teamMembers];
                                updated[index] = {...member, email: e.target.value};
                                setProject({...project, teamMembers: updated});
                              }}
                              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                              placeholder="Email"
                            />
                            <input
                              type="url"
                              value={member.linkedin}
                              onChange={(e) => {
                                const updated = [...project.teamMembers];
                                updated[index] = {...member, linkedin: e.target.value};
                                setProject({...project, teamMembers: updated});
                              }}
                              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                              placeholder="LinkedIn URL"
                            />
                            <div className="flex">
                              <input
                                type="url"
                                value={member.twitter}
                                onChange={(e) => {
                                  const updated = [...project.teamMembers];
                                  updated[index] = {...member, twitter: e.target.value};
                                  setProject({...project, teamMembers: updated});
                                }}
                                className="flex-1 px-4 py-2.5 rounded-l-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                                placeholder="Twitter URL"
                              />
                              {project.teamMembers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...project.teamMembers];
                                    updated.splice(index, 1);
                                    setProject({...project, teamMembers: updated});
                                  }}
                                  className="bg-red-100 text-red-600 px-3 py-2.5 rounded-r-xl hover:bg-red-200 transition-colors border-y border-r border-red-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setProject({
                          ...project, 
                          teamMembers: [...project.teamMembers, {name: '', role: '', email: '', linkedin: '', twitter: ''}]
                        })}
                        className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team Member
                      </button>
                    </div>

                    {/* Technical Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                        <Code className="h-5 w-5 mr-2" />
                        Technical Details
                      </h3>
                      
                      {/* Blockchain & Development Stage */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Zap className="h-4 w-4 mr-2" />
                            Primary Blockchain
                          </label>
                          <select
                            value={project.blockchain}
                            onChange={(e) => setProject({...project, blockchain: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          >
                            <option value="">Select blockchain</option>
                            {blockchains.map(chain => (
                              <option key={chain} value={chain}>{chain}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Star className="h-4 w-4 mr-2" />
                            Development Stage
                          </label>
                          <select
                            value={project.developmentStage}
                            onChange={(e) => setProject({...project, developmentStage: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          >
                            <option value="">Select stage</option>
                            {developmentStages.map(stage => (
                              <option key={stage} value={stage}>{stage}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Tech Stack */}
                      <div className="mb-6">
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Code className="h-4 w-4 mr-2" />
                          Technology Stack *
                        </label>
                        {project.techStack.map((tech, index) => (
                          <div key={index} className="flex mb-3">
                            <select
                              value={tech}
                              onChange={(e) => updateArrayItem('techStack', index, e.target.value)}
                              className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            >
                              <option value="">Select technology</option>
                              {techStackOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {project.techStack.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeArrayItem('techStack', index)}
                                className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {formErrors.techStack[0] && <p className="mb-2 text-red-500 text-sm">{formErrors.techStack[0]}</p>}
                        <button
                          type="button"
                          onClick={() => addArrayItem('techStack')}
                          className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Technology
                        </button>
                      </div>

                      {/* Smart Contracts */}
                      <div className="mb-6">
                        <label className="block text-blue-700 font-medium mb-3 flex items-center">
                          <Code className="h-4 w-4 mr-2" />
                          Smart Contract Addresses
                        </label>
                        {project.smartContracts.map((contract, index) => (
                          <div key={index} className="flex mb-3">
                            <input
                              type="text"
                              value={contract}
                              onChange={(e) => updateArrayItem('smartContracts', index, e.target.value)}
                              className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 font-mono transition-all"
                              placeholder="0x..."
                            />
                            {project.smartContracts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeArrayItem('smartContracts', index)}
                                className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addArrayItem('smartContracts')}
                          className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Contract
                        </button>
                      </div>

                      {/* License & Open Source */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            License
                          </label>
                          <select
                            value={project.license}
                            onChange={(e) => setProject({...project, license: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                          >
                            <option value="">Select license</option>
                            {licenses.map(license => (
                              <option key={license} value={license}>{license}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-blue-700 font-medium mb-3 flex items-center">
                            <Heart className="h-4 w-4 mr-2" />
                            Open Source
                          </label>
                          <div className="flex items-center space-x-4 mt-3">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="openSource"
                                checked={project.openSource === true}
                                onChange={() => setProject({...project, openSource: true})}
                                className="mr-2 text-blue-500"
                              />
                              Yes
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="openSource"
                                checked={project.openSource === false}
                                onChange={() => setProject({...project, openSource: false})}
                                className="mr-2 text-blue-500"
                              />
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Features & Innovation */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                        <Star className="h-5 w-5 mr-2" />
                        Project Features
                      </h3>
                      
                      {/* Key Features */}
                      <div className="mb-6">
                        <label className="block text-blue-700 font-medium mb-3">Key Features *</label>
                        {project.keyFeatures.map((feature, index) => (
                          <div key={index} className="flex mb-3">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updateArrayItem('keyFeatures', index, e.target.value)}
                              className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                              placeholder="Describe a key feature"
                            />
                            {project.keyFeatures.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeArrayItem('keyFeatures', index)}
                                className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {formErrors.keyFeatures[0] && <p className="mb-2 text-red-500 text-sm">{formErrors.keyFeatures[0]}</p>}
                        <button
                          type="button"
                          onClick={() => addArrayItem('keyFeatures')}
                          className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Feature
                        </button>
                      </div>

                      {/* Innovation & Use Cases */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-blue-700 font-medium mb-3">Innovation Statement</label>
                          <textarea
                            value={project.innovation}
                            onChange={(e) => setProject({...project, innovation: e.target.value})}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="What makes your project innovative?"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-blue-700 font-medium mb-3">Target Audience</label>
                          <textarea
                            value={project.targetAudience}
                            onChange={(e) => setProject({...project, targetAudience: e.target.value})}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                            placeholder="Who is your target audience?"
                          />
                        </div>
                      </div>
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
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Project Summary</h3>
                      <p className="text-gray-600">Review your project details before submission</p>
                    </div>

                    {/* Basic Information Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                        <Info className="h-5 w-5 mr-2 text-blue-500" />
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Project Name:</span>
                          <p className="text-gray-800">{project.name || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Category:</span>
                          <p className="text-gray-800">{project.category || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Tagline:</span>
                          <p className="text-gray-800">{project.tagline || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Location:</span>
                          <p className="text-gray-800">{project.location || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="font-medium text-gray-600">Description:</span>
                        <p className="text-gray-800 mt-1">{project.description || 'Not specified'}</p>
                      </div>
                      <div className="mt-4">
                        <span className="font-medium text-gray-600">Tags:</span>
                        <p className="text-gray-800">
                          {project.tags.filter(t => t.trim() !== '').join(', ') || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Technical Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                        <Code className="h-5 w-5 mr-2 text-blue-500" />
                        Technical Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Blockchain:</span>
                          <p className="text-gray-800">{project.blockchain || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Development Stage:</span>
                          <p className="text-gray-800">{project.developmentStage || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">License:</span>
                          <p className="text-gray-800">{project.license || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Open Source:</span>
                          <p className="text-gray-800">{project.openSource ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">Tech Stack:</span>
                          <p className="text-gray-800">
                            {project.techStack.filter(t => t.trim() !== '').join(', ') || 'Not specified'}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">Key Features:</span>
                          <p className="text-gray-800">
                            {project.keyFeatures.filter(f => f.trim() !== '').join(', ') || 'Not specified'}
                          </p>
                        </div>
                        {project.smartContracts.filter(c => c.trim() !== '').length > 0 && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-gray-600">Smart Contracts:</span>
                            <div className="space-y-1 mt-1">
                              {project.smartContracts.filter(c => c.trim() !== '').map((contract, idx) => (
                                <p key={idx} className="font-mono text-sm bg-white p-2 rounded border">{contract}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-500" />
                        Team & Contact
                      </h4>
                      <div className="text-sm">
                        <div className="mb-4">
                          <span className="font-medium text-gray-600">Contact Email:</span>
                          <p className="text-gray-800">{project.contactEmail || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Team Members:</span>
                          <div className="mt-2 space-y-2">
                            {project.teamMembers.filter(m => m.name.trim() !== '').map((member, idx) => (
                              <div key={idx} className="bg-white p-3 rounded border">
                                <p className="font-medium">{member.name} - {member.role}</p>
                                {member.email && <p className="text-gray-600">{member.email}</p>}
                              </div>
                            ))}
                            {project.teamMembers.filter(m => m.name.trim() !== '').length === 0 && (
                              <p className="text-gray-500">No team members specified</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Links Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                        <LinkIcon className="h-5 w-5 mr-2 text-blue-500" />
                        Links & Media
                      </h4>
                      <div className="space-y-2 text-sm">
                        {project.githubRepo && (
                          <div>
                            <span className="font-medium text-gray-600">GitHub:</span>
                            <a href={project.githubRepo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                              {project.githubRepo}
                            </a>
                          </div>
                        )}
                        {project.website && (
                          <div>
                            <span className="font-medium text-gray-600">Website:</span>
                            <a href={project.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                              {project.website}
                            </a>
                          </div>
                        )}
                        {project.demoUrl && (
                          <div>
                            <span className="font-medium text-gray-600">Demo:</span>
                            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                              {project.demoUrl}
                            </a>
                          </div>
                        )}
                        {project.documentation && (
                          <div>
                            <span className="font-medium text-gray-600">Documentation:</span>
                            <a href={project.documentation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                              {project.documentation}
                            </a>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-600">Logo:</span>
                          <span className="text-gray-800 ml-2">
                            {project.logo ? (project.logo.startsWith('File selected:') ? 'File uploaded ✓' : 'URL provided ✓') : 'Not provided'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Demo Video:</span>
                          <span className="text-gray-800 ml-2">
                            {project.demoVideo ? (project.demoVideo.startsWith('File selected:') ? 'File uploaded ✓' : 'URL provided ✓') : 'Not provided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Project Creation Info */}
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-700 font-medium mb-2">Project Creation</p>
                          <p className="text-blue-600 text-sm">
                            Your project will be created on the Sovereign Seas platform with comprehensive metadata. 
                            All media files will be uploaded to IPFS for decentralized storage, and your project 
                            will be immediately available for community viewing and future campaign participation.
                          </p>
                          <div className="mt-3 text-xs text-blue-600">
                            <p>• Project Type: {project.projectType}</p>
                            <p>• Maturity Level: {project.maturityLevel}</p>
                            <p>• Transferrable: {project.transferrable ? 'Yes' : 'No'}</p>
                            <p>• Media files: {(logoFile ? 1 : 0) + (demoVideoFile ? 1 : 0)} file(s)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {(isUploading || loading) && (
                      <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700">
                            {isUploading ? 'Uploading Files...' : 'Creating Project...'}
                          </span>
                          {isPending && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
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
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group border border-blue-400/30 relative overflow-hidden"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                     
                      // disabled={loading || isPending || !isConnected}
                      className="px-8 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center group border border-emerald-400/30 relative overflow-hidden"
                    >
                      {loading || isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                          Create Project
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {!isConnected && currentStage === totalStages && (
                  <p className="mt-4 text-amber-600 text-center flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Please connect your wallet to create a project
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
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 relative shadow-xl">
            <button
              onClick={() => setShowMediaPreview(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {previewType === 'image' ? 'Image Preview' : 'Video Preview'}
            </h3>
            
            <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4 min-h-[400px] border border-gray-200">
              {previewType === 'image' ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-[500px] object-contain rounded-lg"
                  onError={() => setErrorMessage('Could not load image. Please check the URL.')}
                />
              ) : (
                <video 
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-[500px] rounded-lg"
                  onError={() => setErrorMessage('Could not load video. Please check the URL or try a different format.')}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add these CSS animations to your globals.css
/*
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-float-slow {
  animation: float 6s ease-in-out infinite;
}

.animate-float-slower {
  animation: float 8s ease-in-out infinite;
}
*/