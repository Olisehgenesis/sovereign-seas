import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useCreateProject } from './useProjectMethods';

export interface ProjectFormData {
  // Basic Information
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  location: string;
  establishedDate: string;
  website: string;
  
  // Media & Links
  logo: string;
  coverImage: string;
  gallery: string[];
  demoVideo: string;
  demoUrl: string;
  
  // Repository & Technical Links
  githubRepo: string;
  npmPackage: string;
  documentation: string;
  
  // Social Media Links
  twitter: string;
  linkedin: string;
  discord: string;
  telegram: string;
  youtube: string;
  instagram: string;
  
  // Team & Contact Information
  teamMembers: {
    name: string;
    role: string;
    email: string;
    linkedin: string;
    twitter: string;
    avatar: string;
  }[];
  contactEmail: string;
  businessEmail: string;
  phone: string;
  
  // Technical Details
  techStack: string[];
  blockchain: string;
  smartContracts: string[];
  license: string;
  developmentStage: string;
  
  // Features & Innovation
  keyFeatures: string[];
  innovation: string;
  useCases: string[];
  targetAudience: string;
  
  // Funding & Business Model
  fundingStage: string;
  fundingGoal: string;
  tokenomics: string;
  businessModel: string;
  revenueStreams: string[];
  
  // Milestones & Roadmap
  milestones: {
    title: string;
    description: string;
    targetDate: string;
    status: 'planned' | 'in-progress' | 'completed';
  }[];
  
  // Project Status & Metrics
  status: 'active' | 'paused' | 'completed' | 'deprecated';
  launchDate: string;
  userCount: string;
  transactionVolume: string;
  tvl: string;
  
  // Compliance & Security
  auditReports: string[];
  kycCompliant: boolean;
  regulatoryCompliance: string[];
  
  // Additional Metadata
  projectType: 'dapp' | 'protocol' | 'infrastructure' | 'tooling' | 'defi' | 'nft' | 'gaming' | 'dao';
  maturityLevel: 'concept' | 'early' | 'mvp' | 'production' | 'mature';
  openSource: boolean;
  
  // Transferable ownership
  transferrable: boolean;
}

const initialFormData: ProjectFormData = {
  name: '',
  tagline: '',
  description: '',
  category: '',
  tags: [''],
  location: '',
  establishedDate: '',
  website: '',
  logo: '',
  coverImage: '',
  gallery: [''],
  demoVideo: '',
  demoUrl: '',
  githubRepo: '',
  npmPackage: '',
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
  fundingStage: '',
  fundingGoal: '',
  tokenomics: '',
  businessModel: '',
  revenueStreams: [''],
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
};

export function useProjectForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [currentStage, setCurrentStage] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { createProject, isPending, isError, error, isSuccess } = useCreateProject(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`);

  const validateStage = (stage: number) => {
    const errors: Record<string, string> = {};
    
    switch (stage) {
      case 1: // Basic Info
        if (!formData.name.trim()) errors.name = 'Project name is required';
        if (!formData.tagline.trim()) errors.tagline = 'Project tagline is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.description.trim().length < 50) errors.description = 'Description must be at least 50 characters long';
        if (!formData.category) errors.category = 'Category is required';
        break;
        
      case 2: // Media & Links
        if (formData.githubRepo && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(formData.githubRepo)) {
          errors.githubRepo = 'Please enter a valid GitHub URL';
        }
        break;
        
      case 3: // Team & Contact
        if (!formData.contactEmail.trim()) errors.contactEmail = 'Contact email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
          errors.contactEmail = 'Please enter a valid email address';
        }
        break;
        
      case 4: // Technical Details
        if (formData.techStack.filter(tech => tech.trim() !== '').length === 0) {
          errors.techStack = 'At least one technology is required';
        }
        break;
        
      case 5: // Funding & Goals
        if (formData.keyFeatures.filter(feature => feature.trim() !== '').length === 0) {
          errors.keyFeatures = 'At least one key feature is required';
        }
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStage(currentStage) && currentStage < 6) {
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

  const updateFormData = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addArrayItem = (field: keyof ProjectFormData, defaultValue: any = '') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[]), defaultValue]
    }));
  };

  const removeArrayItem = (field: keyof ProjectFormData, index: number) => {
    setFormData(prev => {
      const array = prev[field] as any[];
      if (array.length <= 1) return prev;
      
      const updated = [...array];
      updated.splice(index, 1);
      return {
        ...prev,
        [field]: updated
      };
    });
  };

  const updateArrayItem = (field: keyof ProjectFormData, index: number, value: any) => {
    setFormData(prev => {
      const array = prev[field] as any[];
      const updated = [...array];
      updated[index] = value;
      return {
        ...prev,
        [field]: updated
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to create a project');
      return;
    }
    
    if (!validateStage(currentStage)) {
      setErrorMessage('Please fix the validation errors before submitting');
      return;
    }
    
    try {
      setLoading(true);
      setUploadProgress(10);
      
      // Create metadata JSON
      const metadata = {
        version: '1.0.0',
        timestamp: Date.now(),
        creator: address,
        ...formData
      };
      
      setUploadProgress(90);
      
      // Call smart contract function
      await createProject({
        name: formData.name,
        description: formData.description,
        bio: formData.tagline,
        contractInfo: JSON.stringify({
          techStack: formData.techStack,
          blockchain: formData.blockchain,
          smartContracts: formData.smartContracts,
          license: formData.license,
          developmentStage: formData.developmentStage
        }),
        additionalData: JSON.stringify({
          category: formData.category,
          tags: formData.tags,
          location: formData.location,
          establishedDate: formData.establishedDate,
          website: formData.website,
          logo: formData.logo,
          coverImage: formData.coverImage,
          gallery: formData.gallery,
          demoVideo: formData.demoVideo,
          demoUrl: formData.demoUrl,
          githubRepo: formData.githubRepo,
          npmPackage: formData.npmPackage,
          documentation: formData.documentation,
          socialLinks: {
            twitter: formData.twitter,
            linkedin: formData.linkedin,
            discord: formData.discord,
            telegram: formData.telegram,
            youtube: formData.youtube,
            instagram: formData.instagram
          },
          teamMembers: formData.teamMembers,
          contactInfo: {
            email: formData.contactEmail,
            businessEmail: formData.businessEmail,
            phone: formData.phone
          },
          features: {
            keyFeatures: formData.keyFeatures,
            innovation: formData.innovation,
            useCases: formData.useCases,
            targetAudience: formData.targetAudience
          },
          funding: {
            stage: formData.fundingStage,
            goal: formData.fundingGoal,
            tokenomics: formData.tokenomics,
            businessModel: formData.businessModel,
            revenueStreams: formData.revenueStreams
          },
          milestones: formData.milestones,
          status: {
            current: formData.status,
            launchDate: formData.launchDate,
            userCount: formData.userCount,
            transactionVolume: formData.transactionVolume,
            tvl: formData.tvl
          },
          compliance: {
            auditReports: formData.auditReports,
            kycCompliant: formData.kycCompliant,
            regulatoryCompliance: formData.regulatoryCompliance
          },
          metadata: {
            projectType: formData.projectType,
            maturityLevel: formData.maturityLevel,
            openSource: formData.openSource
          }
        }),
        contracts: formData.smartContracts as `0x${string}`[],
        transferrable: formData.transferrable
      });
      
      setUploadProgress(100);
      setSuccessMessage('Project created successfully!');
      
      // Reset form after delay
      setTimeout(() => {
        router.push('/projects');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating project:', error);
      setErrorMessage('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return {
    currentStage,
    formData,
    formErrors,
    loading,
    successMessage,
    errorMessage,
    uploadProgress,
    isConnected,
    handleNext,
    handlePrevious,
    updateFormData,
    addArrayItem,
    removeArrayItem,
    updateArrayItem,
    handleSubmit
  };
} 