// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react';
import { useProjectDetails, useUpdateProject, useUpdateProjectMetadata } from '@/hooks/useProjectMethods';
import { useParams, useNavigate } from '@/utils/nextAdapter';
import { parseIdParam } from '@/utils/hashids';
import { useChainSwitch } from '@/hooks/useChainSwitch';
import { useAccount } from 'wagmi';
import { usePrivy, useConnectOrCreateWallet } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
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
  AlertTriangle,
  Github,
  Linkedin,
  Youtube,
  Instagram,
  MessageCircle,
  Phone,
  Mail,
  Building2,
  MapPin,
  Briefcase,
  Award,
  Rocket,
  Zap,
  Star,
  Heart,
  Eye,
  Edit3,
  FileText,
  Settings,
  Lock,
  Activity
} from 'lucide-react';
import { uploadToIPFS, formatIpfsUrl } from '@/utils/imageUtils';

interface ProjectFormData {
  id: number;
  owner: string;
  name: string;
  description: string;
  tagline: string;
  category: string;
  tags: string[];
  location: string;
  establishedDate: string;
  website: string;
  logo: string;
  demoVideo: string;
  demoUrl: string;
  githubRepo: string;
  karmaGapProfile: string;
  documentation: string;
  twitter: string;
  linkedin: string;
  discord: string;
  telegram: string;
  youtube: string;
  instagram: string;
  teamMembers: Array<{
    name: string;
    role: string;
    email: string;
    linkedin: string;
    twitter: string;
    avatar: string;
  }>;
  contactEmail: string;
  businessEmail: string;
  phone: string;
  techStack: string[];
  blockchain: string;
  smartContracts: string[];
  license: string;
  developmentStage: string;
  keyFeatures: string[];
  innovation: string;
  useCases: string[];
  targetAudience: string;
  milestones: Array<{
    title: string;
    description: string;
    targetDate: string;
    status: 'planned' | 'in-progress' | 'completed';
  }>;
  status: 'active' | 'paused' | 'completed' | 'deprecated';
  launchDate: string;
  userCount: string;
  transactionVolume: string;
  tvl: string;
  auditReports: string[];
  kycCompliant: boolean;
  regulatoryCompliance: string[];
  projectType: 'dapp' | 'protocol' | 'infrastructure' | 'tooling' | 'defi' | 'nft' | 'gaming' | 'dao';
  maturityLevel: 'concept' | 'early' | 'mvp' | 'production' | 'mature';
  openSource: boolean;
  transferrable: boolean;
}

type ProjectField = keyof ProjectFormData;

const Section = ({ 
  id, 
  title, 
  icon: Icon, 
  children, 
  isExpanded, 
  onToggle, 
  hasChanges = false,
  hasErrors = false 
}: {
  id: string;
  title: string;
  icon: any;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  hasChanges?: boolean;
  hasErrors?: boolean;
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-gray-50/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasErrors ? 'bg-red-100' : hasChanges ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Icon className={`h-5 w-5 ${hasErrors ? 'text-red-600' : hasChanges ? 'text-blue-600' : 'text-gray-600'}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {hasChanges && (
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
          {hasErrors && (
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
};

export default function EditProjectDetails() {
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState('basic');
  const params = useParams();
  const navigate = useNavigate();
  
  // Use Privy hooks for authentication (same as header)
  const { authenticated, logout, ready } = usePrivy();
  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: async ({ wallet }) => {
      console.log('[EditProject] connectOrCreateWallet success. Wallet:', wallet?.address);
    },
    onError: async (error) => {
      console.error('[EditProject] connectOrCreateWallet error:', error);
    }
  });
  
  // Use active wallet hook (same as header)
  const { address, walletsReady } = useActiveWallet();
  
  // Force mainnet - use direct environment variable
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4 as `0x${string}`;
  
  // Chain switching hook
  const { 
    ensureCorrectChain, 
    isSwitching, 
    targetChain, 
    isOnCorrectChain, 
    switchToCorrectChain, 
    currentChainId
  } = useChainSwitch();
  
  // Get project ID from URL params
  const parsedId = parseIdParam(params?.id);
  const projectId = parsedId ? BigInt(parsedId) : BigInt(0);
  
  // Fetch project details using the hook
  const { projectDetails, isLoading: loadingDetails, error: detailsError, refetch } = useProjectDetails(contractAddress, projectId);
  
  // Update hooks
  const { 
    updateProject, 
    isPending: isUpdatingProject, 
    isError: updateProjectError, 
    isSuccess: updateProjectSuccess 
  } = useUpdateProject(contractAddress);
  
  const { 
    updateProjectMetadata, 
    isPending: isUpdatingMetadata, 
    isError: updateMetadataError, 
    isSuccess: updateMetadataSuccess 
  } = useUpdateProjectMetadata(contractAddress);
  
  // Initialize project state with data from the hook
  const [originalProject, setOriginalProject] = useState<ProjectFormData | null>(null);
  const [project, setProject] = useState<ProjectFormData | null>(null);
  
  // Check if user is the project owner
  const isOwner = authenticated && walletsReady && address && project && address.toLowerCase() === project.owner?.toLowerCase();
  
  // Debug logging for wallet connection
  console.log('Wallet Connection Debug:', {
    authenticated,
    walletsReady,
    address,
    projectOwner: project?.owner,
    isOwner,
    projectId: projectId.toString(),
    hasProject: !!project
  });
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    contactEmail: '',
    website: ''
  });

  const projectTypes = [
    { value: 'dapp', label: 'DApp' },
    { value: 'protocol', label: 'Protocol' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'tooling', label: 'Tooling' },
    { value: 'defi', label: 'DeFi' },
    { value: 'nft', label: 'NFT' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'dao', label: 'DAO' }
  ];

  const maturityLevels = [
    { value: 'concept', label: 'Concept' },
    { value: 'early', label: 'Early Stage' },
    { value: 'mvp', label: 'MVP' },
    { value: 'production', label: 'Production' },
    { value: 'mature', label: 'Mature' }
  ];

  const developmentStages = [
    { value: 'planning', label: 'Planning' },
    { value: 'development', label: 'Development' },
    { value: 'testing', label: 'Testing' },
    { value: 'launch', label: 'Launch' },
    { value: 'maintenance', label: 'Maintenance' }
  ];

  // Safe JSON parsing function
  const safeJsonParse = (jsonString: string, fallback = {}) => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
      return fallback;
    }
  };

  // Initialize project data when details are loaded
  useEffect(() => {
    if (projectDetails && !originalProject) {
      try {
        // Parse metadata safely
        const bioData = safeJsonParse(projectDetails.metadata.bio);
        const contractInfo = safeJsonParse(projectDetails.metadata.contractInfo);
        const additionalData = safeJsonParse(projectDetails.metadata.additionalData);

        const projectData: ProjectFormData = {
          id: Number(projectDetails.project.id),
          owner: projectDetails.project.owner,
          name: projectDetails.project.name,
          description: projectDetails.project.description,
          tagline: bioData.tagline || '',
          category: bioData.category || '',
          tags: bioData.tags || [''],
          location: bioData.location || '',
          establishedDate: bioData.establishedDate || '',
          website: bioData.website || '',
          logo: additionalData.media?.logo || additionalData.logo || '',
          demoVideo: additionalData.media?.demoVideo || additionalData.demoVideo || '',
          demoUrl: additionalData.links?.demoUrl || additionalData.demoUrl || '',
          githubRepo: additionalData.links?.githubRepo || additionalData.githubRepo || '',
          karmaGapProfile: additionalData.links?.karmaGapProfile || additionalData.karmaGapProfile || '',
          documentation: additionalData.links?.documentation || additionalData.documentation || '',
          twitter: additionalData.links?.twitter || additionalData.social?.twitter || additionalData.twitter || '',
          linkedin: additionalData.links?.linkedin || additionalData.social?.linkedin || additionalData.linkedin || '',
          discord: additionalData.links?.discord || additionalData.social?.discord || additionalData.discord || '',
          telegram: additionalData.links?.telegram || additionalData.social?.telegram || additionalData.telegram || '',
          youtube: additionalData.links?.youtube || additionalData.social?.youtube || additionalData.youtube || '',
          instagram: additionalData.links?.instagram || additionalData.social?.instagram || additionalData.instagram || '',
          teamMembers: additionalData.teamMembers || [{
            name: '',
            role: '',
            email: '',
            linkedin: '',
            twitter: '',
            avatar: ''
          }],
          contactEmail: additionalData.contactEmail || '',
          businessEmail: additionalData.businessEmail || '',
          phone: additionalData.phone || '',
          techStack: contractInfo.techStack || [''],
          blockchain: contractInfo.blockchain || '',
          smartContracts: contractInfo.smartContracts || [''],
          license: contractInfo.license || '',
          developmentStage: contractInfo.developmentStage || '',
          keyFeatures: additionalData.keyFeatures || [''],
          innovation: additionalData.innovation || '',
          useCases: additionalData.useCases || [''],
          targetAudience: additionalData.targetAudience || '',
          milestones: additionalData.milestones || [{
            title: '',
            description: '',
            targetDate: '',
            status: 'planned'
          }],
          status: bioData.status || 'active',
          launchDate: additionalData.launchDate || '',
          userCount: additionalData.userCount || '',
          transactionVolume: additionalData.transactionVolume || '',
          tvl: additionalData.tvl || '',
          auditReports: contractInfo.auditReports || [''],
          kycCompliant: contractInfo.kycCompliant || false,
          regulatoryCompliance: contractInfo.regulatoryCompliance || [''],
          projectType: bioData.projectType || 'dapp',
          maturityLevel: bioData.maturityLevel || 'early',
          openSource: bioData.openSource !== undefined ? bioData.openSource : true,
          transferrable: projectDetails.project.transferrable
        };

        setOriginalProject(projectData);
        setProject(projectData);
      } catch (error) {
        console.error('Error parsing project data:', error);
        setErrorMessage('Failed to load project data');
      }
    }
  }, [projectDetails, originalProject]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for changes
  const hasChanges = useMemo(() => {
    if (!originalProject || !project) return false;
    return JSON.stringify(originalProject) !== JSON.stringify(project);
  }, [originalProject, project]);

  // Form validation
  const validateForm = () => {
    const errors = {
      name: '',
      description: '',
      contactEmail: '',
      website: ''
    };

    if (!project?.name?.trim()) {
      errors.name = 'Project name is required';
    }

    if (!project?.description?.trim()) {
      errors.description = 'Project description is required';
    }

    if (project?.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(project.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
    }

    if (project?.website && !/^https?:\/\/.+/.test(project.website)) {
      errors.website = 'Please enter a valid URL (starting with http:// or https://)';
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // Handle form field changes
  const handleFieldChange = (field: ProjectField, value: any) => {
    if (!project) return;
    
    setProject(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  // Handle array field changes
  const handleArrayFieldChange = (field: ProjectField, index: number, value: string) => {
    if (!project) return;
    
    const currentArray = project[field] as string[];
    const newArray = [...currentArray];
    newArray[index] = value;
    
    setProject(prev => ({
      ...prev!,
      [field]: newArray
    }));
  };

  // Add new item to array field
  const addArrayItem = (field: ProjectField) => {
    if (!project) return;
    
    const currentArray = project[field] as string[];
    setProject(prev => ({
      ...prev!,
      [field]: [...currentArray, '']
    }));
  };

  // Remove item from array field
  const removeArrayItem = (field: ProjectField, index: number) => {
    if (!project) return;
    
    const currentArray = project[field] as string[];
    if (currentArray.length <= 1) return; // Keep at least one item
    
    const newArray = currentArray.filter((_, i) => i !== index);
    setProject(prev => ({
      ...prev!,
      [field]: newArray
    }));
  };

  // Handle team member changes
  const handleTeamMemberChange = (index: number, field: string, value: string) => {
    if (!project) return;
    
    const newTeamMembers = [...project.teamMembers];
    newTeamMembers[index] = {
      ...newTeamMembers[index],
      [field]: value
    };
    
    setProject(prev => ({
      ...prev!,
      teamMembers: newTeamMembers
    }));
  };

  // Handle milestone changes
  const handleMilestoneChange = (index: number, field: string, value: string) => {
    if (!project) return;
    
    const newMilestones = [...project.milestones];
    newMilestones[index] = {
      ...newMilestones[index],
      [field]: value
    };
    
    setProject(prev => ({
      ...prev!,
      milestones: newMilestones
    }));
  };

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fixed submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !projectId || !contractAddress) {
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
      let logoUrl = project.logo;
      if (logoFile) {
        try {
          logoUrl = await uploadToIPFS(logoFile);
        } catch (err) {
          setErrorMessage('Failed to upload logo to IPFS');
          return;
        }
      }

      // Prepare metadata
      const bioData = {
        tagline: project.tagline,
        category: project.category,
        tags: project.tags.filter(tag => tag.trim() !== ''),
        location: project.location,
        establishedDate: project.establishedDate,
        website: project.website,
        logo: logoUrl,
        demoVideo: project.demoVideo,
        demoUrl: project.demoUrl,
        githubRepo: project.githubRepo,
        karmaGapProfile: project.karmaGapProfile,
        documentation: project.documentation,
        twitter: project.twitter,
        linkedin: project.linkedin,
        discord: project.discord,
        telegram: project.telegram,
        youtube: project.youtube,
        instagram: project.instagram,
        teamMembers: project.teamMembers.filter(member => member.name.trim() !== ''),
        contactEmail: project.contactEmail,
        businessEmail: project.businessEmail,
        phone: project.phone,
        techStack: project.techStack.filter(tech => tech.trim() !== ''),
        blockchain: project.blockchain
      };

      const contractInfo = {
        smartContracts: project.smartContracts.filter(contract => contract.trim() !== ''),
        license: project.license,
        developmentStage: project.developmentStage
      };

      const additionalData = {
        keyFeatures: project.keyFeatures.filter(feature => feature.trim() !== ''),
        innovation: project.innovation,
        useCases: project.useCases.filter(useCase => useCase.trim() !== ''),
        targetAudience: project.targetAudience,
        milestones: project.milestones.filter(milestone => milestone.title.trim() !== ''),
        status: project.status,
        launchDate: project.launchDate,
        userCount: project.userCount,
        transactionVolume: project.transactionVolume,
        tvl: project.tvl,
        auditReports: project.auditReports.filter(report => report.trim() !== ''),
        kycCompliant: project.kycCompliant,
        regulatoryCompliance: project.regulatoryCompliance.filter(compliance => compliance.trim() !== ''),
        projectType: project.projectType,
        maturityLevel: project.maturityLevel,
        openSource: project.openSource
      };

      // Update project metadata
      await updateProjectMetadata({
        projectId,
        metadataType: 1, // bio
        newData: JSON.stringify(bioData)
      });

      await updateProjectMetadata({
        projectId,
        metadataType: 2, // contractInfo
        newData: JSON.stringify(contractInfo)
      });

      await updateProjectMetadata({
        projectId,
        metadataType: 3, // additionalData
        newData: JSON.stringify(additionalData)
      });

      // Update basic project info
      await updateProject({
        projectId,
        name: project.name,
        description: project.description,
        bio: JSON.stringify(bioData),
        contractInfo: JSON.stringify(contractInfo),
        additionalData: JSON.stringify(additionalData),
        contracts: projectDetails?.contracts || []
      });

      setSuccessMessage('Project updated successfully!');
      setTimeout(() => {
        navigate(`/explorer/project/${params.id}`);
      }, 2000);

    } catch (error) {
      console.error('Error updating project:', error);
      setErrorMessage('Failed to update project. Please try again.');
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check wallet connection
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Wallet Required</h1>
          <p className="text-gray-600 mb-6">
            You need to connect your wallet to edit project details.
          </p>
          <button 
            onClick={() => navigate('/explorer/projects')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    console.error('Invalid contract address:', contractAddress);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Configuration Error</p>
          <div className="text-sm text-gray-500 mb-4 space-y-1">
            <p>Contract address is missing or invalid</p>
            <p>Address: {contractAddress || 'undefined'}</p>
            <p>Please check your environment variables</p>
          </div>
          <button 
            onClick={() => navigate('/explorer/projects')}
            className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (detailsError || !projectDetails || projectId === BigInt(0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Failed to load project details</p>
          <div className="text-sm text-gray-500 mb-4 space-y-1">
            <p>Project ID: {params?.id}</p>
            <p>Parsed ID: {parsedId}</p>
            <p>Contract: {contractAddress ? 'Set' : 'Missing'}</p>
            {projectId === BigInt(0) && <p className="text-red-500">Invalid project ID</p>}
            {detailsError && <p className="text-red-500">Error: {detailsError.message}</p>}
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/explorer/projects')}
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Projects
            </button>
            <button 
              onClick={() => refetch()}
              className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Preparing project data...</p>
        </div>
      </div>
    );
  }

  // Check if user is the project owner
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 text-red-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You can only edit projects that you own. This project belongs to a different wallet.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate(`/explorer/project/${params.id}`)}
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Project
            </button>
            <button 
              onClick={() => navigate('/explorer/projects')}
              className="block w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/explorer/project/${params.id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Edit Project</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">{project.name}</p>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Connected
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {hasChanges && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Unsaved changes
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!hasChanges || isUpdatingProject || isUpdatingMetadata}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdatingProject || isUpdatingMetadata ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Section
            id="basic"
            title="Basic Information"
            icon={Info}
            isExpanded={expandedSection === 'basic'}
            onToggle={() => setExpandedSection(expandedSection === 'basic' ? '' : 'basic')}
            hasChanges={hasChanges}
            hasErrors={!!(formErrors.name || formErrors.description)}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter project name"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={project.tagline}
                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief project tagline"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={project.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your project in detail"
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={project.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., DeFi, NFT, Gaming"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Type
                  </label>
                  <select
                    value={project.projectType}
                    onChange={(e) => handleFieldChange('projectType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {projectTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="space-y-2">
                  {project.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleArrayFieldChange('tags', index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter a tag"
                      />
                      {project.tags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tags', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('tags')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Tag
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Media & Links */}
          <Section
            id="media"
            title="Media & Links"
            icon={ImageIcon}
            isExpanded={expandedSection === 'media'}
            onToggle={() => setExpandedSection(expandedSection === 'media' ? '' : 'media')}
            hasChanges={hasChanges}
          >
            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : project.logo ? (
                      <img src={formatIpfsUrl(project.logo)} alt="Current logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2 inline" />
                      Upload Logo
                    </button>
                    <p className="text-sm text-gray-500 mt-1">
                      Recommended: 400x400px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={project.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.website ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="https://yourproject.com"
                  />
                  {formErrors.website && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.website}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Demo URL
                  </label>
                  <input
                    type="url"
                    value={project.demoUrl}
                    onChange={(e) => handleFieldChange('demoUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://demo.yourproject.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demo Video
                </label>
                <input
                  type="url"
                  value={project.demoVideo}
                  onChange={(e) => handleFieldChange('demoVideo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="YouTube, Vimeo, or other video URL"
                />
              </div>
            </div>
          </Section>

          {/* Contact Information */}
          <Section
            id="contact"
            title="Contact Information"
            icon={Mail}
            isExpanded={expandedSection === 'contact'}
            onToggle={() => setExpandedSection(expandedSection === 'contact' ? '' : 'contact')}
            hasChanges={hasChanges}
            hasErrors={!!formErrors.contactEmail}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={project.contactEmail}
                    onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.contactEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="contact@yourproject.com"
                  />
                  {formErrors.contactEmail && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.contactEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={project.businessEmail}
                    onChange={(e) => handleFieldChange('businessEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="business@yourproject.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={project.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={project.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="City, Country"
                />
              </div>
            </div>
          </Section>

          {/* Social Media */}
          <Section
            id="social"
            title="Social Media"
            icon={Users}
            isExpanded={expandedSection === 'social'}
            onToggle={() => setExpandedSection(expandedSection === 'social' ? '' : 'social')}
            hasChanges={hasChanges}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Twitter className="h-4 w-4 inline mr-2" />
                    Twitter
                  </label>
                  <input
                    type="url"
                    value={project.twitter}
                    onChange={(e) => handleFieldChange('twitter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://twitter.com/yourproject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Linkedin className="h-4 w-4 inline mr-2" />
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={project.linkedin}
                    onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://linkedin.com/company/yourproject"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle className="h-4 w-4 inline mr-2" />
                    Discord
                  </label>
                  <input
                    type="url"
                    value={project.discord}
                    onChange={(e) => handleFieldChange('discord', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://discord.gg/yourproject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle className="h-4 w-4 inline mr-2" />
                    Telegram
                  </label>
                  <input
                    type="url"
                    value={project.telegram}
                    onChange={(e) => handleFieldChange('telegram', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://t.me/yourproject"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Youtube className="h-4 w-4 inline mr-2" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={project.youtube}
                    onChange={(e) => handleFieldChange('youtube', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://youtube.com/c/yourproject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="h-4 w-4 inline mr-2" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={project.instagram}
                    onChange={(e) => handleFieldChange('instagram', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://instagram.com/yourproject"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Technical Details */}
          <Section
            id="technical"
            title="Technical Details"
            icon={Code}
            isExpanded={expandedSection === 'technical'}
            onToggle={() => setExpandedSection(expandedSection === 'technical' ? '' : 'technical')}
            hasChanges={hasChanges}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Repository
                  </label>
                  <input
                    type="url"
                    value={project.githubRepo}
                    onChange={(e) => handleFieldChange('githubRepo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://github.com/yourorg/yourproject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation
                  </label>
                  <input
                    type="url"
                    value={project.documentation}
                    onChange={(e) => handleFieldChange('documentation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://docs.yourproject.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tech Stack
                </label>
                <div className="space-y-2">
                  {project.techStack.map((tech, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tech}
                        onChange={(e) => handleArrayFieldChange('techStack', index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., React, Solidity, Node.js"
                      />
                      {project.techStack.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('techStack', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('techStack')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Technology
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blockchain
                  </label>
                  <input
                    type="text"
                    value={project.blockchain}
                    onChange={(e) => handleFieldChange('blockchain', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Ethereum, Celo, Polygon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License
                  </label>
                  <input
                    type="text"
                    value={project.license}
                    onChange={(e) => handleFieldChange('license', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., MIT, Apache 2.0, GPL-3.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Smart Contracts
                </label>
                <div className="space-y-2">
                  {project.smartContracts.map((contract, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={contract}
                        onChange={(e) => handleArrayFieldChange('smartContracts', index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contract address or name"
                      />
                      {project.smartContracts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('smartContracts', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('smartContracts')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Contract
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Project Status */}
          <Section
            id="status"
            title="Project Status"
            icon={Activity}
            isExpanded={expandedSection === 'status'}
            onToggle={() => setExpandedSection(expandedSection === 'status' ? '' : 'status')}
            hasChanges={hasChanges}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={project.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maturity Level
                  </label>
                  <select
                    value={project.maturityLevel}
                    onChange={(e) => handleFieldChange('maturityLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {maturityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Launch Date
                  </label>
                  <input
                    type="date"
                    value={project.launchDate}
                    onChange={(e) => handleFieldChange('launchDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Established Date
                  </label>
                  <input
                    type="date"
                    value={project.establishedDate}
                    onChange={(e) => handleFieldChange('establishedDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={project.openSource}
                    onChange={(e) => handleFieldChange('openSource', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Open Source</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={project.kycCompliant}
                    onChange={(e) => handleFieldChange('kycCompliant', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">KYC Compliant</span>
                </label>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
