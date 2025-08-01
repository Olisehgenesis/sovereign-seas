import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Save,
  Github,
  Globe,
  
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Video,
  Code,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  Shield,
  Hash,
  Users,
  Star,
  Upload,
  Mail,
  Twitter,
  Linkedin,
  Globe2,
 
  
  Lightbulb,
  Target,
  Zap,
 
  Edit3,
  
  Clock,
  Activity,
  
} from 'lucide-react';
import { useProjectDetails, useUpdateProject, useProjectCampaigns, useCanBypassFees } from '@/hooks/useProjectMethods';
import { uploadToIPFS, formatIpfsUrl } from '@/utils/imageUtils';

const contractAddress = import.meta.env.VITE_CONTRACT_V4;

// Add type definitions
interface ProjectMetadata {
  tagline?: string;
  category?: string;
  tags?: string[];
  location?: string;
  establishedDate?: string;
  website?: string;
  projectType?: string;
  logo?: string;
  demoVideo?: string;
  demoUrl?: string;
  githubRepo?: string;
  documentation?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    discord?: string;
    telegram?: string;
  };
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
  teamMembers?: Array<{
    name: string;
    role: string;
    email: string;
    linkedin: string;
    twitter: string;
  }>;
  contactEmail?: string;
  businessEmail?: string;
  techStack?: string[];
  blockchain?: string;
  license?: string;
  developmentStage?: string;
  keyFeatures?: string[];
  innovation?: string;
  useCases?: string[];
  targetAudience?: string;
  openSource?: boolean;
}

interface ProjectState {
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  location: string;
  establishedDate: string;
  website: string;
  projectType: string;
  logo: string;
  demoVideo: string;
  demoUrl: string;
  githubRepo: string;
  documentation: string;
  twitter: string;
  linkedin: string;
  discord: string;
  telegram: string;
  teamMembers: Array<{
    name: string;
    role: string;
    email: string;
    linkedin: string;
    twitter: string;
  }>;
  contactEmail: string;
  businessEmail: string;
  techStack: string[];
  blockchain: string;
  smartContracts: string[];
  license: string;
  developmentStage: string;
  keyFeatures: string[];
  innovation: string;
  useCases: string[];
  targetAudience: string;
  openSource: boolean;
  transferrable: boolean;
}

const EditProjectPage = () => {
  const navigate = useNavigate();
  const { projectId: projectIdParam } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  // Convert projectId to BigInt safely
  const projectId = projectIdParam ? BigInt(projectIdParam) : 0n;
  
  // Hooks for fetching project data
  const { projectDetails, isLoading: projectLoading, error: projectError, refetch } = useProjectDetails(
    contractAddress, 
    projectId
  );
  
  const { projectCampaigns, isLoading: campaignsLoading } = useProjectCampaigns(
    contractAddress,
    projectId
  );

  console.log('projectCampaigns', campaignsLoading);

  // Hook for updating project
  const { updateProject, isPending, isSuccess, error: updateError } = useUpdateProject(contractAddress);
  
  // File handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasExistingLogo, setHasExistingLogo] = useState(false);
  const [logoToDelete, setLogoToDelete] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveProgress, setSaveProgress] = useState(0);
  
  // Project data state
  const [project, setProject] = useState<ProjectState>({
    name: '',
    tagline: '',
    description: '',
    category: '',
    tags: [''],
    location: '',
    establishedDate: '',
    website: '',
    projectType: 'dapp',
    logo: '',
    demoVideo: '',
    demoUrl: '',
    githubRepo: '',
    documentation: '',
    twitter: '',
    linkedin: '',
    discord: '',
    telegram: '',
    teamMembers: [{
      name: '',
      role: '',
      email: '',
      linkedin: '',
      twitter: ''
    }],
    contactEmail: '',
    businessEmail: '',
    techStack: [''],
    blockchain: '',
    smartContracts: [''],
    license: '',
    developmentStage: '',
    keyFeatures: [''],
    innovation: '',
    useCases: [''],
    targetAudience: '',
    openSource: true,
    transferrable: true
  });

  // Check permissions
  const { isAdmin } = useCanBypassFees(contractAddress, 0n);
  
  // Normalize addresses for comparison (remove 0x prefix and convert to lowercase)
  const normalizeAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return addr.replace(/^0x/i, '').toLowerCase();
  };
  
  const normalizedOwner = normalizeAddress(projectDetails?.project?.owner);
  const normalizedUser = normalizeAddress(address);
  
  // Multiple comparison methods to handle different address formats
  const isOwnerExact = projectDetails?.project?.owner?.toLowerCase() === address?.toLowerCase();
  const isOwnerNormalized = normalizedOwner === normalizedUser && normalizedOwner !== '';
  const isOwner = isOwnerExact || isOwnerNormalized;
  
  const canEdit = isOwner || isAdmin;
  
  // Debug wallet comparison
  console.log('Wallet comparison debug:', {
    projectOwner: projectDetails?.project?.owner,
    projectOwnerType: typeof projectDetails?.project?.owner,
    normalizedOwner,
    userAddress: address,
    userAddressType: typeof address,
    normalizedUser,
    isOwnerExact,
    isOwnerNormalized,
    isOwner,
    isAdmin,
    canEdit,
    projectDetailsLoaded: !!projectDetails,
    addressConnected: !!address
  });
  
  // FIXED: Main data population effect - removed logoFile dependency and added initialization tracking
  useEffect(() => {
    if (projectDetails?.project && projectDetails?.metadata && !isDataInitialized) {
      try {
        const { project: projectData, metadata } = projectDetails;
        
        // Parse JSON metadata safely
        let parsedBio: ProjectMetadata = {};
        let parsedAdditionalData: ProjectMetadata = {};
        
        try {
          if (metadata.bio) {
            parsedBio = JSON.parse(metadata.bio) as ProjectMetadata;
          }
        } catch (e) {
          console.warn('Failed to parse bio metadata:', e);
        }
        
        try {
          if (metadata.additionalData) {
            parsedAdditionalData = JSON.parse(metadata.additionalData) as ProjectMetadata;
          }
        } catch (e) {
          console.warn('Failed to parse additional data:', e);
        }

        // Merge all data safely
        const combinedData: ProjectMetadata = {
          ...parsedBio,
          ...parsedAdditionalData,
        };

        // Set logo preview if exists
        if (combinedData.logo) {
          const formattedUrl = formatIpfsUrl(combinedData.logo);
          setLogoPreview(formattedUrl);
          setHasExistingLogo(true);
          setLogoToDelete(false);
          console.log('Setting existing logo preview:', formattedUrl);
        }

        setProject(prev => ({
          ...prev,
          // Basic project data
          name: projectData.name || '',
          description: projectData.description || '',
          
          // From metadata
          tagline: combinedData.tagline || '',
          category: combinedData.category || '',
          tags: Array.isArray(combinedData.tags) ? combinedData.tags : [''],
          location: combinedData.location || '',
          establishedDate: combinedData.establishedDate || '',
          website: combinedData.website || '',
          projectType: combinedData.projectType || 'dapp',
          
          // Media
          logo: combinedData.logo || '',
          demoVideo: combinedData.demoVideo || '',
          demoUrl: combinedData.demoUrl || '',
          githubRepo: combinedData.githubRepo || '',
          documentation: combinedData.documentation || '',
          
          // Social
          twitter: combinedData.social?.twitter || combinedData.twitter || '',
          linkedin: combinedData.social?.linkedin || combinedData.linkedin || '',
          discord: combinedData.social?.discord || combinedData.discord || '',
          telegram: combinedData.social?.telegram || combinedData.telegram || '',
          
          // Team
          teamMembers: Array.isArray(combinedData.teamMembers) && combinedData.teamMembers.length > 0 
            ? combinedData.teamMembers 
            : [{ name: '', role: '', email: '', linkedin: '', twitter: '' }],
          contactEmail: combinedData.contactEmail || '',
          businessEmail: combinedData.businessEmail || '',
          
          // Technical
          techStack: Array.isArray(combinedData.techStack) ? combinedData.techStack : [''],
          blockchain: combinedData.blockchain || '',
          smartContracts: Array.isArray(projectDetails.contracts) ? projectDetails.contracts : [''],
          license: combinedData.license || '',
          developmentStage: combinedData.developmentStage || '',
          keyFeatures: Array.isArray(combinedData.keyFeatures) ? combinedData.keyFeatures : [''],
          innovation: combinedData.innovation || '',
          useCases: Array.isArray(combinedData.useCases) ? combinedData.useCases : [''],
          targetAudience: combinedData.targetAudience || '',
          
          // Metadata
          openSource: combinedData.openSource !== undefined ? combinedData.openSource : true,
          transferrable: projectData.transferrable !== undefined ? projectData.transferrable : true
        }));
        
        setIsDataInitialized(true);
      } catch (error) {
        console.error('Error processing project data:', error);
        setErrorMessage('Error loading project data');
      }
    }
  }, [projectDetails?.project, projectDetails?.metadata, isDataInitialized]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // FIXED: Success effect without refetch - prevents data reset
  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Project updated successfully!');
      
      // Reset logo states after successful update
      setLogoFile(null);
      setLogoToDelete(false);
      // Don't reset logoPreview and hasExistingLogo here - let refetch handle it
      
      setTimeout(() => {
        setSuccessMessage('');
        // Don't refetch - keep user's current state
      }, 3000);
    }
  }, [isSuccess]);

  // Handle update error
  useEffect(() => {
    if (updateError) {
      setErrorMessage(`Update failed: ${updateError.message || 'Unknown error'}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  }, [updateError]);

  // Memoized callbacks to prevent re-renders
  const updateArrayItem = useCallback((field: keyof ProjectState, index: number, value: string) => {
    setProject(prev => {
      const array = prev[field] as string[] || [];
      if (array[index] === value) return prev; // Prevent unnecessary updates
      
      const updated = [...array];
      updated[index] = value;
      return {
        ...prev,
        [field]: updated
      };
    });
  }, []);

  const addArrayItem = useCallback((field: keyof ProjectState, defaultValue = '') => {
    setProject(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[] || []), defaultValue]
    }));
  }, []);
  
  const removeArrayItem = useCallback((field: keyof ProjectState, index: number) => {
    setProject(prev => {
      const array = prev[field] as string[] || [];
      if (array.length <= 1) return prev;
      
      const updated = [...array];
      updated.splice(index, 1);
      return {
        ...prev,
        [field]: updated
      };
    });
  }, []);

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
      
      // Clean up previous preview if it was a blob URL
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      
      // Create new preview URL
      const previewUrl = URL.createObjectURL(file);
      
      // Update all states immediately
      setLogoFile(file);
      setLogoPreview(previewUrl);
      setHasExistingLogo(false);
      setLogoToDelete(false);
      setProject(prev => ({...prev, logo: ''}));
      
      console.log('=== LOGO CHANGE DEBUG ===');
      console.log('File:', file.name);
      console.log('Preview URL:', previewUrl);
      console.log('hasExistingLogo set to:', false);
      console.log('========================');
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (logoPreview && !hasExistingLogo) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview, hasExistingLogo]);

  // Handle logo removal
  const handleLogoRemove = () => {
    // Clean up object URL only if it's a file preview, not IPFS URL
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setLogoToDelete(true);
    setHasExistingLogo(false);
    setProject(prev => ({...prev, logo: ''}));
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Add debug logging
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('logoFile:', logoFile);
    console.log('logoToDelete:', logoToDelete);
    console.log('hasExistingLogo:', hasExistingLogo);
    console.log('logoPreview:', logoPreview);
    console.log('project.logo:', project.logo);
    console.log('============================');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to update the project');
      return;
    }
    
    if (!canEdit) {
      setErrorMessage('You do not have permission to edit this project');
      return;
    }
    
    try {
      setIsUploading(true);
      setSaveProgress(20);
      
      // Handle logo upload/deletion
      let logoIpfsUrl = project.logo;

      if (logoToDelete) {
        // User wants to delete the logo
        logoIpfsUrl = '';
      } else if (logoFile) {
        // User uploaded a new file
        try {
          setSaveProgress(40);
          logoIpfsUrl = await uploadToIPFS(logoFile);
          console.log('New logo uploaded:', logoIpfsUrl);
        } catch (error) {
          console.error('Logo upload failed:', error);
          throw new Error(`Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (hasExistingLogo && logoPreview) {
        // Keep existing IPFS URL (extract original URL from formatted one if needed)
        logoIpfsUrl = project.logo;
      }
      
      setSaveProgress(60);
      
      // Prepare metadata
      const bioData = {
        tagline: project.tagline,
        category: project.category,
        tags: (project.tags || []).filter(tag => tag.trim() !== ''),
        location: project.location,
        establishedDate: project.establishedDate,
        website: project.website,
        projectType: project.projectType,
        openSource: project.openSource,
        transferrable: project.transferrable
      };
      
      const contractInfoData = {
        blockchain: project.blockchain,
        techStack: (project.techStack || []).filter(t => t.trim() !== ''),
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
        social: {
          twitter: project.twitter,
          linkedin: project.linkedin,
          discord: project.discord,
          telegram: project.telegram
        },
        teamMembers: (project.teamMembers || []).filter(m => m.name && m.name.trim() !== ''),
        contactEmail: project.contactEmail,
        businessEmail: project.businessEmail,
        keyFeatures: (project.keyFeatures || []).filter(f => f.trim() !== ''),
        innovation: project.innovation,
        useCases: (project.useCases || []).filter(u => u.trim() !== ''),
        targetAudience: project.targetAudience
      };
      
      setSaveProgress(80);
      
      // Update project
      await updateProject({
        projectId: projectId,
        name: project.name,
        description: project.description,
        bio: JSON.stringify(bioData),
        contractInfo: JSON.stringify(contractInfoData),
        additionalData: JSON.stringify(additionalData),
        contracts: (project.smartContracts || [])
          .filter(c => c.trim() !== '')
          .map(c => c.startsWith('0x') ? c as `0x${string}` : `0x${c}` as `0x${string}`)
      });
      
      setSaveProgress(100);
      
    } catch (error: unknown) {
      console.error('Project update error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update project');
    } finally {
      setIsUploading(false);
      setSaveProgress(0);
    }
  };

  // Memoize static data to prevent re-renders
  const categories = useMemo(() => [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 'Other'
  ], []);
  
  const blockchains = useMemo(() => [
    'Celo', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche',
    'Solana', 'Near', 'Cosmos', 'Polkadot', 'Cardano', 'Multi-chain', 'Other'
  ], []);
  
  const techStackOptions = useMemo(() => [
    'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Node.js', 'Python', 'Rust',
    'Solidity', 'Go', 'TypeScript', 'JavaScript', 'Web3.js', 'Ethers.js', 'Wagmi',
    'Hardhat', 'Foundry', 'Truffle', 'IPFS', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Vercel', 'Netlify', 'Firebase'
  ], []);

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

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">You need to be the project owner or an admin to edit projects</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/5 to-indigo-400/5 blur-3xl"></div>
        <div className="absolute top-1/2 right-1/5 w-96 h-96 rounded-full bg-gradient-to-r from-cyan-400/5 to-blue-400/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-gradient-to-r from-indigo-400/5 to-purple-400/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-800">Edit Project</h1>
                <p className="text-gray-600">Project ID: {projectIdParam}</p>
              </div>
            </div>

            {/* Project Preview Card */}
            {projectDetails && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-8">
                <div className="flex items-center mb-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Project logo"
                      className="w-16 h-16 rounded-lg object-cover mr-4"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-800">{project.name || 'Unnamed Project'}</h3>
                    <p className="text-gray-600">{project.tagline || 'No tagline'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center">
                    <Activity className="h-4 w-4 mr-1" />
                    {projectCampaigns?.length || 0} campaigns
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Created {new Date(Number(projectDetails.project.createdAt) * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

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

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Hash className="h-6 w-6 mr-3 text-blue-600" />
                Basic Information
              </h2>
              
              <div className="space-y-6">
                {/* Project Name & Tagline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => setProject(prev => ({...prev, name: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                    <input
                      type="text"
                      value={project.tagline}
                      onChange={(e) => setProject(prev => ({...prev, tagline: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="Brief, catchy description"
                    />
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={project.description}
                    onChange={(e) => setProject(prev => ({...prev, description: e.target.value}))}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="Describe your project..."
                  />
                </div>
                
                {/* Category & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={project.category}
                      onChange={(e) => setProject(prev => ({...prev, category: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Type</label>
                    <select
                      value={project.projectType}
                      onChange={(e) => setProject(prev => ({...prev, projectType: e.target.value}))}
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
              </div>
            </div>

            {/* Media & Links */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <ImageIcon className="h-6 w-6 mr-3 text-blue-600" />
                Media & Links
              </h2>
              
              <div className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Logo</label>
                  
                  {logoPreview && (
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <img
                          key={logoFile ? `${logoFile.name}-${logoFile.lastModified}` : `existing-${logoPreview}`}
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-32 h-32 object-cover rounded-xl border-2 border-blue-200 shadow-lg"
                          onLoad={() => console.log('Image loaded:', logoPreview)}
                          onError={(e) => {
                            console.log('Image failed to load:', e);
                            console.error('Image failed to load:', logoPreview);
                            setErrorMessage('Failed to load logo preview');
                          }}
                        />
                        {logoFile && !hasExistingLogo && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            New
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleLogoRemove}
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

                {/* Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Github className="h-4 w-4 mr-2" />
                      GitHub Repository
                    </label>
                    <input
                      type="url"
                      value={project.githubRepo}
                      onChange={(e) => setProject(prev => ({...prev, githubRepo: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="https://github.com/username/project"
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
                     onChange={(e) => setProject(prev => ({...prev, website: e.target.value}))}
                     className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                     placeholder="https://yourproject.com"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                     <Video className="h-4 w-4 mr-2" />
                     Demo Video
                   </label>
                   <input
                     type="url"
                     value={project.demoVideo}
                     onChange={(e) => setProject(prev => ({...prev, demoVideo: e.target.value}))}
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
                     onChange={(e) => setProject(prev => ({...prev, demoUrl: e.target.value}))}
                     className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                     placeholder="https://demo.yourproject.com"
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
                       onChange={(e) => setProject(prev => ({...prev, twitter: e.target.value}))}
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
                       onChange={(e) => setProject(prev => ({...prev, linkedin: e.target.value}))}
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
                       onChange={(e) => setProject(prev => ({...prev, discord: e.target.value}))}
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
                       onChange={(e) => setProject(prev => ({...prev, telegram: e.target.value}))}
                       className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                       placeholder="https://t.me/yourproject"
                     />
                   </div>
                 </div>
               </div>
             </div>
           </div>

           {/* Team & Contact */}
           <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50">
             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
               <Users className="h-6 w-6 mr-3 text-blue-600" />
               Team & Contact
             </h2>
             
             <div className="space-y-8">
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
                       onChange={(e) => setProject(prev => ({...prev, contactEmail: e.target.value}))}
                       className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                       placeholder="contact@yourproject.com"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                     <input
                       type="email"
                       value={project.businessEmail}
                       onChange={(e) => setProject(prev => ({...prev, businessEmail: e.target.value}))}
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
                 {(project.teamMembers || []).map((member, index) => (
                   <div key={index} className="bg-gray-50 rounded-xl p-6 mb-4 border border-gray-200">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       <input
                         type="text"
                         value={member.name || ''}
                         onChange={(e) => {
                           const updated = [...(project.teamMembers || [])];
                           updated[index] = {...member, name: e.target.value};
                           setProject(prev => ({...prev, teamMembers: updated}));
                         }}
                         className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                         placeholder="Full Name"
                       />
                       <input
                         type="text"
                         value={member.role || ''}
                         onChange={(e) => {
                           const updated = [...(project.teamMembers || [])];
                           updated[index] = {...member, role: e.target.value};
                           setProject(prev => ({...prev, teamMembers: updated}));
                         }}
                         className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                         placeholder="Role/Position"
                       />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <input
                         type="email"
                         value={member.email || ''}
                         onChange={(e) => {
                           const updated = [...(project.teamMembers || [])];
                           updated[index] = {...member, email: e.target.value};
                           setProject(prev => ({...prev, teamMembers: updated}));
                         }}
                         className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                         placeholder="Email"
                       />
                       <input
                         type="url"
                         value={member.linkedin || ''}
                         onChange={(e) => {
                           const updated = [...(project.teamMembers || [])];
                           updated[index] = {...member, linkedin: e.target.value};
                           setProject(prev => ({...prev, teamMembers: updated}));
                         }}
                         className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                         placeholder="LinkedIn URL"
                       />
                       <div className="flex">
                         <input
                           type="url"
                           value={member.twitter || ''}
                           onChange={(e) => {
                             const updated = [...(project.teamMembers || [])];
                             updated[index] = {...member, twitter: e.target.value};
                             setProject(prev => ({...prev, teamMembers: updated}));
                           }}
                           className="flex-1 px-4 py-2.5 rounded-l-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                           placeholder="Twitter URL"
                         />
                         {(project.teamMembers || []).length > 1 && (
                           <button
                             type="button"
                             onClick={() => {
                               const updated = [...(project.teamMembers || [])];
                               updated.splice(index, 1);
                               setProject(prev => ({...prev, teamMembers: updated}));
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
                   onClick={() => setProject(prev => ({
                     ...prev, 
                     teamMembers: [...(prev.teamMembers || []), {name: '', role: '', email: '', linkedin: '', twitter: ''}]
                   }))}
                   className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Team Member
                 </button>
               </div>
             </div>
           </div>

           {/* Technical Details */}
           <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50">
             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
               <Code className="h-6 w-6 mr-3 text-blue-600" />
               Technical Details
             </h2>
             
             <div className="space-y-8">
               {/* Blockchain & Development */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                     <Zap className="h-4 w-4 mr-2" />
                     Primary Blockchain
                   </label>
                   <select
                     value={project.blockchain}
                     onChange={(e) => setProject(prev => ({...prev, blockchain: e.target.value}))}
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
                     onChange={(e) => setProject(prev => ({...prev, license: e.target.value}))}
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
                 {(project.techStack || []).map((tech, index) => (
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
                     {(project.techStack || []).length > 1 && (
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
                 {(project.smartContracts || []).map((contract, index) => (
                   <div key={index} className="flex mb-3">
                     <input
                       type="text"
                       value={contract}
                       onChange={(e) => updateArrayItem('smartContracts', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                       placeholder="0x..."
                     />
                     {(project.smartContracts || []).length > 1 && (
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
                 {(project.keyFeatures || []).map((feature, index) => (
                   <div key={index} className="flex mb-3">
                     <input
                       type="text"
                       value={feature}
                       onChange={(e) => updateArrayItem('keyFeatures', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                       placeholder="Describe a key feature"
                     />
                     {(project.keyFeatures || []).length > 1 && (
                       <button
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
                     onChange={(e) => setProject(prev => ({...prev, innovation: e.target.value}))}
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
                     onChange={(e) => setProject(prev => ({...prev, targetAudience: e.target.value}))}
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
                 {(project.useCases || []).map((useCase, index) => (
                   <div key={index} className="flex mb-3">
                     <input
                       type="text"
                       value={useCase}
                       onChange={(e) => updateArrayItem('useCases', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 rounded-l-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                       placeholder="Describe a use case"
                     />
                     {(project.useCases || []).length > 1 && (
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

           {/* Campaign Information */}
           {projectCampaigns && projectCampaigns.length > 0 && (
             <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50">
               <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                 <Activity className="h-6 w-6 mr-3 text-blue-600" />
                 Campaign Participation
               </h2>
               
               <div className="space-y-4">
                 {projectCampaigns.map((campaign) => {
                   if (!campaign) return null;
                   const {
                     id,
                     name,
                     description,
                     startTime,
                     endTime,
                     status,
                     participation,
                     maxWinners,
                     adminFeePercentage
                   } = campaign;
                   return (
                     <div key={id.toString()} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                       <div className="flex items-start justify-between mb-4">
                         <div className="flex-1">
                           <h3 className="text-xl font-semibold text-gray-800 mb-2">{name}</h3>
                           <p className="text-gray-600 mb-3">{description}</p>
                           
                           <div className="flex items-center space-x-4 text-sm text-gray-500">
                             <span className="flex items-center">
                               <Calendar className="h-4 w-4 mr-1" />
                               {new Date(Number(startTime) * 1000).toLocaleDateString()} - {new Date(Number(endTime) * 1000).toLocaleDateString()}
                             </span>
                             <span className="flex items-center">
                               <Star className="h-4 w-4 mr-1" />
                               {participation.voteCount.toString()} votes
                             </span>
                           </div>
                         </div>
                         
                         <div className="flex flex-col items-end space-y-2">
                           <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                             status === 'active' ? 'bg-green-100 text-green-700' :
                             status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                             status === 'ended' ? 'bg-gray-100 text-gray-700' :
                             'bg-red-100 text-red-700'
                           }`}>
                             {status}
                           </span>
                           
                           {participation.approved ? (
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
                           <p className="text-2xl font-bold text-gray-800">{participation.voteCount.toString()}</p>
                           <p className="text-sm text-gray-500">Total Votes</p>
                         </div>
                         <div className="text-center">
                           <p className="text-2xl font-bold text-gray-800">{maxWinners.toString()}</p>
                           <p className="text-sm text-gray-500">Max Winners</p>
                         </div>
                         <div className="text-center">
                           <p className="text-2xl font-bold text-gray-800">{Number(adminFeePercentage)}%</p>
                           <p className="text-sm text-gray-500">Admin Fee</p>
                         </div>
                       </div>
                       
                       {participation.fundsReceived > 0n && (
                         <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                           <p className="text-green-700 font-medium">
                             Funds Received: {participation.fundsReceived.toString()} tokens
                           </p>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           {/* Submit Button */}
           <div className="flex justify-center pt-6">
             <button
               type="submit"
               disabled={isPending || isUploading || !canEdit}
               className="px-12 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center group border border-emerald-400/30"
             >
               {isPending || isUploading ? (
                 <>
                   <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                   {isUploading ? 'Uploading...' : 'Saving...'}
                 </>
               ) : (
                 <>
                   <Save className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                   Save Changes
                 </>
               )}
             </button>
           </div>
           
           {/* Progress Bar */}
           {(isPending || isUploading) && (
             <div className="mt-4">
             <div className="w-full bg-gray-200 rounded-full h-3">
               <div 
                 className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-300" 
                 style={{ width: `${saveProgress}%` }}
               ></div>
             </div>
             <p className="text-sm text-gray-500 mt-2 text-center">
               {saveProgress < 20 && 'Preparing...'}
               {saveProgress >= 20 && saveProgress < 40 && 'Processing...'}
               {saveProgress >= 40 && saveProgress < 60 && 'Uploading files...'}
               {saveProgress >= 60 && saveProgress < 80 && 'Preparing metadata...'}
               {saveProgress >= 80 && saveProgress < 100 && 'Updating project...'}
               {saveProgress >= 100 && 'Complete!'}
             </p>
           </div>
         )}
         
         {!canEdit && (
           <p className="mt-4 text-amber-600 text-center flex items-center justify-center">
             <AlertTriangle className="h-4 w-4 mr-2" />
             You need to be the project owner or an admin to edit this project
           </p>
         )}
       </form>
     </div>
   </div>
 </div>
);
};

export default EditProjectPage;