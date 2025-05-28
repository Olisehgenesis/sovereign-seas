// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Save,
  Github,
  Globe,
  FileText,
  Calendar,
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
  Shield,
  Hash,
  MapPin,
  Users,
  Star,
  Award,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Mail,
  Twitter,
  Linkedin,
  Globe2,
  Bookmark,
  Tag,
  Lightbulb,
  Target,
  Zap,
  Heart,
  Briefcase,
  Settings,
  Edit3,
  Eye,
  Clock,
  Activity,
  ExternalLink
} from 'lucide-react';
import { useProjectDetails, useUpdateProject, useProjectCampaigns } from '@/hooks/useProjectMethods';
import { uploadToIPFS } from '@/utils/imageUtils';

const contractAddress = import.meta.env.VITE_CONTRACT_V4;

const EditProjectPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Hooks for fetching project data
  const { projectDetails, isLoading: projectLoading, error: projectError, refetch } = useProjectDetails(
    contractAddress, 
    projectId ? BigInt(projectId) : 0n
  );
  
  const { projectCampaigns, isLoading: campaignsLoading } = useProjectCampaigns(
    contractAddress,
    projectId ? BigInt(projectId) : 0n
  );

  // Hook for updating project
  const { updateProject, isPending, isSuccess, error: updateError } = useUpdateProject(contractAddress);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // File handling
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoFileInputRef = useRef(null);
  
  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveProgress, setSaveProgress] = useState(0);
  
  // Project data state - will be populated from hook
  const [project, setProject] = useState({
    name: '',
    tagline: '',
    description: '',
    category: '',
    tags: [''],
    location: '',
    establishedDate: '',
    website: '',
    logo: '',
    demoVideo: '',
    demoUrl: '',
    githubRepo: '',
    karmaGapProfile: '',
    documentation: '',
    twitter: '',
    linkedin: '',
    discord: '',
    telegram: '',
    youtube: '',
    instagram: '',
    teamMembers: [{
      name: '',
      role: '',
      email: '',
      linkedin: '',
      twitter: '',
      avatar: ''
    }],
    contactEmail: '',
    businessEmail: '',
    phone: '',
    techStack: [''],
    blockchain: '',
    smartContracts: [''],
    license: '',
    developmentStage: '',
    keyFeatures: [''],
    innovation: '',
    useCases: [''],
    targetAudience: '',
    milestones: [{
      title: '',
      description: '',
      targetDate: '',
      status: 'planned'
    }],
    status: 'active',
    launchDate: '',
    userCount: '',
    transactionVolume: '',
    tvl: '',
    auditReports: [''],
    kycCompliant: false,
    regulatoryCompliance: [''],
    projectType: 'dapp',
    maturityLevel: 'early',
    openSource: true,
    transferrable: true
  });

  // Populate project data when loaded
  useEffect(() => {
    if (projectDetails && projectDetails.project && projectDetails.metadata) {
      const { project: projectData, metadata, contracts } = projectDetails;
      
      // Parse JSON metadata
      let parsedBio = {};
      let parsedAdditionalData = {};
      
      try {
        if (metadata.bio) {
          parsedBio = JSON.parse(metadata.bio);
        }
      } catch (e) {
        console.warn('Failed to parse bio metadata:', e);
      }
      
      try {
        if (metadata.additionalData) {
          parsedAdditionalData = JSON.parse(metadata.additionalData);
        }
      } catch (e) {
        console.warn('Failed to parse additional data:', e);
      }

      // Merge all data
      const combinedData = {
        ...parsedBio,
        ...parsedAdditionalData,
      };

      setProject(prev => ({
        ...prev,
        name: projectData.name || '',
        description: projectData.description || '',
        smartContracts: contracts || [''],
        // Map from parsed metadata
        tagline: combinedData.tagline || '',
        category: combinedData.category || '',
        tags: combinedData.tags || [''],
        location: combinedData.location || '',
        establishedDate: combinedData.establishedDate || '',
        website: combinedData.website || '',
        logo: combinedData.logo || '',
        demoVideo: combinedData.demoVideo || '',
        demoUrl: combinedData.demoUrl || '',
        githubRepo: combinedData.githubRepo || '',
        documentation: combinedData.documentation || '',
        karmaGapProfile: combinedData.karmaGapProfile || '',
        twitter: combinedData.social?.twitter || combinedData.twitter || '',
        linkedin: combinedData.social?.linkedin || combinedData.linkedin || '',
        discord: combinedData.social?.discord || combinedData.discord || '',
        telegram: combinedData.social?.telegram || combinedData.telegram || '',
        youtube: combinedData.social?.youtube || combinedData.youtube || '',
        instagram: combinedData.social?.instagram || combinedData.instagram || '',
        teamMembers: combinedData.teamMembers || [{
          name: '',
          role: '',
          email: '',
          linkedin: '',
          twitter: '',
          avatar: ''
        }],
        contactEmail: combinedData.contactEmail || '',
        businessEmail: combinedData.businessEmail || '',
        phone: combinedData.phone || '',
        techStack: combinedData.techStack || [''],
        blockchain: combinedData.blockchain || '',
        license: combinedData.license || '',
        developmentStage: combinedData.developmentStage || '',
        keyFeatures: combinedData.keyFeatures || [''],
        innovation: combinedData.innovation || '',
        useCases: combinedData.useCases || [''],
        targetAudience: combinedData.targetAudience || '',
        projectType: combinedData.projectType || 'dapp',
        maturityLevel: combinedData.maturityLevel || 'early',
        status: combinedData.status || 'active',
        openSource: combinedData.openSource !== undefined ? combinedData.openSource : true,
        transferrable: projectData.transferrable
      }));

      // Set logo preview if exists
      if (combinedData.logo) {
        setLogoPreview(combinedData.logo);
      }
    }
  }, [projectDetails]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle update success
  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Project updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        refetch(); // Refresh project data
      }, 3000);
    }
  }, [isSuccess, refetch]);

  // Handle update error
  useEffect(() => {
    if (updateError) {
      setErrorMessage(`Update failed: ${updateError.message || 'Unknown error'}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  }, [updateError]);

  // Check if user is project owner
  const isOwner = projectDetails?.project?.owner?.toLowerCase() === address?.toLowerCase();
  
  if (!isMounted) {
    return null;
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (projectError || !projectDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Project not found or failed to load</p>
          <button
            onClick={() => navigate('/explorer')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Explorer
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">Please connect your wallet to edit projects</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">You can only edit projects you own</p>
          <button
            onClick={() => navigate('/explorer')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Explorer
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'basic', label: 'Basic Info', icon: Hash },
    { id: 'media', label: 'Media & Links', icon: ImageIcon },
    { id: 'team', label: 'Team & Contact', icon: Users },
    { id: 'technical', label: 'Technical', icon: Code },
    { id: 'campaigns', label: 'Campaigns', icon: Activity }
  ];

  // Helper functions for dynamic arrays
  const addArrayItem = (field, defaultValue = '') => {
    setProject({
      ...project,
      [field]: [...project[field], defaultValue]
    });
  };
  
  const removeArrayItem = (field, index) => {
    const array = project[field];
    if (array.length <= 1) return;
    
    const updated = [...array];
    updated.splice(index, 1);
    setProject({
      ...project,
      [field]: updated
    });
  };
  
  const updateArrayItem = (field, index, value) => {
    const array = project[field];
    const updated = [...array];
    updated[index] = value;
    setProject({
      ...project,
      [field]: updated
    });
  };

  // Handle logo file change
  const handleLogoFileChange = (e) => {
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
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to update the project');
      return;
    }
    
    try {
      setIsUploading(true);
      setSaveProgress(20);
      
      // Upload logo to IPFS if file is selected
      let logoIpfsUrl = project.logo;
      if (logoFile) {
        try {
          setSaveProgress(40);
          logoIpfsUrl = await uploadToIPFS(logoFile);
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError);
          throw new Error(`Failed to upload logo: ${uploadError}`);
        }
      }
      
      setSaveProgress(60);
      
      // Prepare metadata
      const bioData = {
        tagline: project.tagline,
        category: project.category,
        tags: project.tags.filter(tag => tag.trim() !== ''),
        location: project.location,
        establishedDate: project.establishedDate,
        website: project.website,
        projectType: project.projectType,
        maturityLevel: project.maturityLevel,
        status: project.status,
        openSource: project.openSource,
        transferrable: project.transferrable
      };
      
      const contractInfoData = {
        blockchain: project.blockchain,
        techStack: project.techStack.filter(t => t.trim() !== ''),
        license: project.license,
        developmentStage: project.developmentStage
      };
      
      const additionalData = {
        version: '1.0.0',
        timestamp: Date.now(),
        logo: logoIpfsUrl,
        demoVideo: project.demoVideo,
        demoUrl: project.demoUrl,
        documentation: project.documentation,
        karmaGapProfile: project.karmaGapProfile,
        social: {
          twitter: project.twitter,
          linkedin: project.linkedin,
          discord: project.discord,
          telegram: project.telegram,
          youtube: project.youtube,
          instagram: project.instagram
        },
        teamMembers: project.teamMembers.filter(m => m.name.trim() !== ''),
        contactEmail: project.contactEmail,
        businessEmail: project.businessEmail,
        phone: project.phone,
        keyFeatures: project.keyFeatures.filter(f => f.trim() !== ''),
        innovation: project.innovation,
        useCases: project.useCases.filter(u => u.trim() !== ''),
        targetAudience: project.targetAudience
      };
      
      setSaveProgress(80);
      
      // Update project
      await updateProject({
        projectId: BigInt(projectId),
        name: project.name,
        description: project.description,
        bio: JSON.stringify(bioData),
        contractInfo: JSON.stringify(contractInfoData),
        additionalData: JSON.stringify(additionalData),
        contracts: project.smartContracts
          .filter(c => c.trim() !== '')
          .map(c => c.startsWith('0x') ? c : `0x${c}`)
      });
      
      setSaveProgress(100);
      
    } catch (error) {
      console.error('Project update error:', error);
      setErrorMessage(error.message || 'Failed to update project');
    } finally {
      setIsUploading(false);
      setSaveProgress(0);
    }
  };

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
    'Hardhat', 'Foundry', 'Truffle', 'IPFS', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Vercel', 'Netlify', 'Firebase'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/5 to-indigo-400/5 blur-3xl"></div>
        <div className="absolute top-1/2 right-1/5 w-96 h-96 rounded-full bg-gradient-to-r from-cyan-400/5 to-blue-400/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-gradient-to-r from-indigo-400/5 to-purple-400/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Vertical Sidebar */}
        <div className="w-80 bg-white/80 backdrop-blur-md border-r border-gray-200/50 p-6">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/explorer')}
              className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Explorer
            </button>
            
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4">
                <Edit3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Edit Project</h1>
                <p className="text-gray-600 text-sm">Project ID: {projectId}</p>
              </div>
            </div>

            {/* Project Preview Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center mb-3">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Project logo"
                    className="w-10 h-10 rounded-lg object-cover mr-3"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{project.name || 'Unnamed Project'}</h3>
                  <p className="text-sm text-gray-600 truncate">{project.tagline || 'No tagline'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <Activity className="h-3 w-3 mr-1" />
                  {projectCampaigns?.length || 0} campaigns
                </span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Created {new Date(Number(projectDetails.project.createdAt) * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Save Button */}
          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={isPending || isUploading}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold"
            >
              {isPending || isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
            
            {(isPending || isUploading) && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${saveProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">{saveProgress}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start">
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700">{successMessage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
              <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Tab Content */}
          <form onSubmit={handleSubmit}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Project Overview</h2>
                  <p className="text-gray-600 mb-8">Quick stats and information about your project</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-700">Status</h3>
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800 capitalize">{project.status}</p>
                    <p className="text-sm text-gray-500 mt-1">Project State</p>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-700">Campaigns</h3>
                      <Star className="h-5 w-5 text-yellow-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{projectCampaigns?.length || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Participating</p>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-700">Blockchain</h3>
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{project.blockchain || 'Not Set'}</p>
                    <p className="text-sm text-gray-500 mt-1">Primary Network</p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                      <input
                        type="text"
                        value={project.name}
                        onChange={(e) => setProject({...project, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="Enter project name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                      <input
                        type="text"
                        value={project.tagline}
                        onChange={(e) => setProject({...project, tagline: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="Brief, catchy description"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={project.description}
                      onChange={(e) => setProject({...project, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="Describe your project..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Basic Information</h2>
                  <p className="text-gray-600 mb-8">Core details about your project</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 space-y-6">
                  {/* Category & Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Tag className="h-4 w-4 mr-2" />
                        Category
                      </label>
                      <select
                        value={project.category}
                        onChange={(e) => setProject({...project, category: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Project Type
                      </label>
                      <select
                        value={project.projectType}
                        onChange={(e) => setProject({...project, projectType: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Tags
                    </label>
                    {project.tags.map((tag, index) => (
                      <div key={index} className="flex mb-3">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="Enter tag (e.g., DeFi, Cross-chain)"
                        />
                        {project.tags.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('tags', index)}
                            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-lg hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('tags')}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </button>
                  </div>
                  
                  {/* Location & Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Location
                      </label>
                      <input
                        type="text"
                        value={project.location}
                        onChange={(e) => setProject({...project, location: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="City, Country"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Established Date
                      </label>
                      <input
                        type="date"
                        value={project.establishedDate}
                        onChange={(e) => setProject({...project, establishedDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </label>
                      <input
                        type="url"
                        value={project.website}
                        onChange={(e) => setProject({...project, website: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="https://yourproject.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Media & Links Tab */}
            {activeTab === 'media' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Media & Links</h2>
                  <p className="text-gray-600 mb-8">Visual assets and external links</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 space-y-8">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Project Logo
                    </label>
                    
                    {logoPreview && (
                      <div className="mb-4 flex justify-center">
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-32 h-32 object-cover rounded-xl border-2 border-blue-200 shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(null);
                              setProject({...project, logo: ''});
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
                    
                    <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
                      <input
                        type="file"
                        ref={logoFileInputRef}
                        accept="image/*"
                        onChange={handleLogoFileChange}
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
                            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 flex items-center mx-auto"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {logoFile ? 'Change Logo' : 'Choose Logo File'}
                          </button>
                          <p className="text-sm text-gray-500 mt-2">PNG, JPG, SVG up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demo & Repository Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        Demo Video
                      </label>
                      <input
                        type="url"
                        value={project.demoVideo}
                        onChange={(e) => setProject({...project, demoVideo: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Demo URL
                      </label>
                      <input
                        type="url"
                        value={project.demoUrl}
                        onChange={(e) => setProject({...project, demoUrl: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="https://demo.yourproject.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub Repository
                      </label>
                      <input
                        type="url"
                        value={project.githubRepo}
                        onChange={(e) => setProject({...project, githubRepo: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="https://github.com/username/project"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentation
                      </label>
                      <input
                        type="url"
                        value={project.documentation}
                        onChange={(e) => setProject({...project, documentation: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="https://docs.yourproject.com"
                      />
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Globe2 className="h-5 w-5 mr-2" />
                      Social Media & Community
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </label>
                        <input
                          type="url"
                          value={project.twitter}
                          onChange={(e) => setProject({...project, twitter: e.target.value})}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="https://twitter.com/yourproject"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </label>
                        <input
                          type="url"
                          value={project.linkedin}
                          onChange={(e) => setProject({...project, linkedin: e.target.value})}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="https://linkedin.com/company/yourproject"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          Discord
                        </label>
                        <input
                          type="url"
                          value={project.discord}
                          onChange={(e) => setProject({...project, discord: e.target.value})}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="https://discord.gg/yourproject"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          Telegram
                        </label>
                        <input
                          type="url"
                          value={project.telegram}
                          onChange={(e) => setProject({...project, telegram: e.target.value})}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="https://t.me/yourproject"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team & Contact Tab */}
            {activeTab === 'team' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Team & Contact</h2>
                  <p className="text-gray-600 mb-8">Team members and contact information</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 space-y-8">
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                        <input
                          type="email"
                          value={project.contactEmail}
                          onChange={(e) => setProject({...project, contactEmail: e.target.value})}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="contact@yourproject.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                        <input
                          type="email"
                          value={project.businessEmail}
                          onChange={(e) => setProject({...project, businessEmail: e.target.value})}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="business@yourproject.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
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
                            className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                            className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                            className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                            className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                              className="flex-1 px-4 py-2.5 rounded-l-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                                className="bg-red-100 text-red-600 px-3 py-2.5 rounded-r-lg hover:bg-red-200 transition-colors border-y border-r border-red-200"
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
                        teamMembers: [...project.teamMembers, {name: '', role: '', email: '', linkedin: '', twitter: '', avatar: ''}]
                      })}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Tab */}
            {activeTab === 'technical' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Technical Details</h2>
                  <p className="text-gray-600 mb-8">Technical specifications and development info</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 space-y-8">
                  {/* Blockchain & Development */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Primary Blockchain
                      </label>
                      <select
                        value={project.blockchain}
                        onChange={(e) => setProject({...project, blockchain: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      >
                        <option value="">Select blockchain</option>
                        {blockchains.map(chain => (
                          <option key={chain} value={chain}>{chain}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        License
                      </label>
                      <select
                        value={project.license}
                        onChange={(e) => setProject({...project, license: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      >
                        <option value="">Select license</option>
                        <option value="MIT">MIT</option>
                        <option value="Apache 2.0">Apache 2.0</option>
                        <option value="GPL v3">GPL v3</option>
                        <option value="Proprietary">Proprietary</option>
                      </select>
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-2" />
                      Technology Stack
                    </label>
                    {project.techStack.map((tech, index) => (
                      <div key={index} className="flex mb-3">
                        <select
                          value={tech}
                          onChange={(e) => updateArrayItem('techStack', index, e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-lg hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('techStack')}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Technology
                    </button>
                  </div>

                  {/* Smart Contracts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-2" />
                      Smart Contract Addresses
                    </label>
                    {project.smartContracts.map((contract, index) => (
                      <div key={index} className="flex mb-3">
                        <input
                          type="text"
                          value={contract}
                          onChange={(e) => updateArrayItem('smartContracts', index, e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                          placeholder="0x..."
                        />
                        {project.smartContracts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('smartContracts', index)}
                            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-lg hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('smartContracts')}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contract
                    </button>
                  </div>

                  {/* Key Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Star className="h-4 w-4 mr-2" />
                      Key Features
                    </label>
                    {project.keyFeatures.map((feature, index) => (
                      <div key={index} className="flex mb-3">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateArrayItem('keyFeatures', index, e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="Describe a key feature"
                        />
                        {project.keyFeatures.length > 1 && (<button
                            type="button"
                            onClick={() => removeArrayItem('keyFeatures', index)}
                            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-lg hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('keyFeatures')}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Feature
                    </button>
                  </div>

                  {/* Innovation & Target Audience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Innovation Statement
                      </label>
                      <textarea
                        value={project.innovation}
                        onChange={(e) => setProject({...project, innovation: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="What makes your project innovative?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Target Audience
                      </label>
                      <textarea
                        value={project.targetAudience}
                        onChange={(e) => setProject({...project, targetAudience: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="Who is your target audience?"
                      />
                    </div>
                  </div>

                  {/* Use Cases */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Use Cases
                    </label>
                    {project.useCases.map((useCase, index) => (
                      <div key={index} className="flex mb-3">
                        <input
                          type="text"
                          value={useCase}
                          onChange={(e) => updateArrayItem('useCases', index, e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="Describe a use case"
                        />
                        {project.useCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('useCases', index)}
                            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-lg hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('useCases')}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Use Case
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Campaign Participation</h2>
                  <p className="text-gray-600 mb-8">View your project's participation in campaigns</p>
                </div>

                {campaignsLoading ? (
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading campaigns...</p>
                  </div>
                ) : projectCampaigns && projectCampaigns.length > 0 ? (
                  <div className="space-y-4">
                    {projectCampaigns.map((campaign) => (
                      <div key={campaign.id.toString()} className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">{campaign.name}</h3>
                            <p className="text-gray-600 mb-3">{campaign.description}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(Number(campaign.startTime) * 1000).toLocaleDateString()} - {new Date(Number(campaign.endTime) * 1000).toLocaleDateString()}
                              </span>
                              <span className="flex items-center">
                                <Star className="h-4 w-4 mr-1" />
                                {campaign.participation.voteCount.toString()} votes
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                              campaign.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                              campaign.status === 'ended' ? 'bg-gray-100 text-gray-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {campaign.status}
                            </span>
                            
                            {campaign.participation.approved ? (
                              <span className="flex items-center text-green-600 text-sm">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approved
                              </span>
                            ) : (
                              <span className="flex items-center text-amber-600 text-sm">
                                <Clock className="h-4 w-4 mr-1" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{campaign.participation.voteCount.toString()}</p>
                            <p className="text-sm text-gray-500">Total Votes</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{campaign.maxWinners.toString()}</p>
                            <p className="text-sm text-gray-500">Max Winners</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{Number(campaign.adminFeePercentage)}%</p>
                            <p className="text-sm text-gray-500">Admin Fee</p>
                          </div>
                        </div>
                        
                        {campaign.participation.fundsReceived > 0n && (
                          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-green-700 font-medium">
                              Funds Received: {campaign.participation.fundsReceived.toString()} tokens
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Campaign Participation</h3>
                    <p className="text-gray-600 mb-4">This project hasn't participated in any campaigns yet.</p>
                    <button
                      onClick={() => navigate('/campaigns')}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Browse Campaigns
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProjectPage;