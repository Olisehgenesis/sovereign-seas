

import { useState, useEffect, useRef } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { uploadToIPFS } from '@/utils/imageUtils';
import { type Address } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useBalance, usePublicClient } from 'wagmi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { contractABI as abi } from '@/abi/seas4ABI';
import { getMainContractAddress, getEnvironmentName, getCeloTokenAddress } from '@/utils/contractConfig';
import { useCreateCampaignWithFees } from '@/hooks/useCampaignMethods';
import { useChainSwitch } from '@/hooks/useChainSwitch';
import { useNavigate } from '@/utils/nextAdapter';
import { getCampaignRoute } from '@/utils/hashids';
import DynamicHelmet from '@/components/DynamicHelmet';
import { ButtonCool } from '@/components/ui/button-cool';

interface Campaign {
  name: string;
  description: string;
  campaignType: string;
  category: string;
  tags: string[];
  logo: string;
  website: string;
  videoLink: string;
  startDate: string;
  endDate: string;
  prizePool: string;
  maxParticipants: string;
  maxWinners: string;
  adminFeePercentage: string;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  customDistributionNotes?: string;
  eligibilityCriteria: string[];
  requirements: string[];
  judgesCriteria: string[];
  rewards: {
    distribution: string[];
    [key: string]: any;
  };
  submissionGuidelines: string;
  twitter: string;
  discord: string;
  telegram: string;
  contactEmail: string;
  payoutToken: Address;
  feeToken: Address;
}

type CampaignField = keyof Campaign;

interface SectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  required?: boolean;
  expandedSection: string;
  toggleSection: (id: string) => void;
  isVisible?: boolean;
}

const Section = ({ title, icon: Icon, children, required = false, isVisible = true }: SectionProps) => {
  if (!isVisible) return null;
  
  return (
    <div className="group relative w-full mb-6">
      {/* Pattern Overlays */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.01]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: '#a855f7',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <div className="flex items-center">
            <Icon className="h-6 w-6 mr-3 text-white" />
            <h3 className="text-xl font-extrabold text-white">
            {title}
              {required && <span className="text-[#ef4444] ml-1">*</span>}
          </h3>
          </div>
        </div>
        
        {/* Body */}
        <div className="relative px-[1.4em] py-[1.5em] z-[2]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  
  // Collapsible sections state
  const [expandedSection, setExpandedSection] = useState('basic');
  
  // Card navigation state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardSections = ['basic', 'media', 'funding', 'rules', 'review'];
  const celoToken = getCeloTokenAddress();
  const contractAddress = getMainContractAddress();
  
  // Debug environment variables
  console.log('Environment variables:');
  console.log('- Environment:', getEnvironmentName());
  console.log('- VITE_ENV:', process.env.NEXT_PUBLIC_ENV);
  console.log('- VITE_CELO_TOKEN:', process.env.NEXT_PUBLIC_CELO_TOKEN);
  console.log('- VITE_CELO_TOKEN_TESTNET:', process.env.NEXT_PUBLIC_CELO_TOKEN_TESTNET);
  console.log('- VITE_CONTRACT_V4:', process.env.NEXT_PUBLIC_CONTRACT_V4);
  console.log('- VITE_CONTRACT_V4_TESTNET:', process.env.NEXT_PUBLIC_CONTRACT_V4_TESTNET);
  console.log('- Contract Address Used:', contractAddress);
  console.log('- celoToken:', celoToken);
  console.log('- contractAddress:', contractAddress);

  // Check if environment variables are loaded
  if (!celoToken) {
    console.error('VITE_CELO_TOKEN environment variable is not set!');
  }
  if (!contractAddress) {
    console.error('VITE_CONTRACT_V4 environment variable is not set!');
  }
  
  // Wallet and contract hooks
  const { address, walletsReady } = useActiveWallet();
  const { authenticated, ready } = usePrivy();
  const { 
    ensureCorrectChain, 
    isSwitching, 
    targetChain, 
    isOnCorrectChain, 
    switchToCorrectChain, 
    currentChainId
  } = useChainSwitch();
  const publicClient = usePublicClient();
  
  // Type guard for isSwitching to handle bigint values
  const isChainSwitching: boolean = Boolean(isSwitching);
  
  // Manual chain switch state
  const [showChainSwitch, setShowChainSwitch] = useState(false);
  const [chainSwitchError, setChainSwitchError] = useState<string>('');
  
  // Manual chain switch function
  const handleManualChainSwitch = async () => {
    setChainSwitchError('');
    try {
      await switchToCorrectChain();
      setShowChainSwitch(false);
      setSuccessMessage(`Successfully switched to ${targetChain.name}`);
    } catch (error) {
      console.error('Manual chain switch failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setChainSwitchError(`Failed to switch chain: ${errorMessage}`);
    }
  };

  // Show manual switch option if user is on wrong chain
  useEffect(() => {
    if (address && !isOnCorrectChain && !isChainSwitching) {
      setShowChainSwitch(true);
    }
  }, [address, isOnCorrectChain, isChainSwitching]);
  
  // Get user's CELO balance
  const { data: celoBalance } = useBalance({
    address: address as any,
    token: celoToken as Address,
  });
  
  // Use the campaign creation hook with fees
  const { 
    createCampaignWithFees, 
    isPending, 
    isError, 
    error: contractError, 
    isSuccess,
    campaignCreationFee,
    canBypass: canBypassFees
  } = useCreateCampaignWithFees(contractAddress, address as Address);
  
  // Fee amount and bypass status are now handled by the hook
  const feeAmount = campaignCreationFee;
  const canBypass = canBypassFees;

  console.log(isError)
  
  // File handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Main campaign state
  const [campaign, setCampaign] = useState<Campaign>({
    // Basic Information (Required fields marked)
    name: '', // Required
    description: '', // Required
    campaignType: 'grants_round', // Required
    category: '',
    tags: [''],
    
    // Media & Links
    logo: '',
    website: '',
    videoLink: '',
    
    // Timeline & Funding (Required fields marked)
    startDate: '', // Required
    endDate: '', // Required
    prizePool: '', // Required (was fundingGoal)
    maxParticipants: '',
    adminFeePercentage: '5',
    maxWinners: '',
    
    // Distribution Settings
    useQuadraticDistribution: true, // Default to true
    useCustomDistribution: false,
    customDistributionNotes: '',
    
    // Rewards & Prizes
    rewards: {
      totalPrizePool: '',
      distribution: ['']
    },
    
    // Eligibility & Requirements
    eligibilityCriteria: [''],
    requirements: [''],
    judgesCriteria: [''],
    
    // Contact & Social
    contactEmail: '', // Required
    twitter: '',
    discord: '',
    telegram: '',
    
    // Additional Info
    submissionGuidelines: '',
    
    // Technical Settings - CELO only for now
    payoutToken: celoToken, // CELO
    feeToken: celoToken // CELO
  });
  
  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    campaignType: '',
    startDate: '',
    endDate: '',
    prizePool: '',
    contactEmail: ''
  });
  
  // Ref for name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle name change


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

  // Handle contract success state
  useEffect(() => {
    if (isSuccess) {
      setLoading(false);
      setSuccessMessage('Campaign created successfully! Redirecting to your campaign in 3 seconds...');
      
      // Navigate to the new campaign after a short delay
      setTimeout(async () => {
        try {
          console.log('Reading campaign count after successful creation...');
          console.log('Contract address:', contractAddress);
          console.log('Public client available:', !!publicClient);
          
          // Wait a bit more for the transaction to be fully confirmed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Read the campaign count after successful creation to get the new campaign ID
          const updatedCampaignCount = await publicClient?.readContract({
            address: contractAddress,
            abi,
            functionName: 'getCampaignCount'
          });
          
          console.log('Updated campaign count:', updatedCampaignCount);
          
          if (updatedCampaignCount && Number(updatedCampaignCount) > 0) {
            const newCampaignId = Number(updatedCampaignCount) - 1;
            console.log('Navigating to new campaign:', newCampaignId);
            navigate(getCampaignRoute(newCampaignId));
          } else {
            // Fallback to campaigns list if we can't get the count
            console.log('Campaign count not available or zero, navigating to campaigns list');
            navigate('/explorer/campaigns');
          }
        } catch (error) {
          console.error('Error navigating to campaign:', error);
          // Fallback to campaigns list
          navigate('/explorer/campaigns');
        }
      }, 3000);
    }
  }, [isSuccess, contractAddress, publicClient, navigate]);

  // Handle contract error state
  useEffect(() => {
    if (contractError) {
      setLoading(false);
      setIsUploading(false);
      const errorMessage = `Transaction failed: ${contractError ? String(contractError) : 'Unknown error'}`;
      setErrorMessage(errorMessage);
      
      // Show alert for better visibility
      alert(`Campaign Creation Failed: ${errorMessage}`);
      
      console.error('Campaign creation error:', contractError);
    }
  }, [contractError]);

  // Update loading state based on contract pending state
  useEffect(() => {
    if (isPending && !isUploading) {
      setLoading(true);
    }
  }, [isPending, isUploading]);

  // Campaign types and options
  const campaignTypes = [
    { value: 'grants_round', label: 'Grants Round', icon: DollarSign },
    { value: 'hackathon', label: 'Hackathon', icon: Code },
    { value: 'accelerator', label: 'Accelerator', icon: TrendingUp },
    { value: 'bounty', label: 'Bounty Program', icon: Target },
    { value: 'community_funding', label: 'Community Funding', icon: Users },
    { value: 'innovation_challenge', label: 'Innovation Challenge', icon: Sparkles }
  ];
  
  const categories = [
    'Web3 & Blockchain',
    'Artificial Intelligence',
    'General Tech',
    'Startup & Innovation',
    'Legacy categories',
    'Other'
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
      setCampaign({...campaign, logo: `File selected: ${file.name}`});
      
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };
  
  // Validation functions
  const validateForm = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    // Required fields validation
    if (!campaign.name.trim()) {
      errors.name = 'Campaign name is required';
      isValid = false;
    } else {
      errors.name = '';
    }
    
    if (!campaign.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    } else if (campaign.description.trim().length < 100) {
      errors.description = 'Description must be at least 100 characters long';
      isValid = false;
    } else {
      errors.description = '';
    }
    
    if (!campaign.campaignType) {
      errors.campaignType = 'Campaign type is required';
      isValid = false;
    } else {
      errors.campaignType = '';
    }
    
    // Enhanced date validation
    if (!campaign.startDate) {
      errors.startDate = 'Start date is required';
      isValid = false;
    } else {
      const startDate = new Date(campaign.startDate);
      const now = new Date();
      
      // Check if start date is valid
      if (isNaN(startDate.getTime())) {
        errors.startDate = 'Please enter a valid start date';
        isValid = false;
      } else if (startDate <= now) {
        errors.startDate = 'Start date must be in the future';
        isValid = false;
      } else {
        errors.startDate = '';
      }
    }
    
    if (!campaign.endDate) {
      errors.endDate = 'End date is required';
      isValid = false;
    } else {
      const endDate = new Date(campaign.endDate);
      const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
      
      // Check if end date is valid
      if (isNaN(endDate.getTime())) {
        errors.endDate = 'Please enter a valid end date';
        isValid = false;
      } else if (startDate && endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
        isValid = false;
      } else {
        errors.endDate = '';
      }
    }
    
    if (!campaign.prizePool) {
      errors.prizePool = 'Prize pool is required';
      isValid = false;
    } else if (parseFloat(campaign.prizePool) <= 0) {
      errors.prizePool = 'Prize pool must be greater than 0';
      isValid = false;
    } else {
      errors.prizePool = '';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!campaign.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required';
      isValid = false;
    } else if (!emailRegex.test(campaign.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
      isValid = false;
    } else {
      errors.contactEmail = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Helper functions for dynamic arrays
  const addArrayItem = (field: CampaignField, defaultValue = '') => {
    const currentValue = campaign[field];
    if (Array.isArray(currentValue)) {
      setCampaign({
        ...campaign,
        [field]: [...currentValue, defaultValue]
      });
    }
  };
  
  const removeArrayItem = (field: CampaignField, index: number) => {
    const currentValue = campaign[field];
    if (!Array.isArray(currentValue) || currentValue.length <= 1) return;
    
    const updated = [...currentValue];
    updated.splice(index, 1);
    setCampaign({
      ...campaign,
      [field]: updated
    });
  };
  
  const updateArrayItem = (field: CampaignField, index: number, value: string) => {
    const currentValue = campaign[field];
    if (Array.isArray(currentValue) && currentValue.every(item => typeof item === 'string')) {
      const updated = [...currentValue];
      updated[index] = value;
      setCampaign({
        ...campaign,
        [field]: updated
      });
    }
  };

  const handleFieldChange = (field: CampaignField, value: Campaign[CampaignField]) => {
    setCampaign(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrorMessage('');
    
    if (!ready) {
      setErrorMessage('Wallet connection is initializing...');
      return;
    }

    if (!authenticated || !walletsReady || !address) {
      console.log('not authenticated', authenticated, walletsReady, address);
      setErrorMessage('Please connect your wallet to create a campaign');
      return;
    }

    if (!celoToken) {
      setErrorMessage('CELO token configuration is missing. Please check your environment variables.');
      return;
    }

    if (!contractAddress) {
      setErrorMessage('Contract address configuration is missing. Please check your environment variables.');
      return;
    }

    if (!campaignCreationFee && !canBypass) {
      setErrorMessage('Campaign creation fee is not available. Please try again later.');
      return;
    }

    // Check if user has sufficient CELO balance for the fee
    if (!canBypass && feeAmount != null && celoBalance) {
      const requiredBalance = feeAmount;
      const userBalance = celoBalance.value;
      
      console.log('Balance check:');
      console.log('- Required fee:', requiredBalance.toString());
      console.log('- User balance:', userBalance.toString());
      console.log('- Sufficient balance:', userBalance >= requiredBalance);
      
      if (userBalance < requiredBalance) {
        const feeInCelo = (Number(requiredBalance) / 1e18).toFixed(6);
        const balanceInCelo = (Number(userBalance) / 1e18).toFixed(6);
        setErrorMessage(`Insufficient CELO balance. Required: ${feeInCelo} CELO, Available: ${balanceInCelo} CELO`);
        return;
      }
    }

    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before submitting');
      return;
    }
    
    try {
      setLoading(true);
      setIsUploading(true);
      
      // Upload logo to IPFS if file is selected
      let logoIpfsUrl = '';
      if (logoFile) {
        try {
          console.log('Uploading logo to IPFS...');
          logoIpfsUrl = await uploadToIPFS(logoFile);
          console.log('Logo uploaded to IPFS:', logoIpfsUrl);
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError);
          throw new Error(`Failed to upload logo: ${uploadError as string || 'Unknown error'}`);
        }
      }
      
      // Prepare campaign data with cleaned arrays
      const cleanedCampaign: Campaign = {
        ...campaign,
        logo: logoIpfsUrl || campaign.logo,
        tags: campaign.tags.filter(tag => tag.trim() !== '').length > 0 
          ? campaign.tags.filter(tag => tag.trim() !== '')
          : ['Innovation', 'Web3', 'Blockchain'], // Default tags
        eligibilityCriteria: campaign.eligibilityCriteria.filter(c => c.trim() !== '').length > 0 
          ? campaign.eligibilityCriteria.filter(c => c.trim() !== '')
          : ['Open to all participants'], // Default eligibility
        requirements: campaign.requirements.filter(r => r.trim() !== '').length > 0
          ? campaign.requirements.filter(r => r.trim() !== '')
          : ['Valid project submission'], // Default requirements
        judgesCriteria: campaign.judgesCriteria.filter(c => c.trim() !== '').length > 0
          ? campaign.judgesCriteria.filter(c => c.trim() !== '')
          : ['Innovation and impact'], // Default judging criteria
        rewards: {
          ...campaign.rewards,
          distribution: campaign.rewards.distribution.filter(d => d.trim() !== '').length > 0 
            ? campaign.rewards.distribution.filter(d => d.trim() !== '')
            : ['Equal distribution among winners'] // Default distribution
        }
      } as const;

      // Create main info metadata (for contract)
      const mainInfoData = {
        type: cleanedCampaign.campaignType,
        category: cleanedCampaign.category || 'Other',
        maxParticipants: cleanedCampaign.maxParticipants ? parseInt(cleanedCampaign.maxParticipants) : 1000, // Default to 1000 participants
        eligibilityCriteria: cleanedCampaign.eligibilityCriteria.filter(c => c.trim() !== '').length > 0 
          ? cleanedCampaign.eligibilityCriteria.filter(c => c.trim() !== '')
          : ['Open to all participants'], // Default eligibility
        requirements: cleanedCampaign.requirements.filter(r => r.trim() !== '').length > 0
          ? cleanedCampaign.requirements.filter(r => r.trim() !== '')
          : ['Valid project submission'], // Default requirements
        judgesCriteria: cleanedCampaign.judgesCriteria.filter(c => c.trim() !== '').length > 0
          ? cleanedCampaign.judgesCriteria.filter(c => c.trim() !== '')
          : ['Innovation and impact'], // Default judging criteria
        rewards: {
          totalPrizePool: cleanedCampaign.prizePool || '0',
          distribution: cleanedCampaign.rewards.distribution.filter(d => d.trim() !== '').length > 0 
            ? cleanedCampaign.rewards.distribution.filter(d => d.trim() !== '')
            : ['Equal distribution among winners'] // Default distribution
        },
        submissionGuidelines: cleanedCampaign.submissionGuidelines || 'Submit your project with detailed description and any relevant media.'
      };

      // Create additional info metadata (for contract)
      const additionalInfoData = {
        version: '1.0.0',
        timestamp: Date.now(),
        creator: address,
        tags: cleanedCampaign.tags,
        logo: cleanedCampaign.logo,
        prizePool: cleanedCampaign.prizePool || '0', // Ensure prizePool has a value
        media: {
          website: cleanedCampaign.website,
          videoLink: cleanedCampaign.videoLink
        },
        social: {
          twitter: cleanedCampaign.twitter,
          discord: cleanedCampaign.discord,
          telegram: cleanedCampaign.telegram,
          contactEmail: cleanedCampaign.contactEmail
        }
      };

      // Convert dates to Unix timestamps (BigInt) with enhanced validation
      const startDate = new Date(cleanedCampaign.startDate);
      const endDate = new Date(cleanedCampaign.endDate);
      
      // Validate dates are valid
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date format');
      }
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date format');
      }
      
      const startTimeUnix = BigInt(Math.floor(startDate.getTime() / 1000));
      const endTimeUnix = BigInt(Math.floor(endDate.getTime() / 1000));

      // Validate timestamps
      const nowUnix = BigInt(Math.floor(Date.now() / 1000));
      if (startTimeUnix <= nowUnix) {
        throw new Error('Start date must be in the future');
      }
      if (endTimeUnix <= startTimeUnix) {
        throw new Error('End date must be after start date');
      }
      
      // Additional validation: ensure campaign duration is reasonable (at least 1 hour, max 2 years)
      const durationSeconds = endTimeUnix - startTimeUnix;
      const minDuration = BigInt(3600); // 1 hour
      const maxDuration = BigInt(2 * 365 * 24 * 3600); // 2 years
      
      if (durationSeconds < minDuration) {
        throw new Error('Campaign duration must be at least 1 hour');
      }
      if (durationSeconds > maxDuration) {
        throw new Error('Campaign duration cannot exceed 2 years');
      }

      // Create custom distribution data
      const customDistributionData = cleanedCampaign.useCustomDistribution 
        ? JSON.stringify({
            distributionType: 'custom',
            notes: cleanedCampaign.customDistributionNotes || 'Manual distribution will be implemented by campaign admin'
          })
        : 'default'; // Use 'default' instead of empty string

      setIsUploading(false);
      
      console.log('Creating campaign with contract...');
      console.log('Campaign creation fee:', campaignCreationFee?.toString());
      console.log('Can bypass fees:', canBypass);
      console.log('Fee token:', cleanedCampaign.feeToken);
      console.log('CELO token:', celoToken);

      // Debug the final data being sent
      console.log('Final campaign data:');
      console.log('- mainInfoData:', mainInfoData);
      console.log('- additionalInfoData:', additionalInfoData);
      console.log('- startTimeUnix:', startTimeUnix.toString());
      console.log('- endTimeUnix:', endTimeUnix.toString());
      console.log('- customDistributionData:', customDistributionData);

      // Show fee information to user
      if (!canBypass && feeAmount != null) {
        console.log('Fee information:');
        console.log('- Campaign creation fee:', feeAmount.toString());
        console.log('- Fee in CELO:', (Number(feeAmount) / 1e18).toFixed(6));
        console.log('- User address:', address);
        console.log('- Fee token:', cleanedCampaign.feeToken);
        
        // Show fee message to user
        setSuccessMessage(`Campaign creation fee: ${(Number(feeAmount) / 1e18).toFixed(6)} CELO. Please ensure you have sufficient funds.`);
      }

      // Debug transaction details
      console.log('Transaction details:');
      console.log('- Contract address:', contractAddress);
      console.log('- Fee amount:', feeAmount?.toString() || '0');
      console.log('- Fee in CELO:', feeAmount ? (Number(feeAmount) / 1e18).toFixed(6) : '0');
      console.log('- Can bypass fees:', canBypass);

      // Ensure we're on the correct chain before making the contract call
      console.log('- Ensuring correct chain...');
      console.log(`- Environment: ${getEnvironmentName()}`);
      console.log(`- Target chain: ${targetChain.name} (${targetChain.id})`);
      console.log(`- Is testnet: ${process.env.NEXT_PUBLIC_ENV === 'testnet'}`);
      try {
        await ensureCorrectChain();
        console.log(`- Now on correct chain: ${targetChain.name}`);
      } catch (chainError) {
        console.error('Chain switching failed:', chainError);
        const chainErrorMessage = chainError instanceof Error ? chainError.message : 'Unknown chain switching error';
        
        if (chainErrorMessage.includes('user rejected')) {
          setErrorMessage('Chain switching was rejected by user. Please try the manual switch below.');
          setShowChainSwitch(true);
        } else if (chainErrorMessage.includes('not supported')) {
          setErrorMessage('The target network is not supported by your wallet. Please add the network manually or try the manual switch below.');
          setShowChainSwitch(true);
        } else if (chainErrorMessage.includes('Wallet not connected')) {
          setErrorMessage('Wallet not connected. Please connect your wallet first.');
        } else {
          setErrorMessage(`Failed to switch to the correct network: ${chainErrorMessage}`);
          setShowChainSwitch(true);
        }
        
        setLoading(false);
        setIsUploading(false);
        return;
      }

      // Call the campaign creation hook
      const txHash = await createCampaignWithFees({
        name: cleanedCampaign.name,
        description: cleanedCampaign.description,
        mainInfo: JSON.stringify(mainInfoData),
        additionalInfo: JSON.stringify(additionalInfoData),
        startTime: startTimeUnix,
        endTime: endTimeUnix,
        adminFeePercentage: BigInt(parseInt(cleanedCampaign.adminFeePercentage)),
        maxWinners: BigInt(cleanedCampaign.maxWinners ? parseInt(cleanedCampaign.maxWinners) : 10), // Default to 10 winners
        useQuadraticDistribution: cleanedCampaign.useQuadraticDistribution,
        useCustomDistribution: cleanedCampaign.useCustomDistribution,
        customDistributionData: customDistributionData,
        payoutToken: cleanedCampaign.payoutToken as Address,
        feeToken: cleanedCampaign.feeToken as Address
      });
      
      console.log('Transaction hash:', txHash);
      
    } catch (error) {
      console.error('Campaign creation error:', error);
      
      let userFriendlyMessage = 'Failed to create campaign. ';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('user rejected')) {
        userFriendlyMessage += 'Transaction was rejected by user.';
      } else if (errorMessage.includes('insufficient funds')) {
        userFriendlyMessage += 'Insufficient funds for transaction fees.';
      } else if (errorMessage.includes('gas')) {
        userFriendlyMessage += 'Gas estimation failed. Please check your parameters.';
      } else if (errorMessage.includes('network')) {
        userFriendlyMessage += 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('revert')) {
        userFriendlyMessage += 'Contract execution reverted. Please check your parameters.';
      } else if (errorMessage.includes('chain') || errorMessage.includes('switch')) {
        userFriendlyMessage += 'Network switching error. Please ensure you are on the correct network.';
      } else {
        userFriendlyMessage += errorMessage;
      }
      
      setErrorMessage(userFriendlyMessage);
      setLoading(false);
      setIsUploading(false);
      
      // Show alert for better visibility
      alert(`Campaign Creation Failed: ${userFriendlyMessage}`);
    }
  };

  // Calculate duration in days
  const getDurationInDays = () => {
    if (campaign.startDate && campaign.endDate) {
      const start = new Date(campaign.startDate);
      const end = new Date(campaign.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

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
        title: 'Create Campaign',
        description: 'Create a new funding campaign on Sov Seas - Launch your project with community support',
        image: '/og-image.png',
        url: typeof window !== 'undefined' ? window.location.href : '',
        type: 'website'
      }}
    />
    
    <div className="min-h-screen text-gray-800">
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Main Content */}
          <div>

          {/* Error Summary Panel - Always visible when there are errors */}
          {(errorMessage || Object.values(formErrors).some(err => err !== '')) && (
            <div className="mb-6 group relative w-full">
              {/* Pattern Overlays */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '0.5em 0.5em'
                }}
              />
              
              {/* Error Card */}
              <div 
                className="relative bg-white border-[0.35em] border-[#ef4444] rounded-[0.6em] shadow-[0.7em_0.7em_0_#ef4444] transition-all duration-[400ms] overflow-hidden z-[2]"
                style={{ boxShadow: 'inset 0 0 0 0.15em rgba(239, 68, 68, 0.1)' }}
              >
                {/* Accent Corner */}
                <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
                <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚠</div>

                {/* Title Area */}
                <div 
                  className="relative px-[1.4em] py-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                  style={{ 
                    background: '#ef4444',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                    backgroundBlendMode: 'overlay'
                  }}
                >
                  <div className="flex items-center">
                    <XCircle className="h-6 w-6 mr-3 text-white" />
                    <h3 className="text-xl font-extrabold text-white">Errors Found</h3>
            </div>
                </div>
          
                {/* Error Content */}
                <div className="relative px-[1.4em] py-[1.5em] z-[2] space-y-3">
          {errorMessage && (
                    <div className="bg-[#fee2e2] border-[0.2em] border-[#ef4444] rounded-[0.4em] p-3">
                      <p className="text-[#991b1b] font-bold text-base">{errorMessage}</p>
                    </div>
                  )}
                  
                  {Object.values(formErrors).some(err => err !== '') && (
                    <div>
                      <p className="text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Form Validation Errors:</p>
                      <div className="space-y-2">
                        {formErrors.name && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">Campaign Name:</span> {formErrors.name}</p>
                          </div>
                        )}
                        {formErrors.description && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">Description:</span> {formErrors.description}</p>
                          </div>
                        )}
                        {formErrors.campaignType && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">Campaign Type:</span> {formErrors.campaignType}</p>
                          </div>
                        )}
                        {formErrors.startDate && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">Start Date:</span> {formErrors.startDate}</p>
                          </div>
                        )}
                        {formErrors.endDate && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">End Date:</span> {formErrors.endDate}</p>
                          </div>
                        )}
                        {formErrors.prizePool && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">Prize Pool:</span> {formErrors.prizePool}</p>
                          </div>
                        )}
                        {formErrors.contactEmail && (
                          <div className="flex items-start bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                            <XCircle className="h-4 w-4 text-[#ef4444] mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-[#991b1b] font-semibold text-sm"><span className="font-extrabold">Contact Email:</span> {formErrors.contactEmail}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 group relative w-full">
              {/* Pattern Overlays */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '0.5em 0.5em'
                }}
              />
              
              {/* Success Card */}
              <div 
                className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#10b981] transition-all duration-[400ms] overflow-hidden z-[2]"
                style={{ boxShadow: 'inset 0 0 0 0.15em rgba(16, 185, 129, 0.1)' }}
              >
                {/* Accent Corner */}
                <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
                <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">✓</div>

                {/* Title Area */}
                <div 
                  className="relative px-[1.4em] py-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                  style={{ 
                    background: '#10b981',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                    backgroundBlendMode: 'overlay'
                  }}
                >
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 mr-3 text-white" />
                    <h3 className="text-xl font-extrabold text-white">Success</h3>
                  </div>
                </div>

                {/* Success Content */}
                <div className="relative px-[1.4em] py-[1.5em] z-[2]">
                  <p className="text-[#050505] font-bold text-base">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Network Status Badge */}
          {address && (
            <div className="mb-6 flex justify-end">
              <div className={`inline-flex items-center px-4 py-2 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] font-bold text-sm ${
                isOnCorrectChain 
                  ? 'bg-[#10b981] text-white' 
                  : 'bg-[#ef4444] text-white'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 border-[0.1em] border-white ${
                  isOnCorrectChain ? 'bg-white' : 'bg-white'
                }`}></div>
                {isOnCorrectChain ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          )}
          
          {/* Chain Switch Error - Only show if there's an error */}
          {chainSwitchError && (
            <div className="mb-6 flex justify-end">
              <div className="inline-flex items-center px-4 py-2 bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em]">
                <XCircle className="h-4 w-4 text-[#ef4444] mr-2" />
                <p className="text-[#991b1b] font-bold text-sm">{chainSwitchError}</p>
              </div>
            </div>
          )}
          
          {/* Manual Chain Switch Button - Only show if wrong network */}
          {address && !isOnCorrectChain && !isChainSwitching && (
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={handleManualChainSwitch}
                className="px-4 py-2 bg-white text-[#050505] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold text-sm flex items-center"
              >
                <Globe className="h-4 w-4 mr-2" />
                Switch Network
              </button>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit}>
            <Section 
              id="basic" 
              title="Basic Information" 
              icon={Hash} 
              required 
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 0}
            >
              {/* Basic Information content */}
              <div className="space-y-6">
                {/* Campaign Name & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                      Campaign Name <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={campaign.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border-[0.2em] ${formErrors.name ? 'border-[#ef4444]' : 'border-[#050505]'} rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400`}
                      placeholder="Enter your campaign name"
                    />
                    {formErrors.name && (
                      <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                        <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                        <p className="text-[#991b1b] font-bold text-sm">{formErrors.name}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                      Category
                    </label>
                    <select
                      value={campaign.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Campaign Type Selection */}
                <div>
                  <label className="block text-[#050505] font-extrabold mb-3 uppercase text-sm tracking-[0.05em]">
                    Campaign Type <span className="text-[#ef4444]">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaignTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.value}
                          onClick={() => handleFieldChange('campaignType', type.value)}
                          className={`p-4 rounded-[0.4em] border-[0.2em] cursor-pointer transition-all duration-200 font-bold ${
                            campaign.campaignType === type.value
                              ? 'border-[#a855f7] bg-[#a855f7] text-white shadow-[0.3em_0.3em_0_#000000]'
                              : 'border-[#050505] bg-white text-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]'
                          }`}
                        >
                          <div className="flex items-center">
                            <IconComponent className={`h-5 w-5 mr-2 ${
                              campaign.campaignType === type.value ? 'text-white' : 'text-[#a855f7]'
                            }`} />
                            <span>
                              {type.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {formErrors.campaignType && (
                    <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                      <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                      <p className="text-[#991b1b] font-bold text-sm">{formErrors.campaignType}</p>
                    </div>
                  )}
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Campaign Description <span className="text-[#ef4444]">*</span>
                  </label>
                  <textarea
                    value={campaign.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={6}
                    className={`w-full px-4 py-3 bg-white border-[0.2em] ${formErrors.description ? 'border-[#ef4444]' : 'border-[#050505]'} rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400 resize-none`}
                    placeholder="Provide a comprehensive description of your campaign, its goals, and what participants can expect..."
                  />
                  {formErrors.description && (
                    <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                      <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                      <p className="text-[#991b1b] font-bold text-sm">{formErrors.description}</p>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <p className={`text-sm font-bold ${campaign.description.length < 100 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {campaign.description.length < 100 ? `Minimum 100 characters • ${campaign.description.length}/100` : `✓ ${campaign.description.length} characters`}
                    </p>
                  </div>
                </div>
                
                {/* Tags */}
                <div>
                  <label className="block text-[#050505] font-extrabold mb-3 uppercase text-sm tracking-[0.05em]">
                    Tags
                  </label>
                  {campaign.tags.map((tag, index) => (
                    <div key={index} className="flex mb-3 gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                        placeholder="Enter tag (e.g., Innovation, DeFi, Social Impact)"
                      />
                      {campaign.tags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tags', index)}
                          className="px-3 py-2.5 bg-[#ef4444] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('tags')}
                    className="inline-flex items-center px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tag
                  </button>
                </div>
              </div>
            </Section>

            <Section 
              id="media" 
              title="Media & Links" 
              icon={ImageIcon}
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 1}
            >
              <div className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-[#050505] font-extrabold mb-3 uppercase text-sm tracking-[0.05em]">
                    Campaign Logo
                  </label>
                  
                  {logoPreview && (
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-32 h-32 object-cover rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                            handleFieldChange('logo', '');
                            if (logoFileInputRef.current) {
                              logoFileInputRef.current.value = '';
                            }
                          }}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-[#ef4444] text-white border-[0.15em] border-[#050505] rounded-full flex items-center justify-center shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-[0.2em] border-dashed border-[#050505] rounded-[0.4em] p-6 text-center bg-white shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] transition-all">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-[#a855f7] border-[0.2em] border-[#050505] rounded-full flex items-center justify-center shadow-[0.2em_0.2em_0_#000000]">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-6 py-3 bg-[#a855f7] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold flex items-center mx-auto"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {logoFile ? 'Change Logo' : 'Choose Logo File'}
                        </button>
                        <p className="text-sm font-bold text-[#050505] mt-2">PNG, JPG, SVG up to 10MB</p>
                        <p className="text-xs font-semibold text-[#050505]/70 mt-1">Recommended: 400x400px square format</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Website & Video */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                      Campaign Website
                    </label>
                    <input
                      type="url"
                      value={campaign.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                      placeholder="https://yourcampaign.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                      Video Link
                    </label>
                    <input
                      type="url"
                      value={campaign.videoLink}
                      onChange={(e) => handleFieldChange('videoLink', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section 
              id="funding" 
              title="Timeline & Funding" 
              icon={Calendar} 
              required
              expandedSection={expandedSection}
              toggleSection={toggleSection}
              isVisible={currentCardIndex === 2}
            >
              <div className="space-y-8">
                {/* Timeline */}
                <div>
                  <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Campaign Timeline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                        Start Date <span className="text-[#ef4444]">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={campaign.startDate}
                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className={`w-full px-4 py-3 bg-white border-[0.2em] ${formErrors.startDate ? 'border-[#ef4444]' : 'border-[#050505]'} rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all`}
                        placeholder="Select start date and time"
                      />
                      {formErrors.startDate && (
                        <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                          <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                          <p className="text-[#991b1b] font-bold text-sm">{formErrors.startDate}</p>
                        </div>
                      )}
                      <p className="mt-1 text-xs font-bold text-[#050505]">Campaign must start in the future</p>
                    </div>
                    
                    <div>
                      <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                        End Date <span className="text-[#ef4444]">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={campaign.endDate}
                        onChange={(e) => handleFieldChange('endDate', e.target.value)}
                        min={campaign.startDate || new Date().toISOString().slice(0, 16)}
                        className={`w-full px-4 py-3 bg-white border-[0.2em] ${formErrors.endDate ? 'border-[#ef4444]' : 'border-[#050505]'} rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all`}
                        placeholder="Select end date and time"
                      />
                      {formErrors.endDate && (
                        <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                          <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                          <p className="text-[#991b1b] font-bold text-sm">{formErrors.endDate}</p>
                        </div>
                      )}
                      <p className="mt-1 text-xs font-bold text-[#050505]">Must be after start date</p>
                    </div>
                  </div>
                  
                  {campaign.startDate && campaign.endDate && (
                    <div className="mt-4 p-4 bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                      <p className="text-[#2563eb] font-extrabold uppercase tracking-[0.05em]">
                        Duration: {getDurationInDays()} days
                      </p>
                    </div>
                  )}
                </div>

                {/* Prize Pool & Token Settings */}
                <div>
                  <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Prize Pool & Tokens</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                        Prize Pool (CELO) <span className="text-[#ef4444]">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={campaign.prizePool}
                        onChange={(e) => handleFieldChange('prizePool', e.target.value)}
                        className={`w-full px-4 py-3 bg-white border-[0.2em] ${formErrors.prizePool ? 'border-[#ef4444]' : 'border-[#050505]'} rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400`}
                        placeholder="50000"
                      />
                      {formErrors.prizePool && (
                        <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                          <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                          <p className="text-[#991b1b] font-bold text-sm">{formErrors.prizePool}</p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Admin Fee (%)</label>
                      <select
                       value={campaign.adminFeePercentage}
                       onChange={(e) => handleFieldChange('adminFeePercentage', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all"
                     >
                       <option value="0">0% - No admin fee</option>
                       <option value="3">3% - Low fee</option>
                       <option value="5">5% - Standard fee</option>
                       <option value="8">8% - Higher fee</option>
                       <option value="10">10% - Premium fee</option>
                     </select>
                   </div>
                 </div>

                 {/* Payout & Fee Token Selection - CELO Only */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                       Payout Token <span className="text-[#ef4444]">*</span>
                     </label>
                     <div className="px-4 py-3 bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-bold">
                       CELO (More tokens coming soon)
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                       Fee Token <span className="text-[#ef4444]">*</span>
                     </label>
                     <div className="px-4 py-3 bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-bold">
                       CELO (More tokens coming soon)
                     </div>
                   </div>
                 </div>

                 {/* Prize Distribution */}
                 <div>
                   <label className="block text-[#050505] font-extrabold mb-3 uppercase text-sm tracking-[0.05em]">Prize Distribution (CELO)</label>
                   {campaign.rewards.distribution.map((prize, index) => (
                     <div key={index} className="flex mb-3 gap-2">
                       <input
                         type="text"
                         value={prize}
                         onChange={(e) => {
                           const updated = [...campaign.rewards.distribution];
                           updated[index] = e.target.value;
                           handleFieldChange('rewards', {
                             ...campaign.rewards,
                             distribution: updated
                           });
                         }}
                         className="flex-1 px-4 py-2.5 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                         placeholder={`1st Place: 20,000 CELO`}
                       />
                       {campaign.rewards.distribution.length > 1 && (
                         <button
                           type="button"
                           onClick={() => {
                             const updated = [...campaign.rewards.distribution];
                             updated.splice(index, 1);
                             handleFieldChange('rewards', {
                               ...campaign.rewards,
                               distribution: updated
                             });
                           }}
                           className="px-3 py-2.5 bg-[#ef4444] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       )}
                     </div>
                   ))}
                   <button
                     type="button"
                     onClick={() => handleFieldChange('rewards', {
                       ...campaign.rewards,
                       distribution: [...campaign.rewards.distribution, '']
                     })}
                     className="inline-flex items-center px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                   >
                     <Plus className="h-4 w-4 mr-2" />
                     Add Prize
                   </button>
                 </div>
               </div>

               {/* Participants & Winners */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Participation Settings</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Max Participants</label>
                     <input
                       type="number"
                       min="0"
                       value={campaign.maxParticipants}
                       onChange={(e) => handleFieldChange('maxParticipants', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="Leave empty for unlimited"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Max Winners</label>
                     <input
                       type="number"
                       min="0"
                       value={campaign.maxWinners}
                       onChange={(e) => handleFieldChange('maxWinners', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="Leave empty for unlimited"
                     />
                   </div>
                 </div>
               </div>

               {/* Distribution Method */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em] flex items-center">
                   Funding Options
                   <a 
                     href="https://seas.xyz/docs/funding" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="ml-2 text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                   >
                     <HelpCircle className="h-4 w-4" />
                   </a>
                 </h4>
                 
                 <div className="space-y-4">
                   <div className={`flex items-start space-x-4 p-4 rounded-[0.4em] border-[0.2em] ${campaign.useQuadraticDistribution && !campaign.useCustomDistribution ? 'border-[#a855f7] bg-[#f3e8ff] shadow-[0.2em_0.2em_0_#000000]' : 'border-[#050505] bg-white shadow-[0.1em_0.1em_0_#000000]'}`}>
                     <label className="flex items-center mt-1 cursor-pointer">
                       <input
                         type="radio"
                         name="distributionMethod"
                         checked={campaign.useQuadraticDistribution && !campaign.useCustomDistribution}
                         onChange={() => handleFieldChange('useQuadraticDistribution', true)}
                         className="mr-3 w-5 h-5 text-[#a855f7] cursor-pointer"
                       />
                       <span className="font-extrabold text-[#050505]">Quadratic Distribution (Recommended)</span>
                     </label>
                     <div>
                       <p className="text-[#050505] font-semibold text-sm">Square root weighting for more balanced and democratic distribution</p>
                     </div>
                   </div>
                   
                   <div className={`flex items-start space-x-4 p-4 rounded-[0.4em] border-[0.2em] ${!campaign.useQuadraticDistribution && !campaign.useCustomDistribution ? 'border-[#a855f7] bg-[#f3e8ff] shadow-[0.2em_0.2em_0_#000000]' : 'border-[#050505] bg-white shadow-[0.1em_0.1em_0_#000000]'}`}>
                     <label className="flex items-center mt-1 cursor-pointer">
                       <input
                         type="radio"
                         name="distributionMethod"
                         checked={!campaign.useQuadraticDistribution && !campaign.useCustomDistribution}
                         onChange={() => handleFieldChange('useQuadraticDistribution', false)}
                         className="mr-3 w-5 h-5 text-[#a855f7] cursor-pointer"
                       />
                       <span className="font-extrabold text-[#050505]">Linear Distribution</span>
                     </label>
                     <div>
                       <p className="text-[#050505] font-semibold text-sm">Direct proportion to votes received</p>
                     </div>
                   </div>
                   
                   <div className={`flex items-start space-x-4 p-4 rounded-[0.4em] border-[0.2em] ${campaign.useCustomDistribution ? 'border-[#a855f7] bg-[#f3e8ff] shadow-[0.2em_0.2em_0_#000000]' : 'border-[#050505] bg-white shadow-[0.1em_0.1em_0_#000000]'}`}>
                     <label className="flex items-center mt-1 cursor-pointer">
                       <input
                         type="radio"
                         name="distributionMethod"
                         checked={campaign.useCustomDistribution}
                         onChange={() => handleFieldChange('useCustomDistribution', true)}
                         className="mr-3 w-5 h-5 text-[#a855f7] cursor-pointer"
                       />
                       <span className="font-extrabold text-[#050505]">Custom Distribution</span>
                     </label>
                     <div>
                       <p className="text-[#050505] font-semibold text-sm">Manual distribution by campaign admin</p>
                     </div>
                   </div>
                   
                   {campaign.useCustomDistribution && (
                     <div className="mt-4">
                       <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Custom Distribution Notes</label>
                       <textarea
                         value={campaign.customDistributionNotes}
                         onChange={(e) => handleFieldChange('customDistributionNotes', e.target.value)}
                         rows={3}
                         className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400 resize-none"
                         placeholder="Describe your custom distribution logic..."
                       />
                     </div>
                   )}
                 </div>
               </div>
             </div>
           </Section>

           <Section 
             id="rules" 
             title="Rules & Criteria" 
             icon={Shield} 
             required
             expandedSection={expandedSection}
             toggleSection={toggleSection}
             isVisible={currentCardIndex === 3}
           >
             <div className="space-y-8">
               {/* Contact Information */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Contact Information</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                       Contact Email <span className="text-[#ef4444]">*</span>
                     </label>
                     <input
                       type="email"
                       value={campaign.contactEmail}
                       onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                       className={`w-full px-4 py-3 bg-white border-[0.2em] ${formErrors.contactEmail ? 'border-[#ef4444]' : 'border-[#050505]'} rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400`}
                       placeholder="contact@yourcampaign.com"
                     />
                     {formErrors.contactEmail && (
                       <div className="mt-2 flex items-center bg-[#fee2e2] border-[0.15em] border-[#ef4444] rounded-[0.3em] p-2">
                         <XCircle className="h-4 w-4 text-[#ef4444] mr-2 flex-shrink-0" />
                         <p className="text-[#991b1b] font-bold text-sm">{formErrors.contactEmail}</p>
                       </div>
                     )}
                   </div>
                   
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Website</label>
                     <input
                       type="url"
                       value={campaign.website}
                       onChange={(e) => handleFieldChange('website', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="https://yourcampaign.com"
                     />
                   </div>
                 </div>
               </div>

               {/* Social Media */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Social Media & Community</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em] flex items-center">
                       <Twitter className="h-4 w-4 mr-2" />
                       Twitter
                     </label>
                     <input
                       type="url"
                       value={campaign.twitter}
                       onChange={(e) => handleFieldChange('twitter', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="https://twitter.com/yourcampaign"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em] flex items-center">
                       <Globe className="h-4 w-4 mr-2" />
                       Discord
                     </label>
                     <input
                       type="url"
                       value={campaign.discord}
                       onChange={(e) => handleFieldChange('discord', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="https://discord.gg/yourcampaign"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em] flex items-center">
                       <Globe className="h-4 w-4 mr-2" />
                       Telegram
                     </label>
                     <input
                       type="url"
                       value={campaign.telegram}
                       onChange={(e) => handleFieldChange('telegram', e.target.value)}
                       className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="https://t.me/yourcampaign"
                     />
                   </div>
                 </div>
               </div>

               {/* Eligibility Criteria */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Eligibility Criteria</h4>
                 {campaign.eligibilityCriteria.map((criteria, index) => (
                   <div key={index} className="flex mb-3 gap-2">
                     <input
                       type="text"
                       value={criteria}
                       onChange={(e) => updateArrayItem('eligibilityCriteria', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="Must be building on blockchain technology"
                     />
                     {campaign.eligibilityCriteria.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('eligibilityCriteria', index)}
                         className="px-3 py-2.5 bg-[#ef4444] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('eligibilityCriteria')}
                   className="inline-flex items-center px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Criterion
                 </button>
               </div>

               {/* Requirements */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Requirements</h4>
                 {campaign.requirements.map((requirement, index) => (
                   <div key={index} className="flex mb-3 gap-2">
                     <input
                       type="text"
                       value={requirement}
                       onChange={(e) => updateArrayItem('requirements', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="Working prototype or MVP"
                     />
                     {campaign.requirements.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('requirements', index)}
                         className="px-3 py-2.5 bg-[#ef4444] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('requirements')}
                   className="inline-flex items-center px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Requirement
                 </button>
               </div>

               {/* Judging Criteria */}
               <div>
                 <h4 className="text-lg font-extrabold text-[#050505] mb-4 uppercase tracking-[0.05em]">Judging Criteria</h4>
                 {campaign.judgesCriteria.map((criteria, index) => (
                   <div key={index} className="flex mb-3 gap-2">
                     <input
                       type="text"
                       value={criteria}
                       onChange={(e) => updateArrayItem('judgesCriteria', index, e.target.value)}
                       className="flex-1 px-4 py-2.5 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:shadow-[0.3em_0.3em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400"
                       placeholder="Technical innovation (30%)"
                     />
                     {campaign.judgesCriteria.length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeArrayItem('judgesCriteria', index)}
                         className="px-3 py-2.5 bg-[#ef4444] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 ))}
                 <button
                   type="button"
                   onClick={() => addArrayItem('judgesCriteria')}
                   className="inline-flex items-center px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Criterion
                 </button>
               </div>

               {/* Submission Guidelines */}
               <div>
                 <label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">Submission Guidelines</label>
                 <textarea
                   value={campaign.submissionGuidelines}
                   onChange={(e) => handleFieldChange('submissionGuidelines', e.target.value)}
                   rows={4}
                   className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all placeholder:text-gray-400 resize-none"
                   placeholder="Detailed guidelines for project submissions, including required documents, formats, and deadlines..."
                 />
               </div>
             </div>
           </Section>

           <Section 
             id="review" 
             title="Review & Submit" 
             icon={CheckCircle}
             expandedSection={expandedSection}
             toggleSection={toggleSection}
             isVisible={currentCardIndex === 4}
           >
             <div className="space-y-8">
               <div className="text-center mb-8">
                 <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mb-4">
                   <CheckCircle className="h-8 w-8 text-white" />
                 </div>
                 <h3 className="text-2xl font-bold text-gray-800 mb-2">Campaign Summary</h3>
                 <p className="text-gray-600">Review your campaign details before launch</p>
               </div>

               {/* Basic Information Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <Info className="h-5 w-5 mr-2 text-purple-500" />
                   Campaign Overview
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Campaign Name:</span>
                     <p className="text-gray-800">{campaign.name || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Type:</span>
                     <p className="text-gray-800">{campaignTypes.find(t => t.value === campaign.campaignType)?.label || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Category:</span>
                     <p className="text-gray-800">{campaign.category || 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Duration:</span>
                     <p className="text-gray-800">{getDurationInDays()} days</p>
                   </div>
                 </div>
                 <div className="mt-4">
                   <span className="font-medium text-gray-600">Description:</span>
                   <p className="text-gray-800 mt-1">{campaign.description || 'Not specified'}</p>
                 </div>
                 <div className="mt-4">
                   <span className="font-medium text-gray-600">Tags:</span>
                   <p className="text-gray-800">
                     {campaign.tags.filter(t => t.trim() !== '').join(', ') || 'Not specified'}
                   </p>
                 </div>
               </div>

               {/* Timeline & Funding Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                   Timeline & Funding
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Start Date:</span>
                     <p className="text-gray-800">{campaign.startDate ? new Date(campaign.startDate).toLocaleString() : 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">End Date:</span>
                     <p className="text-gray-800">{campaign.endDate ? new Date(campaign.endDate).toLocaleString() : 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Prize Pool:</span>
                     <p className="text-gray-800">{campaign.prizePool ? `${campaign.prizePool} CELO` : 'Not specified'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Admin Fee:</span>
                     <p className="text-gray-800">{campaign.adminFeePercentage}%</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Max Participants:</span>
                     <p className="text-gray-800">{campaign.maxParticipants || 'Unlimited'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Max Winners:</span>
                     <p className="text-gray-800">{campaign.maxWinners || 'Unlimited'}</p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Distribution Method:</span>
                     <p className="text-gray-800">
                       {campaign.useQuadraticDistribution ? 'Quadratic' : campaign.useCustomDistribution ? 'Custom' : 'Linear'}
                     </p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-600">Tokens:</span>
                     <p className="text-gray-800">CELO (Payout & Fees)</p>
                   </div>
                 </div>
                 
                 {campaign.rewards.distribution.filter(d => d.trim() !== '').length > 0 && (
                   <div className="mt-4">
                     <span className="font-medium text-gray-600">Prize Distribution:</span>
                     <div className="mt-2 space-y-1">
                       {campaign.rewards.distribution.filter(d => d.trim() !== '').map((prize, idx) => (
                         <p key={idx} className="text-gray-800 text-sm">• {prize}</p>
                       ))}
                     </div>
                   </div>
                 )}
               </div>

               {/* Rules & Criteria Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <Shield className="h-5 w-5 mr-2 text-purple-500" />
                   Rules & Criteria
                 </h4>
                 
                 <div className="space-y-4 text-sm">
                   <div>
                     <span className="font-medium text-gray-600">Contact Email:</span>
                     <p className="text-gray-800">{campaign.contactEmail || 'Not specified'}</p>
                   </div>
                   
                   {campaign.eligibilityCriteria.filter(c => c.trim() !== '').length > 0 && (
                     <div>
                       <span className="font-medium text-gray-600">Eligibility Criteria:</span>
                       <div className="mt-2 space-y-1">
                         {campaign.eligibilityCriteria.filter(c => c.trim() !== '').map((criteria, idx) => (
                           <p key={idx} className="text-gray-800">• {criteria}</p>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {campaign.requirements.filter(r => r.trim() !== '').length > 0 && (
                     <div>
                       <span className="font-medium text-gray-600">Requirements:</span>
                       <div className="mt-2 space-y-1">
                         {campaign.requirements.filter(r => r.trim() !== '').map((requirement, idx) => (
                           <p key={idx} className="text-gray-800">• {requirement}</p>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {campaign.judgesCriteria.filter(c => c.trim() !== '').length > 0 && (
                     <div>
                       <span className="font-medium text-gray-600">Judging Criteria:</span>
                       <div className="mt-2 space-y-1">
                         {campaign.judgesCriteria.filter(c => c.trim() !== '').map((criteria, idx) => (
                           <p key={idx} className="text-gray-800">• {criteria}</p>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {campaign.submissionGuidelines && (
                     <div>
                       <span className="font-medium text-gray-600">Submission Guidelines:</span>
                       <p className="text-gray-800 mt-1">{campaign.submissionGuidelines}</p>
                     </div>
                   )}
                 </div>
               </div>

               {/* Links & Social Summary */}
               <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                   <LinkIcon className="h-5 w-5 mr-2 text-purple-500" />
                   Links & Media
                 </h4>
                 <div className="space-y-2 text-sm">
                   {campaign.website && (
                     <div>
                       <span className="font-medium text-gray-600">Website:</span>
                       <a href={campaign.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.website}
                       </a>
                     </div>
                   )}
                   {campaign.twitter && (
                     <div>
                       <span className="font-medium text-gray-600">Twitter:</span>
                       <a href={campaign.twitter} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.twitter}
                       </a>
                     </div>
                   )}
                   {campaign.discord && (
                     <div>
                       <span className="font-medium text-gray-600">Discord:</span>
                       <a href={campaign.discord} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.discord}
                       </a>
                     </div>
                   )}
                   {campaign.telegram && (
                     <div>
                       <span className="font-medium text-gray-600">Telegram:</span>
                       <a href={campaign.telegram} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 ml-2">
                         {campaign.telegram}
                       </a>
                     </div>
                   )}
                   <div>
                     <span className="font-medium text-gray-600">Logo:</span>
                     <span className="text-gray-800 ml-2">
                       {campaign.logo ? (campaign.logo.startsWith('File selected:') ? 'File uploaded ✓' : 'URL provided ✓') : 'Not provided'}
                     </span>
                   </div>
                 </div>
               </div>

               {/* Campaign Creation Info */}
               <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                 <div className="flex items-start">
                   <Info className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                   <div>
                     <p className="text-purple-700 font-medium mb-2">Campaign Launch</p>
                     <p className="text-purple-600 text-sm">
                       Your campaign will be deployed on the Sovereign Seas platform with comprehensive metadata. 
                       All media files will be uploaded to IPFS for decentralized storage, and your campaign 
                       will be immediately available for project submissions and community participation.
                     </p>
                     <div className="mt-3 text-xs text-purple-600">
                       <p>• Campaign Type: {campaignTypes.find(t => t.value === campaign.campaignType)?.label}</p>
                       <p>• Duration: {getDurationInDays()} days</p>
                       <p>• Distribution: {campaign.useQuadraticDistribution ? 'Quadratic' : campaign.useCustomDistribution ? 'Custom' : 'Linear'}</p>
                       <p>• Media files: {logoFile ? 1 : 0} file(s)</p>
                       <p>• Token: CELO (Payout & Fees)</p>
                       {!canBypass && feeAmount != null && Number(feeAmount) > 0 ? (
                         <>
                           <p>• Creation Fee: {(Number(feeAmount) / 1e18).toFixed(6)} CELO</p>
                           {celoBalance && Number(celoBalance.value) >= Number(feeAmount) ? (
                             <p className="font-medium text-green-600">
                               • Your Balance: {(Number(celoBalance.value) / 1e18).toFixed(6)} CELO ✓
                             </p>
                           ) : celoBalance ? (
                             <p className="font-medium text-red-600">
                               • Your Balance: {(Number(celoBalance.value) / 1e18).toFixed(6)} CELO ✗
                             </p>
                           ) : (
                             <p className="font-medium text-gray-600">
                               • Your Balance: Loading...
                             </p>
                           )}
                         </>
                       ) : null}
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </Section>

          {/* Card Navigation */}
          <div className="flex justify-between items-center mt-6 mb-4">
            <ButtonCool
              onClick={goToPreviousCard}
              disabled={currentCardIndex === 0}
              text="Previous"
              bgColor="#ffffff"
              textColor="#050505"
              borderColor="#050505"
              size="md"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
            </ButtonCool>
            
            <div className="flex items-center space-x-2 bg-white px-3 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              {cardSections.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToCard(index)}
                  className={`w-3 h-3 rounded-full border-[0.15em] border-[#050505] transition-all ${
                    index === currentCardIndex 
                      ? 'bg-[#a855f7] shadow-[0.1em_0.1em_0_#000000] scale-110' 
                      : index < currentCardIndex 
                        ? 'bg-[#10b981]' 
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <ButtonCool
              onClick={goToNextCard}
              disabled={currentCardIndex === cardSections.length - 1}
              text="Next"
              bgColor="#ffffff"
              textColor="#050505"
              borderColor="#050505"
              size="md"
            >
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </ButtonCool>
          </div>

           {/* Submit Button - Only show on last step */}
           {currentCardIndex === cardSections.length - 1 && (
             <div className="mt-8 space-y-6">
             {/* Balance Warning */}
             {(() => {
               if (!canBypass && feeAmount != null && Number(feeAmount) > 0 && celoBalance && Number(celoBalance.value) < Number(feeAmount)) {
                 return (
                  <div className="group relative w-full mb-6">
                    {/* Pattern Overlays */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                      style={{
                        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                        backgroundSize: '0.5em 0.5em'
                      }}
                    />
                    
                    {/* Warning Card */}
                    <div 
                      className="relative bg-white border-[0.35em] border-[#ef4444] rounded-[0.6em] shadow-[0.7em_0.7em_0_#ef4444] transition-all duration-[400ms] overflow-hidden z-[2]"
                      style={{ boxShadow: 'inset 0 0 0 0.15em rgba(239, 68, 68, 0.1)' }}
                    >
                      {/* Accent Corner */}
                      <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
                      <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚠</div>

                      {/* Title Area */}
                      <div 
                        className="relative px-[1.4em] py-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                        style={{ 
                          background: '#ef4444',
                          backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                          backgroundBlendMode: 'overlay'
                        }}
                      >
                        <div className="flex items-center">
                          <AlertCircle className="h-6 w-6 mr-3 text-white" />
                          <h3 className="text-lg font-extrabold text-white">Insufficient CELO Balance</h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative px-[1.4em] py-[1.5em] z-[2]">
                        <p className="text-[#050505] font-bold text-base mb-2">
                          You need <span className="text-[#ef4444] font-extrabold">{(Number(feeAmount) / 1e18).toFixed(6)} CELO</span> to create a campaign
                        </p>
                        <p className="text-[#050505] font-semibold text-sm">
                          Your current balance: <span className="text-[#ef4444] font-extrabold">{(Number(celoBalance.value) / 1e18).toFixed(6)} CELO</span>
                        </p>
                        <p className="text-[#050505] font-bold text-sm mt-2">
                           Please add more CELO to your wallet before proceeding.
                         </p>
                       </div>
                     </div>
                   </div>
                 );
               }
               return null;
             })()}

             {/* Upload Progress */}
             {(() => {
               if (isUploading || loading) {
                 return (
                  <div className="group relative w-full mb-6">
                    {/* Pattern Overlays */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                      style={{
                        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                        backgroundSize: '0.5em 0.5em'
                      }}
                    />
                    
                    {/* Progress Card */}
                    <div 
                      className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#2563eb] transition-all duration-[400ms] overflow-hidden z-[2]"
                      style={{ boxShadow: 'inset 0 0 0 0.15em rgba(37, 99, 235, 0.1)' }}
                    >
                      {/* Accent Corner */}
                      <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
                      <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⟳</div>

                      {/* Title Area */}
                      <div 
                        className="relative px-[1.4em] py-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                        style={{ 
                          background: '#2563eb',
                          backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                          backgroundBlendMode: 'overlay'
                        }}
                      >
                        <div className="flex items-center">
                          <Loader2 className="h-6 w-6 mr-3 text-white animate-spin" />
                          <h3 className="text-lg font-extrabold text-white">
                         {isUploading ? 'Uploading Files...' : 'Creating Campaign...'}
                          </h3>
                     </div>
                      </div>

                      {/* Content */}
                      <div className="relative px-[1.4em] py-[1.5em] z-[2]">
                        <p className="text-[#050505] font-bold text-base">
                          {isUploading ? 'Uploading media files to IPFS...' : 'Preparing transaction...'}
                        </p>
                      </div>
                    </div>
                   </div>
                 );
               }
               return null;
             })() as React.ReactNode}

             {/* Submit Button */}
             <div className="flex justify-center pt-6">
               <button
                 type="submit"
                  disabled={!!loading || !!isUploading || !!isChainSwitching || (!canBypass && !!feeAmount && !!celoBalance && Number(celoBalance.value) < Number(feeAmount)) as any}
                className="px-12 py-4 bg-[#10b981] text-white border-[0.3em] border-[#050505] rounded-[0.5em] shadow-[0.4em_0.4em_0_#000000] hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.4em_0.4em_0_#000000] transition-all font-extrabold text-lg uppercase tracking-[0.05em] flex items-center group relative overflow-hidden"
               >
                 {loading || isUploading ? (
                   <>
                     <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                     Processing...
                   </>
                 ) : (
                   <>
                     <Trophy className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                     Launch Campaign
                   </>
                 )}
               </button>
             </div>
             
             {/* Helpful message when button is disabled */}
             {!canBypass && feeAmount != null && celoBalance && Number(celoBalance.value) < Number(feeAmount) && (
               <div className="text-center text-sm text-red-500 mt-2">
                 <p>Submit button is disabled due to insufficient CELO balance for the campaign creation fee.</p>
               </div>
             )}
             
             <div className="text-center text-sm text-gray-500 mt-4">
               <p>* Required fields must be completed before submission</p>
               <p className="mt-1">Questions? Visit <a href="https://seas.xyz/docs/funding" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700">seas.xyz/docs/funding</a> for more information</p>
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