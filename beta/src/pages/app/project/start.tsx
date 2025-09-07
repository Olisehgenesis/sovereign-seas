import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjectRoute } from '@/utils/hashids';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  
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
} from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjectMethods';
import { uploadToIPFS } from '@/utils/imageUtils';
import type { LucideIcon } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { useChainSwitch } from '@/hooks/useChainSwitch';
import DynamicHelmet from '@/components/DynamicHelmet';
import { contractABI as abi } from '@/abi/seas4ABI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  required?: boolean;
  expandedSection: string;
  toggleSection: (section: string) => void;
  isVisible?: boolean;
}

const Section = ({ title, icon: Icon, children, required = false, isVisible = true }: SectionProps) => {
  if (!isVisible) return null;
  
  return (
    <Card className="mb-4 bg-transparent border-blue-100">
      <CardHeader className="pb-4">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-blue-600 mr-2" />
          <CardTitle className="text-lg">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
};

const contractAddress = import.meta.env.VITE_CONTRACT_V4;

type Project = {
  name: string;
  tagline: string;
  description: string;
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
};

type ArrayFields = 'tags' | 'techStack' | 'smartContracts' | 'keyFeatures' | 'useCases' | 'teamMembers' | 'milestones';

export default function CreateProject() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { ensureCorrectChain, targetChain } = useChainSwitch();
  const [isMounted, setIsMounted] = useState(false);
  const { createProject, isSuccess, isPending, error: contractError } = useCreateProject(contractAddress);
  
  // Collapsible sections state
  const [expandedSection, setExpandedSection] = useState('basic');
  
  // Card navigation state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardSections = ['basic', 'media', 'team', 'technical', 'review'];
  
  // File handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Main project state
  const [project, setProject] = useState<Project>({
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
    karmaGapProfile: '',
    documentation: '',
    
    // Social Media Links
    twitter: '',
    linkedin: '',
    discord: '',
    telegram: '',
    youtube: '',
    instagram: '',
    
    // Team & Contact Information
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
    
    // Milestones & Roadmap
    milestones: [{
      title: '',
      description: '',
      targetDate: '',
      status: 'planned' // planned, in-progress, completed
    }],
    
    // Project Status & Metrics
    status: 'active', // active, paused, completed, deprecated
    launchDate: '',
    userCount: '',
    transactionVolume: '',
    tvl: '',
    
    // Compliance & Security
    auditReports: [''],
    kycCompliant: false,
    regulatoryCompliance: [''],
    
    // Additional Metadata
    projectType: 'dapp', // dapp, protocol, infrastructure, tooling, defi, nft, gaming, dao
    maturityLevel: 'early', // concept, early, mvp, production, mature
    openSource: true,
    
    // Transferable ownership
    transferrable: true
  });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Cleanup function for memory management
  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);
  
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
    'Hardhat', 'Foundry', 'Truffle', 'IPFS', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Vercel', 'Netlify', 'Firebase'
  ];
  
  const licenses = [
    'MIT', 'Apache 2.0', 'GPL v3', 'GPL v2', 'BSD 3-Clause', 'BSD 2-Clause',
    'MPL 2.0', 'LGPL v3', 'AGPL v3', 'ISC', 'Unlicense', 'Proprietary', 'Other'
  ];
  
  const developmentStages = [
    'Concept', 'Design', 'Development', 'Testing', 'Beta', 'Production', 'Maintenance'
  ];
  
  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
    'Chile', 'China', 'Colombia', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Ecuador',
    'Egypt', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Hungary',
    'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg',
    'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan',
    'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia',
    'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden',
    'Switzerland', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Uruguay', 'Venezuela', 'Vietnam', 'Other'
  ];
  
  // Handle logo file selection and preview
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
      setProject({...project, logo: `File selected: ${file.name}`});
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl as string);
    }
  };
  
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
  
  const validateTeamContact = () => {
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
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateTechnicalDetails = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    const validTechStack = project.techStack.filter(tech => tech.trim() !== '');
    if (validTechStack.length === 0) {
      errors.techStack = ['At least one technology is required'];
      isValid = false;
    } else {
      errors.techStack = [''];
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateAllSteps = () => {
    return validateBasicInfo() && validateMediaLinks() && validateTeamContact() && 
           validateTechnicalDetails();
  };
  
  // Helper functions for dynamic arrays
  const addArrayItem = (field: ArrayFields, defaultValue = '') => {
    setProject({
      ...project,
      [field]: [...project[field], defaultValue]
    });
  };
  
  const removeArrayItem = (field: ArrayFields, index: number) => {
    const array = project[field];
    if (array.length <= 1) return;
    
    const updated = [...array];
    updated.splice(index, 1);
    setProject({
      ...project,
      [field]: updated
    });
  };
  
  const updateArrayItem = (field: ArrayFields, index: number, value: string) => {
    const array = project[field] as string[];
    const updated = [...array];
    updated[index] = value;
    setProject({
      ...project,
      [field]: updated
    });
  };
  
 

  // Submit handler
  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
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
      setUploadProgress(10);
      
      // Upload logo to IPFS if file is selected
      let logoIpfsUrl = '';
      if (logoFile) {
        try {
          setUploadProgress(30);
          logoIpfsUrl = await uploadToIPFS(logoFile);
        } catch (uploadError) {
          throw new Error(`Failed to upload logo: ${uploadError}`);
        }
      }
      
      setUploadProgress(80);
      setIsUploading(false);
      
      // Prepare project data with cleaned arrays
      const cleanedProject = {
        ...project,
        logo: logoIpfsUrl || project.logo || '',
        tags: project.tags.filter(tag => tag.trim() !== ''),
        keyFeatures: project.keyFeatures.filter(f => f.trim() !== ''),
        useCases: project.useCases.filter(u => u.trim() !== ''),
        techStack: project.techStack.filter(t => t.trim() !== ''),
        smartContracts: project.smartContracts.filter(c => c.trim() !== ''),
        teamMembers: project.teamMembers.filter(m => m.name.trim() !== ''),
        milestones: project.milestones.filter(m => m.title.trim() !== '')
      };
      
      // Create bio metadata (basic project info)
      const bioData = {
        tagline: cleanedProject.tagline,
        category: cleanedProject.category,
        tags: cleanedProject.tags,
        location: cleanedProject.location,
        establishedDate: cleanedProject.establishedDate,
        website: cleanedProject.website,
        projectType: cleanedProject.projectType,
        maturityLevel: cleanedProject.maturityLevel,
        status: cleanedProject.status,
        openSource: cleanedProject.openSource,
        transferrable: cleanedProject.transferrable
      };
      
      // Create contract info metadata (technical details)
      const contractInfoData = {
        blockchain: cleanedProject.blockchain,
        smartContracts: cleanedProject.smartContracts,
        techStack: cleanedProject.techStack,
        license: cleanedProject.license,
        developmentStage: cleanedProject.developmentStage,
        auditReports: cleanedProject.auditReports,
        kycCompliant: cleanedProject.kycCompliant,
        regulatoryCompliance: cleanedProject.regulatoryCompliance
      };
      
      // Create additional data metadata (everything else)
      const additionalData = {
        version: '1.0.0',
        timestamp: Date.now(),
        creator: address,
        
        // Media & Links
        logo: cleanedProject.logo,
        demoVideo: cleanedProject.demoVideo,
        demoUrl: cleanedProject.demoUrl,
        documentation: cleanedProject.documentation,
        karmaGapProfile: cleanedProject.karmaGapProfile,
        
        // Social Media
        social: {
          twitter: cleanedProject.twitter,
          linkedin: cleanedProject.linkedin,
          discord: cleanedProject.discord,
          telegram: cleanedProject.telegram,
          youtube: cleanedProject.youtube,
          instagram: cleanedProject.instagram
        },
        
        // Team & Contact
        teamMembers: cleanedProject.teamMembers,
        contactEmail: cleanedProject.contactEmail,
        businessEmail: cleanedProject.businessEmail,
        phone: cleanedProject.phone,
        
        // Features & Innovation
        keyFeatures: cleanedProject.keyFeatures,
        innovation: cleanedProject.innovation,
        useCases: cleanedProject.useCases,
        targetAudience: cleanedProject.targetAudience,
        
        // Milestones & Metrics
        milestones: cleanedProject.milestones,
        launchDate: cleanedProject.launchDate,
        userCount: cleanedProject.userCount,
        transactionVolume: cleanedProject.transactionVolume,
        tvl: cleanedProject.tvl
      };
      
      setUploadProgress(90);
      
      // Ensure we're on the correct chain before making the contract call
      console.log('- Ensuring correct chain...');
      await ensureCorrectChain();
      console.log(`- Now on correct chain: ${targetChain.name}`);

      // Call the contract method
      const tx = await createProject({
        name: cleanedProject.name,
        description: cleanedProject.description,
        bio: JSON.stringify(bioData),
        contractInfo: JSON.stringify(contractInfoData),
        additionalData: JSON.stringify(additionalData),
        contracts: cleanedProject.smartContracts
          .filter(c => c.trim() !== '')
          .map(c => c.startsWith('0x') ? c : `0x${c}`) as `0x${string}`[],
        transferrable: cleanedProject.transferrable
      });
      
      setUploadProgress(100);
      
      // Wait for transaction confirmation
      if (tx) {
        setSuccessMessage('Waiting for transaction confirmation...');
        const receipt = await publicClient?.waitForTransactionReceipt({ hash: tx });
        if (receipt && receipt.status === 'success') {
          setSuccessMessage('Project created successfully! Redirecting...');
          setTimeout(() => {
            navigate('/explorer/projects');
          }, 3000);
        } else {
          setErrorMessage('Transaction failed');
        }
      }
    } catch (error: unknown) {
      console.error('Project creation error:', error);
      
      let userFriendlyMessage = 'Failed to create project. ';
      
      if (error instanceof Error && error.message?.includes('user rejected')) {
        userFriendlyMessage += 'Transaction was rejected by user.';
      } else if (error instanceof Error && error.message?.includes('insufficient funds')) {
        userFriendlyMessage += 'Insufficient funds for transaction fees.';
      } else if (error instanceof Error && error.message?.includes('gas')) {
        userFriendlyMessage += 'Gas estimation failed. Please check your parameters.';
      } else if (error instanceof Error && error.message?.includes('network')) {
        userFriendlyMessage += 'Network error. Please check your connection and try again.';
      } else if (error instanceof Error && error.message?.includes('revert')) {
        userFriendlyMessage += 'Contract execution reverted. Please check your parameters.';
      } else {
        userFriendlyMessage += error instanceof Error ? error.message : 'Unknown error occurred.';
      }
      
      setErrorMessage(userFriendlyMessage);
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle contract success state
  useEffect(() => {
    if (isSuccess) {
      setLoading(false);
      setSuccessMessage('Project created successfully! Redirecting to your project in 3 seconds...');
      
      // Navigate to the new project after a short delay
      setTimeout(async () => {
        try {
          console.log('Reading project count after successful creation...');
          console.log('Contract address:', contractAddress);
          console.log('Public client available:', !!publicClient);
          
          // Wait a bit more for the transaction to be fully confirmed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Read the project count after successful creation to get the new project ID
          const updatedProjectCount = await publicClient?.readContract({
            address: contractAddress,
            abi,
            functionName: 'getProjectCount'
          });
          
          console.log('Updated project count:', updatedProjectCount);
          
          if (updatedProjectCount && Number(updatedProjectCount) > 0) {
            const newProjectId = Number(updatedProjectCount) - 1;
            console.log('Navigating to new project:', newProjectId);
            navigate(getProjectRoute(newProjectId));
          } else {
            // Fallback to projects list if we can't get the count
            console.log('Project count not available or zero, navigating to projects list');
            navigate('/explorer/projects');
          }
        } catch (error) {
          console.error('Error navigating to project:', error);
          // Fallback to projects list
          navigate('/explorer/projects');
        }
      }, 3000);
    }
  }, [isSuccess, contractAddress, publicClient, navigate]);

  // Handle contract error state
  useEffect(() => {
    if (contractError) {
      setLoading(false);
      setErrorMessage(`Transaction failed: ${contractError.message || 'Unknown error'}`);
    }
  }, [contractError]);

  // Update loading state based on contract pending state
  useEffect(() => {
    if (isPending && !isUploading) {
      setLoading(true);
    }
  }, [isPending, isUploading]);
  
  
  // Section toggle handler
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Card navigation functions
  const goToNextCard = () => {
    if (currentCardIndex < cardSections.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setExpandedSection(cardSections[currentCardIndex + 1]);
    }
  };

  const goToPreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setExpandedSection(cardSections[currentCardIndex - 1]);
    }
  };

  const goToCard = (index: number) => {
    setCurrentCardIndex(index);
    setExpandedSection(cardSections[index]);
  };
  
  if (!isMounted) {
    return null;
  }
  
  return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: 'Create Project',
        description: 'Create a new project on Sov Seas - Build and showcase your innovative blockchain project',
        image: '/og-image.png',
        url: window.location.href,
        type: 'website'
      }}
    />
    
    <div className="min-h-screen text-gray-800">
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Main Content */}
          <div>
          {/* Header */}
          <div className="mb-6">
            
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 bg-transparent backdrop-blur-sm rounded-xl p-3 border border-emerald-200 flex items-start">
              <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm">{successMessage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-4 bg-transparent backdrop-blur-sm rounded-xl p-3 border border-red-200 flex items-start">
              <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit}>
            {/* Basic Information Section */}
            <Section 
              id="basic" 
              title="Basic Information" 
              icon={Hash} 
              required 
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 0}
            >
              <div className="space-y-4">
                {/* Project Name & Tagline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <Hash className="h-4 w-4 mr-2" />
                      Project Name *
                    </Label>
                    <Input
                      type="text"
                      value={project.name}
                      onChange={(e) => setProject({...project, name: e.target.value})}
                      placeholder="Enter your project name"
                    />
                    {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <Star className="h-4 w-4 mr-2" />
                      Tagline *
                    </Label>
                    <Input
                      type="text"
                      value={project.tagline}
                      onChange={(e) => setProject({...project, tagline: e.target.value})}
                      placeholder="Brief, catchy description"
                    />
                    {formErrors.tagline && <p className="text-red-500 text-sm">{formErrors.tagline}</p>}
                  </div>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label className="flex items-center text-blue-700 font-medium">
                    <FileText className="h-4 w-4 mr-2" />
                    Project Description *
                  </Label>
                  <Textarea
                    value={project.description}
                    onChange={(e) => setProject({...project, description: e.target.value})}
                    rows={6}
                    placeholder="Provide a comprehensive description of your project, its purpose, and value proposition..."
                  />
                  {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
                  <p className="text-muted-foreground text-sm">Minimum 50 characters • {project.description.length} characters</p>
                </div>
                
                {/* Category & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <Tag className="h-4 w-4 mr-2" />
                      Category *
                    </Label>
                    <Select value={project.category} onValueChange={(value) => setProject({...project, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                      {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      </SelectContent>
                    </Select>
                    {formErrors.category && <p className="text-red-500 text-sm">{formErrors.category}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Project Type
                    </Label>
                    <Select value={project.projectType} onValueChange={(value) => setProject({...project, projectType: value as Project['projectType']})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dapp">DApp</SelectItem>
                        <SelectItem value="protocol">Protocol</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="tooling">Developer Tooling</SelectItem>
                        <SelectItem value="defi">DeFi</SelectItem>
                        <SelectItem value="nft">NFT</SelectItem>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="dao">DAO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <Label className="flex items-center text-blue-700 font-medium">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Tags
                  </Label>
                  {project.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="text"
                        value={tag}
                        onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                        placeholder="Enter tag (e.g., DeFi, Cross-chain)"
                        className="flex-1"
                      />
                      {project.tags.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('tags', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addArrayItem('tags')}
                    className="w-fit"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tag
                  </Button>
                </div>
                
                {/* Location & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <MapPin className="h-4 w-4 mr-2" />
                      Country
                    </Label>
                    <Select value={project.location} onValueChange={(value) => setProject({...project, location: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <Calendar className="h-4 w-4 mr-2" />
                      Established Date
                    </Label>
                    <Input
                      type="date"
                      value={project.establishedDate}
                      onChange={(e) => setProject({...project, establishedDate: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center text-blue-700 font-medium">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Label>
                    <Input
                      type="url"
                      value={project.website}
                      onChange={(e) => setProject({...project, website: e.target.value})}
                      placeholder="https://yourproject.com"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Media & Links Section */}
            <Section 
              id="media" 
              title="Media & Links" 
              icon={ImageIcon}
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 1}
            >
              <div className="space-y-4">
                {/* Logo Upload */}
                <div>
                  <label className="block text-blue-700 font-medium mb-2 flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Project Logo
                  </label>
                  
                  {logoPreview && (
                    <div className="mb-3 flex justify-center">
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
                  
                  <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                    
                      className="hidden"
                    />
                    <div className="space-y-3">
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
                          {logoFile ? 'Change Logo' : 'Choose Logo File'}
                        </button>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG, SVG up to 10MB</p>
                        <p className="text-xs text-gray-400 mt-1">Recommended: 400x400px square format</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Demo Video Link */}
                <div>
                  <label className="block text-blue-700 font-medium mb-2 flex items-center">
                    <Video className="h-4 w-4 mr-2" />
                    Demo Video Link
                  </label>
                  <input
                    type="url"
                    value={project.demoVideo}
                    onChange={(e) => setProject({...project, demoVideo: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-sm text-gray-500 mt-2">Enter a link to your demo video (YouTube, Vimeo, etc.)</p>
                </div>

                {/* Repository Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
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
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
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

                {/* Additional Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
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
                  
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-2" />
                      Karma GAP Profile
                    </label>
                    <input
                      type="url"
                      value={project.karmaGapProfile}
                      onChange={(e) => setProject({...project, karmaGapProfile: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                      placeholder="https://gap.karmahq.xyz/project/your-project"
                    />
                  </div>
                </div>

                {/* Social Media Links */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center">
                    <Globe2 className="h-5 w-5 mr-2" />
                    Social Media & Community
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </Section>

            {/* Team & Contact Section */}
            <Section 
              id="team" 
              title="Team & Contact" 
              icon={Users} 
              required
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 2}
            >
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-blue-700 font-medium mb-2">Contact Email *</label>
                      <input
                        type="email"
                        value={project.contactEmail}
                        onChange={(e) => setProject({...project, contactEmail: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        placeholder="contact@yourproject.com"
                      />
                      {formErrors.contactEmail && <p className="mt-2 text-red-500 text-sm">{formErrors.contactEmail}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-blue-700 font-medium mb-2">Business Email</label>
                      <input
                        type="email"
                        value={project.businessEmail}
                        onChange={(e) => setProject({...project, businessEmail: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        placeholder="business@yourproject.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team Members
                  </h3>
                  {project.teamMembers.map((member, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      teamMembers: [...project.teamMembers, {name: '', role: '', email: '', linkedin: '', twitter: '', avatar: ''}]
                    })}
                    className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </button>
                </div>
              </div>
            </Section>

            {/* Technical Details Section */}
            <Section 
              id="technical" 
              title="Technical Details" 
              icon={Code} 
              required
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 3}
            >
              <div className="space-y-6">
                {/* Blockchain & Tech Stack */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
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
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-2" />
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
                <div>
                  <label className="block text-blue-700 font-medium mb-2 flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    Technology Stack *
                  </label>
                  {project.techStack.map((tech, index) => (
                    <div key={index} className="flex mb-2">
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
                <div>
                  <label className="block text-blue-700 font-medium mb-2 flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    Smart Contract Addresses
                  </label>
                  {project.smartContracts.map((contract, index) => (
                    <div key={index} className="flex mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
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
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
                      <Heart className="h-4 w-4 mr-2" />
                      Open Source
                    </label>
                    <div className="flex items-center space-x-4 mt-2">
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

                {/* Key Features */}
                <div>
                  <label className="block text-blue-700 font-medium mb-2 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Key Features *
                  </label>
                  {project.keyFeatures.map((feature, index) => (
                    <div key={index} className="flex mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Innovation Statement
                    </label>
                    <textarea
                      value={project.innovation}
                      onChange={(e) => setProject({...project, innovation: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                      placeholder="What makes your project innovative?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-blue-700 font-medium mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Target Audience
                    </label>
                    <textarea
                      value={project.targetAudience}
                      onChange={(e) => setProject({...project, targetAudience: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                      placeholder="Who is your target audience?"
                    />
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <label className="block text-blue-700 font-medium mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Use Cases
                  </label>
                  {project.useCases.map((useCase, index) => (
                    <div key={index} className="flex mb-2">
                      <input
                        type="text"
                        value={useCase}
                        onChange={(e) => updateArrayItem('useCases', index, e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                        placeholder="Describe a use case"
                      />
                     {project.useCases.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('useCases', index)}
                         className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('useCases')}
                   className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Use Case
                 </button>
               </div>
             </div>
           </Section>

           {/* Review & Submit Section */}
           <Section 
             id="review" 
             title="Review & Submit" 
             icon={CheckCircle}
             expandedSection={expandedSection}
             toggleSection={toggleSection}
             isVisible={currentCardIndex === 4}
           >
             <div className="space-y-6">
               <div className="text-center mb-6">
                 <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mb-3">
                   <CheckCircle className="h-6 w-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Project Summary</h3>
                 <p className="text-gray-600 text-sm">Review your project details before submission</p>
               </div>

               {/* Basic Information Summary */}
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                   <Info className="h-4 w-4 mr-2 text-blue-500" />
                   Basic Information
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                   <Code className="h-4 w-4 mr-2 text-blue-500" />
                   Technical Details
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Blockchain:</span>
                     <p className="text-gray-800">{project.blockchain || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Development Stage:</span>
                     <p className="text-gray-800">{project.developmentStage || 'Not specified'}</p>
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
                 </div>
               </div>

               {/* Contact & Team Summary */}
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                   <Users className="h-4 w-4 mr-2 text-blue-500" />
                   Team & Contact
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Contact Email:</span>
                     <p className="text-gray-800">{project.contactEmail || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Team Members:</span>
                     <p className="text-gray-800">
                       {project.teamMembers.filter(m => m.name.trim() !== '').length} member(s)
                     </p>
                   </div>
                 </div>
               </div>

               {/* Links Summary */}
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                   <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
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
                   {project.karmaGapProfile && (
                     <div>
                       <span className="font-medium text-gray-600">Karma GAP:</span>
                       <a href={project.karmaGapProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                         {project.karmaGapProfile}
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

               {/* Project Metadata Info */}
               <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                 <div className="flex items-start">
                   <Info className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                   <div>
                     <p className="text-blue-700 font-medium mb-2">Project Metadata</p>
                     <p className="text-blue-600 text-sm">
                       Your project will be stored as JSON metadata on the blockchain, ensuring transparency and immutability. 
                       All media files will be uploaded to IPFS for decentralized storage.
                     </p>
                     <div className="mt-3 text-xs text-blue-600">
                       <p>• Total fields: {Object.keys(project).length}</p>
                       <p>• Media files: {(project.logo ? 1 : 0) + (project.demoVideo ? 1 : 0)}</p>
                       <p>• Team members: {project.teamMembers.filter(m => m.name.trim() !== '').length}</p>
                       <p>• Tech stack: {project.techStack.filter(t => t.trim() !== '').length} technologies</p>
                       <p>• Key features: {project.keyFeatures.filter(f => f.trim() !== '').length} features</p>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Upload Progress */}
               {loading && (
                 <div className="bg-white rounded-xl p-4 border border-gray-200">
                   <div className="flex items-center justify-between mb-2">
                     <span className="font-medium text-gray-700">Uploading Project</span>
                     <span className="text-sm text-gray-500">{uploadProgress}%</span>
                   </div>
                   <div className="w-full bg-gray-200 rounded-full h-2">
                     <div 
                       className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                       style={{ width: `${uploadProgress}%` }}
                     ></div>
                   </div>
                   <p className="text-sm text-gray-500 mt-2">
                     {uploadProgress < 20 && 'Preparing files...'}
                     {uploadProgress >= 20 && uploadProgress < 40 && 'Uploading logo...'}
                     {uploadProgress >= 40 && uploadProgress < 60 && 'Uploading demo video...'}
                     {uploadProgress >= 60 && uploadProgress < 80 && 'Processing media...'}
                     {uploadProgress >= 80 && uploadProgress < 100 && 'Creating metadata...'}
                     {uploadProgress >= 100 && 'Finalizing...'}
                   </p>
                 </div>
               )}
             </div>
           </Section>

           {/* Card Navigation */}
           <div className="flex justify-between items-center mt-6 mb-4">
             <Button
               type="button"
               variant="outline"
               onClick={goToPreviousCard}
               disabled={currentCardIndex === 0}
               className="flex items-center"
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Previous
             </Button>
             
             <div className="flex items-center space-x-2">
               {cardSections.map((_, index) => (
                 <button
                   key={index}
                   onClick={() => goToCard(index)}
                   className={`w-3 h-3 rounded-full transition-colors ${
                     index === currentCardIndex 
                       ? 'bg-blue-600' 
                       : index < currentCardIndex 
                         ? 'bg-green-500' 
                         : 'bg-gray-300'
                   }`}
                 />
               ))}
             </div>
             
             <Button
               type="button"
               variant="outline"
               onClick={goToNextCard}
               disabled={currentCardIndex === cardSections.length - 1}
               className="flex items-center"
             >
               Next
               <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
             </Button>
           </div>

           {/* Submit Button - Only show on last step */}
           {currentCardIndex === cardSections.length - 1 && (
             <div className="mt-6 space-y-4">
               <div className="flex justify-center pt-4">
                 <Button
                   type="submit"
                   disabled={loading || !isConnected}
                   size="lg"
                   variant="default"
                   className="px-10 py-3 font-bold text-base hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none group relative overflow-hidden"
                 >
                   {loading ? (
                     <>
                       <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                       Creating Project...
                     </>
                   ) : (
                     <>
                       <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                       Create Project
                       <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                     </>
                   )}
                 </Button>
               </div>
               
               {!isConnected && (
                 <p className="mt-3 text-amber-600 text-center flex items-center justify-center text-sm">
                   <AlertTriangle className="h-4 w-4 mr-2" />
                   Please connect your wallet to create a project
                 </p>
               )}
               
               <div className="text-center text-xs text-gray-500 mt-3">
                 <p>* Required fields must be completed before submission</p>
               </div>
             </div>
           )}
         </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}