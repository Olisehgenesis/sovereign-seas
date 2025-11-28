import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@/utils/nextAdapter';
import {
  ArrowLeft,
  Award,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Clock,
  Lock,
  DollarSign,
  Info,
  AlertTriangle,
  Shield,
  Handshake,
} from 'lucide-react';
import { 
  useCreateSecuredGrant, 
  useCreatePromisedGrant, 
  useGrantCreationFees,
  useCreateGrantWithFees,
  GrantType,
  type MilestoneMetadata
} from '@/hooks/useMilestoneMethods';
import { type Address } from 'viem';
import { parseEther, formatEther, maxUint256 } from 'viem';
import { usePublicClient, useWriteContract } from 'wagmi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useChainSwitch } from '@/hooks/useChainSwitch';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { getCeloTokenAddress, getMainContractAddress } from '@/utils/contractConfig';
import { useAllProjects, formatProjectForDisplay } from '@/hooks/useProjectMethods';
import DynamicHelmet from '@/components/DynamicHelmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonCool } from '@/components/ui/button-cool';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Use grants contract address (SovereignSeasGrants)
const GRANTS_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GRANTS_CONTRACT || process.env.NEXT_PUBLIC_MILESTONE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_V4) as Address;
const MAIN_CONTRACT_ADDRESS = getMainContractAddress();

// Retro Section Component
interface SectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  required?: boolean;
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

// Token Selector Component
interface TokenSelectorProps {
  selectedToken: string;
  onTokenSelect: (tokenAddress: string) => void;
  disabled?: boolean;
  tokenBalances: Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ selectedToken, onTokenSelect, disabled, tokenBalances }) => {
  const tokens = supportedTokens.map(token => ({
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    logo: token.symbol === 'CELO' ? '/images/celo.png' : 
          token.symbol === 'cUSD' ? '/images/cusd.png' : 
          '/images/good.png'
  }));
  
  const selectedTokenData = tokens.find(token => token.address === selectedToken);
  
  const getBalance = (tokenAddress: string) => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === tokenAddress.toLowerCase());
    return tokenBalance ? tokenBalance.formattedBalance : '0.00';
  };

  return (
    <Select value={selectedToken} onValueChange={onTokenSelect} disabled={disabled}>
      <SelectTrigger className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] text-[#050505] font-semibold">
        <SelectValue>
          {selectedTokenData ? (
            <div className="flex items-center space-x-2">
              <img 
                src={selectedTokenData.logo} 
                alt={selectedTokenData.symbol}
                className="w-5 h-5 rounded-full border-[0.1em] border-[#050505]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <span className="font-bold">{selectedTokenData.symbol}</span>
            </div>
          ) : (
            <span className="text-gray-400">Select token</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000]">
        {tokens.map((token) => (
          <SelectItem 
            key={token.address} 
            value={token.address}
            className="hover:bg-[#f3e8ff] cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <img 
                  src={token.logo} 
                  alt={token.symbol}
                  className="w-5 h-5 rounded-full border-[0.1em] border-[#050505]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="font-bold text-[#050505]">{token.symbol}</span>
              </div>
              <span className="text-xs font-bold text-[#050505] ml-4">{getBalance(token.address)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface TokenAmount {
  token: Address;
  amount: string;
  tokenSymbol: string;
}

interface Milestone {
  title: string;
  description: string;
  amount: string; // Percentage of total grant
  metadata: string;
}

export default function CreateGrant() {
  const navigate = useNavigate();
  const { address: activeAddress } = useActiveWallet();
  const { ensureCorrectChain } = useChainSwitch();
  const publicClient = usePublicClient();
  const celoToken = getCeloTokenAddress();
  const { writeContractAsync } = useWriteContract();

  // Form state - New contract structure
  const [grantType, setGrantType] = useState<GrantType>(GrantType.MILESTONE);
  const [isSecured, setIsSecured] = useState<boolean>(true); // Secured vs Promised grant
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkedEntityId, setLinkedEntityId] = useState<string>('');
  const [grantMetadata, setGrantMetadata] = useState<string>('');
  const [paymentToken, setPaymentToken] = useState<Address>(celoToken as Address);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [deadline, setDeadline] = useState<string>(''); // days from now
  const [maxValidationTime, setMaxValidationTime] = useState<string>('7'); // days
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: '', description: '', amount: '', metadata: '' }
  ]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<Record<string, 'pending' | 'approved' | 'needed'>>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [granteeValidationWarning, setGranteeValidationWarning] = useState<string>('');
  
  // Tabbed step interface
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardSections = ['project', 'grant-type', 'details', 'milestones', 'funding', 'review'];
  
  // Project search
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');

  // Token balances
  const [tokenBalances, setTokenBalances] = useState<Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>>([]);

  // Grant creation hooks
  const { createGrantWithFees, isPending, securedGrantCreationFee, promisedGrantCreationFee } = useCreateGrantWithFees(GRANTS_CONTRACT_ADDRESS);
  const { securedFeeFormatted, promisedFeeFormatted } = useGrantCreationFees(GRANTS_CONTRACT_ADDRESS);

  // Fetch all projects for selector
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(MAIN_CONTRACT_ADDRESS);

  // Format projects for display
  const formattedProjects = useMemo(() => {
    if (!allProjects) return [];
    return allProjects
      .map(formatProjectForDisplay)
      .filter(Boolean)
      .filter(p => p && p.active);
  }, [allProjects]);

  // Filter projects based on search (by ID, name, or owner)
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm.trim()) return formattedProjects;
    
    const searchLower = projectSearchTerm.toLowerCase().trim();
    return formattedProjects.filter(project => {
      if (!project) return false;
      
      // Search by ID
      const idMatch = project.id?.toString().includes(searchLower);
      
      // Search by name
      const nameMatch = project.name?.toLowerCase().includes(searchLower);
      
      // Search by owner address
      const ownerMatch = project.owner?.toLowerCase().includes(searchLower);
      
      return idMatch || nameMatch || ownerMatch;
    });
  }, [formattedProjects, projectSearchTerm]);

  // Auto-fill project ID when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      const selectedProject = formattedProjects.find(p => p?.id?.toString() === selectedProjectId);
      if (selectedProject) {
        setLinkedEntityId(selectedProject.id.toString());
        setGranteeValidationWarning('');
      }
    } else {
      setLinkedEntityId('');
    }
  }, [selectedProjectId, formattedProjects]);

  // Load token balances
  useEffect(() => {
    if (!activeAddress || !publicClient) return;

    const loadBalances = async () => {
      const balances = await Promise.all(
        supportedTokens.map(async (token) => {
          try {
            let balance = 0n;
            if (token.address.toLowerCase() === celoToken.toLowerCase()) {
              const result = await publicClient.getBalance({ address: activeAddress as Address });
              balance = result;
            } else {
              const result = await publicClient.readContract({
                address: token.address as Address,
                abi: [
                  {
                    inputs: [{ name: 'account', type: 'address' }],
                    name: 'balanceOf',
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view',
                    type: 'function'
                  }
                ],
                functionName: 'balanceOf',
                args: [activeAddress as Address]
              });
              balance = result as bigint;
            }
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance,
              formattedBalance: formatEther(balance)
            };
          } catch (err) {
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance: 0n,
              formattedBalance: '0.00'
            };
          }
        })
      );
      setTokenBalances(balances);
    };

    loadBalances();
  }, [activeAddress, publicClient, celoToken]);

  // Milestone management
  const addMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', amount: '', metadata: '' }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  // Check token approval status
  const checkTokenApproval = async (tokenAddress: Address, amount: bigint): Promise<boolean> => {
    if (!activeAddress || !publicClient) return false;
    
    // CELO doesn't need approval
    if (tokenAddress.toLowerCase() === celoToken.toLowerCase()) {
      return true;
    }

    try {
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' }
            ],
            name: 'allowance',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'allowance',
        args: [activeAddress as Address, GRANTS_CONTRACT_ADDRESS]
      }) as bigint;

      return currentAllowance >= amount;
    } catch (err) {
      console.error('Error checking approval:', err);
      return false;
    }
  };

  // Approve token
  const approveToken = async (tokenAddress: Address, amount: bigint): Promise<string> => {
    if (!activeAddress) throw new Error('Wallet not connected');
    
    setIsApproving(true);
    try {
      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi: [
          {
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ],
        functionName: 'approve',
        args: [GRANTS_CONTRACT_ADDRESS, amount]
      });

      // Wait for transaction
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      return txHash;
    } finally {
      setIsApproving(false);
    }
  };

  // Validate current step
  const validateStep = (stepIndex: number): boolean => {
    setError('');
    
    switch (stepIndex) {
      case 0: // Project selection
        if (!selectedProjectId || !linkedEntityId) {
          setError('Please select a project');
          return false;
        }
        return true;
      
      case 1: // Grant type
        return true; // Always valid
      
      case 2: // Details
        if (!totalAmount || Number(totalAmount) <= 0) {
          setError('Please enter a valid total amount');
          return false;
        }
        if (!maxValidationTime || Number(maxValidationTime) <= 0) {
          setError('Please enter a valid validation time (days)');
          return false;
        }
        return true;
      
      case 3: // Milestones
        if (milestones.length === 0) {
          setError('Please add at least one milestone');
          return false;
        }
        let totalPercentage = 0;
        for (const milestone of milestones) {
          if (!milestone.title || !milestone.description || !milestone.amount) {
            setError('Please fill in all milestone fields');
            return false;
          }
          const percentage = Number(milestone.amount);
          if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
            setError('Milestone percentages must be between 1 and 100');
            return false;
          }
          totalPercentage += percentage;
        }
        if (Math.abs(totalPercentage - 100) > 0.01) {
          setError(`Milestone percentages must total 100% (currently ${totalPercentage}%)`);
          return false;
        }
        return true;
      
      case 4: // Funding
        // Check balance
        const amount = parseEther(totalAmount);
        const balance = tokenBalances.find(tb => 
          tb.address.toLowerCase() === paymentToken.toLowerCase()
        );
        if (!balance || balance.balance < amount) {
          setError('Insufficient balance for selected token');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    for (let i = 0; i < cardSections.length - 1; i++) {
      if (!validateStep(i)) {
        setCurrentCardIndex(i);
        return false;
      }
    }
    return true;
  };

  // Handle token approval
  const handleApproveToken = async () => {
    if (!activeAddress || !publicClient || !totalAmount) return;

    const amount = parseEther(totalAmount);
    const tokenKey = paymentToken.toLowerCase();
    
    // Check if already approved
    const isApproved = await checkTokenApproval(paymentToken, amount);
    if (isApproved) {
      setApprovalStatus({ ...approvalStatus, [tokenKey]: 'approved' });
      setSuccess('Token already approved');
      return;
    }

    try {
      setIsApproving(true);
      setError('');
      setSuccess('Approving token...');

      const txHash = await approveToken(paymentToken, amount);
      setApprovalStatus({ ...approvalStatus, [tokenKey]: 'approved' });
      setSuccess(`Token approved! Transaction: ${txHash}`);
    } catch (err: any) {
      console.error('Error approving token:', err);
      setError(err.message || 'Failed to approve token. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  // Check and handle approvals before submission
  const ensureTokenApproval = async (): Promise<boolean> => {
    if (!activeAddress || !publicClient || !totalAmount) return false;

    const amount = parseEther(totalAmount);
    const tokenKey = paymentToken.toLowerCase();
    
    // CELO doesn't need approval
    if (paymentToken.toLowerCase() === celoToken.toLowerCase()) {
      return true;
    }

    const isApproved = await checkTokenApproval(paymentToken, amount);
    if (isApproved) {
      setApprovalStatus({ ...approvalStatus, [tokenKey]: 'approved' });
      return true;
    }

    // Try to approve
    try {
      setIsApproving(true);
      setSuccess('Approving token...');
      await approveToken(paymentToken, amount);
      setApprovalStatus({ ...approvalStatus, [tokenKey]: 'approved' });
      return true;
    } catch (err: any) {
      setError(`Token approval required: ${err.message}`);
      setApprovalStatus({ ...approvalStatus, [tokenKey]: 'needed' });
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    if (!activeAddress || !publicClient) {
      setError('Please connect your wallet');
      return;
    }

    try {
      await ensureCorrectChain();

      setIsSubmitting(true);
      setSuccess('Preparing grant creation...');

      // Ensure token approval
      const approved = await ensureTokenApproval();
      if (!approved) {
        setIsSubmitting(false);
        return;
      }

      // Prepare grant data
      const totalAmountBigInt = parseEther(totalAmount);
      const deadlineSeconds = deadline 
        ? BigInt(Math.floor(Date.now() / 1000) + (Number(deadline) * 24 * 60 * 60))
        : BigInt(Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)); // Default 1 year
      
      const maxValidationTimeSeconds = BigInt(Math.floor(Number(maxValidationTime) * 24 * 60 * 60));

      // Prepare milestone data
      const milestoneAmounts = milestones.map(m => {
        const percentage = Number(m.amount);
        return BigInt(Math.floor((Number(totalAmount) * percentage / 100) * 1e18));
      });

      const milestoneMetadata = milestones.map(m => 
        JSON.stringify({
          title: m.title,
          description: m.description,
          percentage: Number(m.amount),
          requirements: '',
          deliverables: [],
          ...(m.metadata ? { metadata: m.metadata } : {})
        } as MilestoneMetadata)
      );

      // Prepare grant metadata
      const grantMetadataJson = JSON.stringify({
        title: `Grant for Project #${linkedEntityId}`,
        description: grantMetadata || `Milestone-based grant for project ${linkedEntityId}`,
        projectId: linkedEntityId,
        grantType: isSecured ? 'secured' : 'promised'
      });

      setSuccess('Creating grant...');

      const txHash = await createGrantWithFees({
        paymentToken,
        totalAmount: totalAmountBigInt,
        deadline: deadlineSeconds,
        grantType,
        linkedId: BigInt(linkedEntityId),
        metadata: grantMetadataJson,
        milestoneAmounts,
        milestoneMetadata,
        maxValidationTime: maxValidationTimeSeconds,
        isSecured
      });

      setSuccess(`Grant created successfully! Transaction: ${txHash}`);
      
      // Wait a bit then navigate to grants page
      setTimeout(() => {
        navigate('/explorer/grants');
      }, 3000);
    } catch (err: any) {
      console.error('Error creating grant:', err);
      let errorMessage = err.message || 'Failed to create grant. Please try again.';
      
      // Parse common errors
      if (errorMessage.includes('allowance') || errorMessage.includes('approve')) {
        errorMessage = 'Token approval required. Please approve the token first.';
      } else if (errorMessage.includes('insufficient')) {
        errorMessage = 'Insufficient balance. Please check your token balance.';
      } else if (errorMessage.includes('deadline')) {
        errorMessage = 'Invalid deadline. Please check the deadline value.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTokenBalance = (tokenAddress: string): string => {
    const balance = tokenBalances.find(tb => tb.address.toLowerCase() === tokenAddress.toLowerCase());
    return balance ? balance.formattedBalance : '0.00';
  };

  return (
    <>
      <DynamicHelmet 
        config={{
          title: 'Create Grant',
          description: 'Create a new milestone-based grant on Sov Seas',
          image: '/og-image.png',
          url: typeof window !== 'undefined' ? window.location.href : '',
          type: 'website'
        }}
      />

      <div className="min-h-screen text-gray-800">
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-3xl mx-auto">
          {/* Header */}
            <div className="mb-6">
              <ButtonCool
              onClick={() => navigate('/explorer/grants')}
                text="Back to Grants"
                bgColor="#ffffff"
                textColor="#050505"
                borderColor="#050505"
                size="md"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
              </ButtonCool>
              <h1 className="text-3xl font-extrabold text-[#050505] mb-2 mt-4 uppercase tracking-[0.05em]">Create Grant</h1>
              <p className="text-[#050505] font-semibold">Create a milestone-based funding grant</p>
            </div>

            {/* Error Summary Panel */}
            {error && (
              <div className="mb-6 group relative w-full">
                <div 
                  className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                    backgroundSize: '0.5em 0.5em'
                  }}
                />
                
                <div 
                  className="relative bg-white border-[0.35em] border-[#ef4444] rounded-[0.6em] shadow-[0.7em_0.7em_0_#ef4444] transition-all duration-[400ms] overflow-hidden z-[2]"
                  style={{ boxShadow: 'inset 0 0 0 0.15em rgba(239, 68, 68, 0.1)' }}
                >
                  <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
                  <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚠</div>

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
                      <h3 className="text-xl font-extrabold text-white">Error</h3>
                    </div>
                  </div>

                  <div className="relative px-[1.4em] py-[1.5em] z-[2]">
                    <p className="text-[#050505] font-bold text-base">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 group relative w-full">
                <div 
                  className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                    backgroundSize: '0.5em 0.5em'
                  }}
                />
                
                <div 
                  className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#10b981] transition-all duration-[400ms] overflow-hidden z-[2]"
                  style={{ boxShadow: 'inset 0 0 0 0.15em rgba(16, 185, 129, 0.1)' }}
                >
                  <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
                  <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">✓</div>

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

                  <div className="relative px-[1.4em] py-[1.5em] z-[2]">
                    <p className="text-[#050505] font-bold text-base">{success}</p>
                  </div>
                </div>
              </div>
            )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Project Selection */}
            <Section 
              id="project" 
              title="Select Project" 
              icon={Award} 
              required
              isVisible={currentCardIndex === 0}
            >
              <div className="space-y-4">
                {/* Searchable Project Selector */}
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Search & Select Project <span className="text-[#ef4444]">*</span>
                  </Label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={(value) => {
                      setSelectedProjectId(value);
                      setProjectSearchTerm(''); // Clear search when selected
                    }}
                    disabled={isSubmitting || projectsLoading}
                  >
                    <SelectTrigger className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] text-[#050505] font-semibold">
                      <SelectValue placeholder={projectsLoading ? 'Loading projects...' : 'Search by ID, name, or owner...'}>
                        {selectedProjectId && formattedProjects.find(p => p?.id?.toString() === selectedProjectId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000]">
                      {/* Search Input inside dropdown */}
                      <div className="sticky top-0 bg-white border-b-[0.2em] border-[#050505] p-2 z-10">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            value={projectSearchTerm}
                            onChange={(e) => setProjectSearchTerm(e.target.value)}
                            placeholder="Search by ID, name, or owner..."
                            className="w-full pl-9 pr-3 py-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] focus:shadow-[0.3em_0.3em_0_#000000] text-[#050505] font-semibold text-sm transition-all placeholder:text-gray-400"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        {projectSearchTerm && (
                          <p className="text-xs font-bold text-[#050505] mt-2 px-1">
                            {filteredProjects.length} project(s) found
                          </p>
                        )}
                      </div>
                      
                      {/* Filtered Project List */}
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredProjects.length === 0 ? (
                          <div className="px-4 py-3 text-[#050505] font-semibold text-sm">
                            {projectsLoading ? 'Loading...' : projectSearchTerm ? 'No projects found matching your search' : 'No projects available'}
                          </div>
                        ) : (
                          filteredProjects.map((project) => {
                            if (!project) return null;
                            return (
                              <SelectItem 
                                key={project.id} 
                                value={project.id.toString()}
                                className="hover:bg-[#f3e8ff] cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#050505]">{project.name}</span>
                                  <span className="text-xs text-[#050505]/70">ID: {project.id.toString()} • Owner: {project.owner?.slice(0, 6)}...{project.owner?.slice(-4)}</span>
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  <p className="text-xs font-bold text-[#050505] mt-2">
                    Search and select the project that will receive the grant. The project owner will be auto-filled as the grantee.
                  </p>
                </div>

                  {/* Project Info Display */}
                  {selectedProjectId && (
                    <div className="p-3 bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[0.3em]">
                      <p className="text-xs font-bold text-[#050505]">
                        Selected: {formattedProjects.find(p => p?.id?.toString() === selectedProjectId)?.name || `Project #${linkedEntityId}`}
                      </p>
                      {formattedProjects.find(p => p?.id?.toString() === selectedProjectId)?.owner && (
                        <p className="text-xs text-[#050505]/70 mt-1">
                          Owner: {formattedProjects.find(p => p?.id?.toString() === selectedProjectId)?.owner?.slice(0, 6)}...{formattedProjects.find(p => p?.id?.toString() === selectedProjectId)?.owner?.slice(-4)}
                        </p>
                      )}
                    </div>
                  )}
                  {granteeValidationWarning && (
                    <div className="mt-3 p-3 bg-[#fef3c7] border-[0.15em] border-[#f59e0b] rounded-[0.3em]">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-[#f59e0b] mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-[#92400e] text-sm">Validation Warning</h4>
                          <p className="text-[#92400e] font-semibold text-sm mt-1">{granteeValidationWarning}</p>
                        </div>
                      </div>
                    </div>
                  )}
                      </div>
            </Section>

            {/* Step 2: Grant Type Selection */}
            <Section 
              id="grant-type" 
              title="Grant Type" 
              icon={Award} 
              required
              isVisible={currentCardIndex === 1}
            >
              <div className="space-y-4">
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Grant Type <span className="text-[#ef4444]">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsSecured(true)}
                      className={`p-4 border-[0.2em] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] transition-all ${
                        isSecured 
                          ? 'bg-[#10b981] border-[#10b981] text-white' 
                          : 'bg-white border-[#050505] text-[#050505] hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Secured Grant</div>
                      <div className="text-xs mt-1 opacity-90">
                        Funds locked upfront
                      </div>
                      {isSecured && securedFeeFormatted && (
                        <div className="text-xs mt-2 font-semibold flex items-center gap-1 justify-center">
                          Fee: {securedFeeFormatted} <img src="/images/celo.png" alt="CELO" width={12} height={12} className="inline-block" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSecured(false)}
                      className={`p-4 border-[0.2em] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] transition-all ${
                        !isSecured 
                          ? 'bg-[#10b981] border-[#10b981] text-white' 
                          : 'bg-white border-[#050505] text-[#050505] hover:bg-gray-50'
                      }`}
                    >
                      <Handshake className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Promised Grant</div>
                      <div className="text-xs mt-1 opacity-90">
                        Funds added later
                      </div>
                      {!isSecured && promisedFeeFormatted && (
                        <div className="text-xs mt-2 font-semibold flex items-center gap-1 justify-center">
                          Fee: {promisedFeeFormatted} <img src="/images/celo.png" alt="CELO" width={12} height={12} className="inline-block" />
                        </div>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-[#050505] mt-2">
                    Secured grants require full funding upfront. Promised grants allow funding to be added later.
                  </p>
                </div>
              </div>
            </Section>

            {/* Step 3: Grant Details */}
            <Section 
              id="details" 
              title="Grant Details" 
              icon={Clock} 
              required
              isVisible={currentCardIndex === 2}
            >
              <div className="space-y-4">
                {/* Total Amount */}
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Total Grant Amount <span className="text-[#ef4444]">*</span>
                  </Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all"
                  />
                  <p className="text-xs font-bold text-[#050505] mt-2">Total amount for the entire grant</p>
                </div>

                {/* Payment Token */}
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Payment Token <span className="text-[#ef4444]">*</span>
                  </Label>
                  <TokenSelector
                    selectedToken={paymentToken}
                    onTokenSelect={(address) => setPaymentToken(address as Address)}
                    disabled={isSubmitting}
                    tokenBalances={tokenBalances}
                  />
                  <p className="text-xs font-bold text-[#050505] mt-2">
                    Balance: {getTokenBalance(paymentToken)} {supportedTokens.find(t => t.address === paymentToken)?.symbol}
                  </p>
                </div>

                {/* Grant Metadata */}
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Grant Description (Optional)
                  </Label>
                  <Textarea
                    id="grantMetadata"
                    value={grantMetadata}
                    onChange={(e) => setGrantMetadata(e.target.value)}
                    placeholder="Describe the purpose and goals of this grant..."
                    className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all min-h-[100px]"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Grant Deadline (days from now) <span className="text-[#ef4444]">*</span>
                  </Label>
                  <Input
                    id="deadline"
                    type="number"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min="1"
                    required
                    className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all"
                  />
                  <p className="text-xs font-bold text-[#050505] mt-2">Number of days until the grant expires</p>
                </div>

                {/* Max Validation Time */}
                <div>
                  <Label className="block text-[#050505] font-extrabold mb-2 uppercase text-sm tracking-[0.05em]">
                    Max Validation Time (days) <span className="text-[#ef4444]">*</span>
                  </Label>
                  <Input
                    id="maxValidationTime"
                    type="number"
                    value={maxValidationTime}
                    onChange={(e) => setMaxValidationTime(e.target.value)}
                    min="1"
                    required
                    className="w-full px-4 py-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] text-[#050505] font-semibold transition-all"
                  />
                  <p className="text-xs font-bold text-[#050505] mt-2 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Milestones will auto-approve after this many days if not reviewed by validators</span>
                  </p>
                </div>
              </div>
            </Section>

            {/* Step 4: Milestones */}
            <Section 
              id="milestones" 
              title="Milestones" 
              icon={CheckCircle} 
              required
              isVisible={currentCardIndex === 3}
            >
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="p-4 border-[0.2em] border-[#050505] rounded-[0.4em] bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[#050505]">Milestone {index + 1}</h4>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          disabled={isSubmitting}
                          className="px-2 py-1 bg-[#ef4444] text-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] transition-all font-bold text-xs disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="block text-[#050505] font-extrabold mb-1 uppercase text-xs tracking-[0.05em]">
                          Title <span className="text-[#ef4444]">*</span>
                        </Label>
                        <Input
                          value={milestone.title}
                          onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                          placeholder="e.g., Complete backend API"
                          required
                          className="w-full px-3 py-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold text-sm"
                        />
                      </div>
                      <div>
                        <Label className="block text-[#050505] font-extrabold mb-1 uppercase text-xs tracking-[0.05em]">
                          Description <span className="text-[#ef4444]">*</span>
                        </Label>
                        <Textarea
                          value={milestone.description}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          placeholder="Describe what needs to be completed..."
                          required
                          className="w-full px-3 py-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold text-sm min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block text-[#050505] font-extrabold mb-1 uppercase text-xs tracking-[0.05em]">
                            Percentage (%) <span className="text-[#ef4444]">*</span>
                          </Label>
                          <Input
                            type="number"
                            value={milestone.amount}
                            onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                            required
                            className="w-full px-3 py-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          {totalAmount && milestone.amount && (
                            <div className="text-xs font-bold text-[#050505] bg-gray-100 px-3 py-2 rounded-[0.3em] w-full">
                              ≈ {((Number(totalAmount) * Number(milestone.amount)) / 100).toFixed(2)} {supportedTokens.find(t => t.address === paymentToken)?.symbol}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="block text-[#050505] font-extrabold mb-1 uppercase text-xs tracking-[0.05em]">
                          Additional Metadata (Optional)
                        </Label>
                        <Input
                          value={milestone.metadata}
                          onChange={(e) => updateMilestone(index, 'metadata', e.target.value)}
                          placeholder="JSON or additional info"
                          className="w-full px-3 py-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] text-[#050505] font-semibold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMilestone}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </button>
                <div className="mt-4 p-3 bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[0.3em]">
                  <p className="text-xs font-bold text-[#050505]">
                    Total: {milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0).toFixed(1)}% 
                    {milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0) !== 100 && (
                      <span className="text-[#ef4444] ml-2">(Must total 100%)</span>
                    )}
                  </p>
                </div>
              </div>
            </Section>

            {/* Step 5: Funding & Approval */}
            <Section 
              id="funding" 
              title="Funding & Token Approval" 
              icon={DollarSign} 
              required
              isVisible={currentCardIndex === 4}
            >
              <div className="space-y-4">
                <div className="p-4 bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em]">
                  <h4 className="font-bold text-[#050505] mb-2">Funding Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#050505] font-semibold">Total Amount:</span>
                      <span className="text-[#050505] font-bold">{totalAmount || '0'} {supportedTokens.find(t => t.address === paymentToken)?.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#050505] font-semibold">Your Balance:</span>
                      <span className="text-[#050505] font-bold">{getTokenBalance(paymentToken)} {supportedTokens.find(t => t.address === paymentToken)?.symbol}</span>
                    </div>
                    {isSecured && securedFeeFormatted && (
                      <div className="flex justify-between">
                        <span className="text-[#050505] font-semibold">Creation Fee:</span>
                        <span className="text-[#050505] font-bold flex items-center gap-1">
                          {securedFeeFormatted} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                        </span>
                      </div>
                    )}
                    {!isSecured && promisedFeeFormatted && (
                      <div className="flex justify-between">
                        <span className="text-[#050505] font-semibold">Creation Fee:</span>
                        <span className="text-[#050505] font-bold flex items-center gap-1">
                          {promisedFeeFormatted} <img src="/images/celo.png" alt="CELO" width={14} height={14} className="inline-block" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {paymentToken.toLowerCase() !== celoToken.toLowerCase() && (
                  <div className="p-4 border-[0.2em] border-[#050505] rounded-[0.4em] bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-[#050505]">Token Approval Required</h4>
                        <p className="text-xs text-[#050505] mt-1">
                          ERC20 tokens need approval before grant creation
                        </p>
                      </div>
                      {approvalStatus[paymentToken.toLowerCase()] === 'approved' ? (
                        <CheckCircle className="w-6 h-6 text-[#10b981]" />
                      ) : (
                        <XCircle className="w-6 h-6 text-[#ef4444]" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleApproveToken}
                      disabled={isApproving || approvalStatus[paymentToken.toLowerCase()] === 'approved' || !totalAmount}
                      className="w-full px-4 py-3 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                          Approving...
                        </>
                      ) : approvalStatus[paymentToken.toLowerCase()] === 'approved' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2 inline" />
                          Approved
                        </>
                      ) : (
                        'Approve Token'
                      )}
                    </button>
                  </div>
                )}

                {paymentToken.toLowerCase() === celoToken.toLowerCase() && (
                  <div className="p-4 border-[0.2em] border-[#10b981] rounded-[0.4em] bg-[#d1fae5]">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-[#10b981] mr-2" />
                      <p className="text-sm font-bold text-[#050505]">
                        CELO is a native token and doesn't require approval
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Step 6: Review */}
            <Section 
              id="review" 
              title="Review & Submit" 
              icon={CheckCircle} 
              isVisible={currentCardIndex === 5}
            >
              <div className="space-y-4">
                <div className="bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] p-4 shadow-[0.2em_0.2em_0_#000000]">
                  <h4 className="font-extrabold text-[#050505] mb-3 uppercase tracking-[0.05em]">Grant Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <p className="font-bold text-[#050505]">Project:</p>
                      <p className="text-[#050505]">
                        {selectedProjectId ? filteredProjects.find(p => p?.id?.toString() === selectedProjectId)?.name || `Project #${linkedEntityId}` : 'Not selected'}
                      </p>
                      <p className="font-bold text-[#050505]">Grant Type:</p>
                      <p className="text-[#050505]">
                        {isSecured ? 'Secured (Funds Locked)' : 'Promised (Funds Added Later)'}
                      </p>
                      <p className="font-bold text-[#050505]">Total Amount:</p>
                      <p className="text-[#050505]">
                        {totalAmount || '0'} {supportedTokens.find(t => t.address === paymentToken)?.symbol}
                      </p>
                      <p className="font-bold text-[#050505]">Payment Token:</p>
                      <p className="text-[#050505]">
                        {supportedTokens.find(t => t.address === paymentToken)?.symbol || 'Not set'}
                      </p>
                      <p className="font-bold text-[#050505]">Deadline:</p>
                      <p className="text-[#050505]">
                        {deadline ? `${deadline} days from now` : 'Not set'}
                      </p>
                      <p className="font-bold text-[#050505]">Max Validation Time:</p>
                      <p className="text-[#050505]">
                        {maxValidationTime} days
                      </p>
                      <p className="font-bold text-[#050505]">Milestones:</p>
                      <p className="text-[#050505]">
                        {milestones.length} milestone(s)
                      </p>
                    </div>
                  </div>
                </div>

                {milestones.length > 0 && (
                  <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] p-4">
                    <h4 className="font-extrabold text-[#050505] mb-3 uppercase tracking-[0.05em] text-sm">Milestones</h4>
                    <div className="space-y-2">
                      {milestones.map((milestone, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded-[0.3em] border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-bold text-[#050505] text-sm">{milestone.title || `Milestone ${index + 1}`}</p>
                              <p className="text-xs text-[#050505]/70 mt-1">{milestone.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#050505]">{milestone.amount}%</p>
                              {totalAmount && milestone.amount && (
                                <p className="text-xs text-[#050505]/70">
                                  ≈ {((Number(totalAmount) * Number(milestone.amount)) / 100).toFixed(2)} {supportedTokens.find(t => t.address === paymentToken)?.symbol}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paymentToken.toLowerCase() !== celoToken.toLowerCase() && approvalStatus[paymentToken.toLowerCase()] !== 'approved' && (
                  <div className="p-4 bg-[#fef3c7] border-[0.2em] border-[#f59e0b] rounded-[0.4em]">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-[#f59e0b] mr-2" />
                      <p className="text-sm font-bold text-[#92400e]">
                        Token approval required before submission. Please go back to the Funding step.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Card Navigation */}
            <div className="flex justify-between items-center mt-6 mb-4">
              <ButtonCool
                onClick={() => {
                  setError('');
                  setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                }}
                disabled={currentCardIndex === 0 || isSubmitting}
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
                    onClick={() => {
                      if (index < currentCardIndex || validateStep(index)) {
                        setError('');
                        setCurrentCardIndex(index);
                      }
                    }}
                    className={`w-3 h-3 rounded-full border-[0.15em] border-[#050505] transition-all ${
                      index === currentCardIndex 
                        ? 'bg-[#a855f7] shadow-[0.1em_0.1em_0_#000000] scale-110' 
                        : index < currentCardIndex 
                          ? 'bg-[#10b981]' 
                          : 'bg-gray-300'
                    }`}
                    title={cardSections[index]}
                  />
                ))}
              </div>
              
              <ButtonCool
                onClick={() => {
                  if (validateStep(currentCardIndex)) {
                    setError('');
                    setCurrentCardIndex(Math.min(cardSections.length - 1, currentCardIndex + 1));
                  }
                }}
                disabled={currentCardIndex === cardSections.length - 1 || isSubmitting}
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
                <div className="flex gap-4">
                  <ButtonCool
                    onClick={() => navigate('/explorer/grants')}
                    disabled={isSubmitting}
                    text="Cancel"
                    bgColor="#ffffff"
                    textColor="#050505"
                    borderColor="#050505"
                    size="md"
                  />
                  <button
                  type="submit"
                  disabled={isSubmitting || isPending || !activeAddress}
                    className="px-6 py-3 bg-[#10b981] text-white border-[0.3em] border-[#050505] rounded-[0.5em] shadow-[0.4em_0.4em_0_#000000] hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0.4em_0.4em_0_#000000] transition-all font-extrabold text-lg uppercase tracking-[0.05em] flex items-center"
                >
                    {(isSubmitting || isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Grant...
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4 mr-2" />
                      Create Grant
                    </>
                  )}
                  </button>
                </div>
              </div>
            )}
          </form>
          </div>
        </div>
      </div>
    </>
  );
}

