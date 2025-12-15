'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@/utils/nextAdapter';
import { getProjectRoute, getCampaignRoute } from '@/utils/hashids';
import { useAccount, useBalance, useWalletClient } from 'wagmi';

import { 
  FileCode,
  Vote,
  Trophy,
  Wallet,
  Loader2,
  Home,
  Shield,
  CheckCircle,
  AlertCircle,
  X,
  User,
  CreditCard
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { useUserVoteHistory } from '@/hooks/useVotingMethods';
import {type Address } from 'viem';
import { getMainContractAddress } from '@/utils/contractConfig';
import { formatEther } from 'viem';
import { v4 as uuidv4 } from 'uuid';
import { getGoodLink } from '@/utils/get-good-link';
import DynamicHelmet from '@/components/DynamicHelmet';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { DashboardTab } from '@/components/profile/DashboardTab';
import { ProjectsTab } from '@/components/profile/ProjectsTab';
import { CampaignsTab } from '@/components/profile/CampaignsTab';
import { VotesTab } from '@/components/profile/VotesTab';
import { IdentityTab } from '@/components/profile/IdentityTab';
import { VerificationComponent } from '@/components/profile/VerificationComponent';

const IS_DEV = process.env.NODE_ENV !== 'production';

// Helper function to safely parse JSON
const safeJsonParse = (jsonString: string, fallback = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return fallback;
  }
};

// Parse project metadata like in projects page
const parseProjectMetadata = (projectDetails: any) => {
  const { metadata } = projectDetails;
  const bioData = safeJsonParse(metadata?.bio || '{}');
  const contractInfo = safeJsonParse(metadata?.contractInfo || '{}');
  const additionalData = safeJsonParse(metadata?.additionalData || '{}');

  return {
    tagline: bioData.tagline || '',
    category: bioData.category || '',
    tags: bioData.tags || [],
    location: bioData.location || '',
    establishedDate: bioData.establishedDate || '',
    website: bioData.website || '',
    blockchain: contractInfo.blockchain || '',
    techStack: contractInfo.techStack || [],
    license: contractInfo.license || '',
    developmentStage: contractInfo.developmentStage || '',
    openSource: contractInfo.openSource !== undefined ? contractInfo.openSource : true,
    logo: additionalData.media?.logo || additionalData.logo || '',
    coverImage: additionalData.media?.coverImage || additionalData.coverImage || '',
    demoVideo: additionalData.media?.demoVideo || additionalData.demoVideo || '',
    demoUrl: additionalData.links?.demoUrl || additionalData.demoUrl || '',
    githubRepo: additionalData.links?.githubRepo || additionalData.githubRepo || '',
    documentation: additionalData.links?.documentation || additionalData.documentation || '',
    karmaGapProfile: additionalData.links?.karmaGapProfile || additionalData.karmaGapProfile || '',
    twitter: additionalData.links?.twitter || additionalData.social?.twitter || additionalData.twitter || '',
    linkedin: additionalData.links?.linkedin || additionalData.social?.linkedin || additionalData.linkedin || '',
    discord: additionalData.links?.discord || additionalData.social?.discord || additionalData.discord || '',
    telegram: additionalData.links?.telegram || additionalData.social?.telegram || additionalData.telegram || '',
    teamMembers: additionalData.teamMembers || [],
    contactEmail: additionalData.contactEmail || '',
    keyFeatures: additionalData.keyFeatures || [],
    bio: bioData.bio || metadata?.bio || ''
  };
};

// Parse campaign metadata like in campaigns page
const parseCampaignMetadata = (campaignDetails: any) => {
  let parsedMetadata: any = {};
  
  try {
    if (campaignDetails.metadata?.mainInfo) {
      try {
        const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
        parsedMetadata = { ...parsedMetadata, ...mainInfo };
      } catch (e) {
        parsedMetadata.mainInfo = campaignDetails.metadata.mainInfo;
      }
    }

    if (campaignDetails.metadata?.additionalInfo) {
      try {
        const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
        parsedMetadata = { ...parsedMetadata, ...additionalInfo };
      } catch (e) {
        parsedMetadata.additionalInfo = campaignDetails.metadata.additionalInfo;
      }
    }
  } catch (e) {
    console.warn('Error parsing campaign metadata:', e);
  }

  return parsedMetadata;
};

import GoodDollarVerifyModal from '@/components/goodDollar';

// Get contract address using getMainContractAddress to support Celo Sepolia
const CONTRACT_ADDRESS = getMainContractAddress();
const CELO_TOKEN = process.env.NEXT_PUBLIC_CELO_TOKEN as Address;
  



export default function ProfilePage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [showGoodDollarVerification, setShowGoodDollarVerification] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [verificationProviders, setVerificationProviders] = useState<string[]>([]);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showGoodDollarPopup, setShowGoodDollarPopup] = useState(false);
  const [goodDollarLink, setGoodDollarLink] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();

  // Add this function to refresh verification data
  const refreshVerificationData = async () => {
    if (!address) return;
    
    setVerificationLoading(true);
    try {
      console.log('Refreshing verification data for wallet:', address);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`https://selfauth.vercel.app/api/verify?wallet=${address.toLowerCase()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Refresh API Response received:', data);
      
      // Handle the new API response structure
      setIsVerified(!!data.verified);
      setVerificationProviders(data.profile?.providers || []);
      setVerificationDetails({
        gooddollar: data.gooddollar || { isVerified: false },
        self: data.self || { 
          isVerified: false,
          nationality: null,
          attestationId: null,
          timestamp: null,
          userDefinedData: null,
          verificationOptions: null
        },
      });
      console.log('Verification data refreshed successfully');
      console.log('isVerified state set to:', !!data.verified);
      console.log('Self verification status:', data.self?.isVerified);
    } catch (error) {
      console.error('Error refreshing verification data:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request timeout during refresh');
        } else if (error.message.includes('HTTP error')) {
          console.error('HTTP Error during refresh:', error.message);
        } else {
          console.error('Network Error during refresh - API endpoint may be down');
        }
      }
      
      // Set verification to false on error
      console.log('Setting verification status to false due to refresh error');
      setIsVerified(false);
      setVerificationProviders([]);
      setVerificationDetails({
        gooddollar: { 
          isVerified: false,
          wallet: address,
          root: null,
          expiry: null
        },
        self: { 
          isVerified: false,
          nationality: null,
          attestationId: null,
          timestamp: null,
          userDefinedData: null,
          verificationOptions: null
        }
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  // Debug function to test API directly - can be called from browser console
  const debugApiCall = async (testAddress?: string) => {
    const targetAddress = testAddress || address;
    if (!targetAddress) {
      console.error('No address available for testing');
      return;
    }

    console.log('=== DEBUG API CALL ===');
    console.log('Testing address:', targetAddress);
    
    try {
      // Test 1: Direct fetch with minimal headers
      console.log('\n--- Test 1: Direct fetch ---');
      const response1 = await fetch(`https://selfauth.vercel.app/api/verify?wallet=${targetAddress.toLowerCase()}`);
      const data1 = await response1.json();
      console.log('Response 1:', data1);
      
      // Test 2: Fetch with app headers
      console.log('\n--- Test 2: App headers ---');
      const response2 = await fetch(`https://selfauth.vercel.app/api/verify?wallet=${targetAddress.toLowerCase()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const data2 = await response2.json();
      console.log('Response 2:', data2);
      
      
      
      // Compare results
      console.log('\n--- Comparison ---');
      console.log('All responses identical:', JSON.stringify(data1) === JSON.stringify(data2));
      console.log('Response 1 verified:', data1.verified);
      console.log('Response 2 verified:', data2.verified);
      
    } catch (error) {
      console.error('Debug API call failed:', error);
    }
  };

  // Expose debug function to window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugVerificationApi = debugApiCall;
      console.log('Debug function available: window.debugVerificationApi()');
    }
  }, [address]);



  // Generate userId using uuidv4 like playground
  useEffect(() => {
    if (!userId) {
      const newUserId = uuidv4();
      setUserId(newUserId);
      console.log('Generated new userId:', newUserId);
    }
  }, [userId]);

  // Handle GoodDollar verification completion
  const handleGoodDollarVerificationComplete = async (data: any) => {
    console.log('GoodDollar verification complete:', data);
    setShowGoodDollarVerification(false);
    
    if (!address) {
      setVerificationError('No wallet address found');
      setVerificationStatus('error');
      setShowSuccessModal(true);
      return;
    }

    try {
      console.log('Starting GoodDollar verification save...');
      const response = await fetch('https://selfauth.vercel.app/api/verify-gooddollar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: address.toLowerCase(),
          userId: address.toLowerCase(), // Use wallet address as userId
          verificationStatus: true,
          root: data?.root || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('GoodDollar verification save response:', responseData);

      if (responseData.status === 'success') {
        console.log('GoodDollar verification saved successfully');
        
        // Update verification details to include Good Dollar verification
        setVerificationDetails((prev: any) => ({
          ...prev,
          gooddollar: {
            isVerified: true,
            wallet: address,
            root: data?.root || null,
            expiry: null
          }
        }));
        
        // Update providers list to include Good Dollar
        setVerificationProviders((prev: string[]) => {
          if (!prev.includes('GoodDollar')) {
            return [...prev, 'GoodDollar'];
          }
          return prev;
        });
        
        setIsVerified(true);
        setShowSuccessModal(true);
        setVerificationStatus('success');
        setVerificationError(null);
      } else {
        console.error('GoodDollar verification save failed:', responseData.reason);
        setVerificationError(responseData.reason || 'Failed to save GoodDollar verification. Please try again.');
        setVerificationStatus('error');
        setShowSuccessModal(true);
        if (typeof window !== 'undefined') {
          window.alert(responseData.reason || 'Failed to save GoodDollar verification. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error during GoodDollar verification save:', err);
      setVerificationError(err instanceof Error ? err.message : 'Failed to save GoodDollar verification. Please try again.');
      setVerificationStatus('error');
      setShowSuccessModal(true);
      if (typeof window !== 'undefined') {
        window.alert(err instanceof Error ? err.message : 'Failed to save GoodDollar verification. Please try again.');
      }
    }
  };

  // Handler for GoodDollar Verify button
  const handleGoodDollarVerifyClick = async () => {
    if (!address) return;
    setShowGoodDollarPopup(true);
    setGoodDollarLink(null);
    try {
      if (!walletClient) {
        setGoodDollarLink(null);
        if (typeof window !== 'undefined') {
          window.alert('Wallet client not available. Please connect your wallet.');
        }
        return;
      }
      const link = await getGoodLink({
        address,
        walletClient,
        popupMode: true,
        callbackUrl: typeof window !== 'undefined' ? window.location.href : '',
        chainId: undefined
      });
      setGoodDollarLink(link);
    } catch (e) {
      setGoodDollarLink(null);
      if (typeof window !== 'undefined') {
        window.alert('Failed to generate GoodDollar verification link.');
      }
    }
  };

  // Get user's CELO balance
  const { data: celoBalance } = useBalance({
    address,
    token: CELO_TOKEN,
  });

  // Check if user is verified when wallet connects (single API call for all verification info)
  useEffect(() => {
    if (isConnected && address) {
      setVerificationLoading(true);
      
      const fetchVerificationData = async () => {
        try {
          console.log('Attempting to fetch verification data for wallet:', address);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          //chcek if adress is null or undefined
          if (!address){
            alert('No address found');
            return;
          }else{
            //log the address
            console.log('Address found:', address);
            

          }
          //convert address to string and lowercase
          const strAddress = address.toString().toLowerCase();

          // Add cache-busting and debugging headers
          const apiUrl = `https://selfauth.vercel.app/api/verify?wallet=${strAddress}`;
          console.log('Making request to:', apiUrl);
          
          const requestHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            
          };
          
          console.log('Request headers:', requestHeaders);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: requestHeaders,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const responseText = await response.text();
          console.log('Raw response text:', responseText);
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Response text was:', responseText);
            throw new Error('Invalid JSON response from server');
          }
          
          console.log('Parsed API Response received:', data);
          console.log('Response type:', typeof data);
          console.log('Response keys:', Object.keys(data));
          
          // Handle the new API response structure with proper fallbacks
          // Get Self verification data from the verify endpoint
          const selfData = data.self || { 
            isVerified: false,
            nationality: null,
            attestationId: null,
            timestamp: null,
            userDefinedData: null,
            verificationOptions: null
          };
          
          // Get Good Dollar verification data from verify-details endpoint
          let goodDollarData = { 
            isVerified: false,
            wallet: address,
            root: null,
            expiry: null
          };
          
          try {
            const goodDollarResponse = await fetch(`https://selfauth.vercel.app/api/verify-details?wallet=${strAddress}`);
            if (goodDollarResponse.ok) {
              const goodDollarResult = await goodDollarResponse.json();
              goodDollarData = goodDollarResult.gooddollar || goodDollarData;
            }
          } catch (error) {
            console.error('Error fetching Good Dollar verification:', error);
          }
          
          // Combine Self and Good Dollar verification status
          const selfVerified = !!data.verified;
          const selfProviders = data.profile?.providers || [];
          
          // Determine overall verification status and providers
          const allProviders = [...selfProviders];
          let overallVerified = selfVerified;
          
          // Add Good Dollar to providers if verified
          if (goodDollarData.isVerified && !allProviders.includes('GoodDollar')) {
            allProviders.push('GoodDollar');
            overallVerified = true;
          }
          
          const verified = overallVerified;
          const providers = allProviders;
          
          const verificationDetails = {
            gooddollar: goodDollarData,
            self: selfData,
          };
          
          console.log('Setting verification state:');
          console.log('- verified:', verified);
          console.log('- providers:', providers);
          console.log('- verificationDetails:', verificationDetails);
          
          setIsVerified(verified);
          setVerificationProviders(providers);
          setVerificationDetails(verificationDetails);
          
          console.log('Verification details:', { gooddollar: data.gooddollar, self: data.self });
          console.log('Full verification response:', data);
          console.log('isVerified state set to:', verified);
          console.log('Self verification status:', data.self?.isVerified);
        } catch (error) {
          console.error('Error checking verification status:', error);
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              console.error('Request timeout - API endpoint may be down or unreachable');
            } else if (error.message.includes('HTTP error')) {
              console.error('HTTP Error:', error.message);
            } else {
              console.error('Network Error - API endpoint may be down or unreachable');
              console.error('Trying to ping the API endpoint...');
              
              // Try a simple ping to check if the domain is reachable
              try {
                const pingController = new AbortController();
                const pingTimeoutId = setTimeout(() => pingController.abort(), 5000);
                
                await fetch('https://selfauth.vercel.app', {
                  method: 'GET',
                  signal: pingController.signal
                });
                
                clearTimeout(pingTimeoutId);
                console.log('Domain is reachable, but API endpoint may be down');
              } catch (pingError) {
                const errorMessage = pingError instanceof Error ? pingError.message : 'Unknown error';
                console.error('Domain is not reachable:', errorMessage);
              }
            }
          }
          
          // Set default values on error - ensure verification is set to false
          console.log('Setting verification status to false due to error');
          setIsVerified(false);
          setVerificationProviders([]);
          setVerificationDetails({
            gooddollar: { 
              isVerified: false,
              wallet: address,
              root: null,
              expiry: null
            },
            self: { 
              isVerified: false,
              nationality: null,
              attestationId: null,
              timestamp: null,
              userDefinedData: null,
              verificationOptions: null
            }
          });
        } finally {
          setVerificationLoading(false);
        }
      };
      
      fetchVerificationData();
    }
  }, [isConnected, address]);

  // Fetch user's data
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns: allCampaigns, isLoading: campaignsLoading } = useAllCampaigns(CONTRACT_ADDRESS);
  const { voteHistory, isLoading: votesLoading } = useUserVoteHistory(CONTRACT_ADDRESS, address as Address);

  // Filter and process user's data
  const userProjects = allProjects?.filter(project => 
    project.project.owner?.toLowerCase() === address?.toLowerCase()
  ).map(projectDetails => {
    const parsedMetadata = parseProjectMetadata(projectDetails);
    return {
      ...projectDetails.project,
      metadata: parsedMetadata
    };
  }) || [];

  const userCampaigns = allCampaigns?.filter(campaign => 
    campaign.campaign.admin?.toLowerCase() === address?.toLowerCase()
  ).map(campaignDetails => {
    const parsedMetadata = parseCampaignMetadata(campaignDetails);
    return {
      ...campaignDetails.campaign,
      metadata: parsedMetadata
    };
  }) || [];

  // Calculate user metrics including verification status
  const userMetrics = useMemo(() => {
    const totalVotes = voteHistory?.length || 0;
    const totalVoteValue = voteHistory?.reduce((sum, vote) => 
      sum + (Number(formatEther(vote.celoEquivalent || 0n))), 0
    ) || 0;

    return {
      projects: userProjects.length,
      campaigns: userCampaigns.length,
      votes: totalVotes,
      totalVoteValue: totalVoteValue.toFixed(2),
      balance: celoBalance ? Number(formatEther(celoBalance.value)).toFixed(2) : '0.00',
      isVerified
    };
  }, [userProjects, userCampaigns, voteHistory, celoBalance, isVerified]);

  // Filter and sort data
  const filteredProjects = useMemo(() => {
    let filtered = [...userProjects];

    if (filter !== 'all') {
      filtered = filtered.filter(project => project.active === (filter === 'active'));
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'recent':
        default:
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      }
    });
  }, [userProjects, filter, sortBy]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="group relative w-full max-w-sm mx-auto">
          <div 
            className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative px-6 py-6 text-center z-[2]">
              <Wallet className="h-12 w-12 text-[#2563eb] mx-auto mb-4" />
              <h1 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Connect Your Wallet</h1>
              <p className="text-[#050505] mb-4 text-sm font-semibold">Please connect your wallet to view your profile.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (projectsLoading || campaignsLoading || votesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="group relative w-full max-w-sm mx-auto">
          <div 
            className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative px-6 py-6 text-center z-[2]">
              <Loader2 className="h-8 w-8 text-[#2563eb] animate-spin mx-auto mb-4" />
              <p className="text-[#050505] text-sm font-bold">Loading your profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: 'My Profile',
        description: 'View your projects, campaigns, and voting history on Sov Seas',
        image: '/og-image.png',
        url: typeof window !== 'undefined' ? window.location.href : '',
        type: 'website'
      }}
    />
    
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <ProfileHeader
          address={address}
          isVerified={isVerified}
          verificationDetails={verificationDetails}
          verificationProviders={verificationProviders}
          verificationLoading={verificationLoading}
          onVerifyClick={() => { setShowVerification(true); setShowMethodSelection(false); }}
          onGoodDollarVerifyClick={handleGoodDollarVerifyClick}
          userMetrics={userMetrics}
        />

        {/* Navigation Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'projects', label: 'Projects', icon: FileCode, count: userMetrics.projects },
            { id: 'campaigns', label: 'Campaigns', icon: Trophy, count: userMetrics.campaigns },
            { id: 'votes', label: 'Votes', icon: Vote, count: userMetrics.votes },
            { id: 'identity', label: 'Identity', icon: Shield }
          ]}
        />

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            navigate={navigate}
            userMetrics={userMetrics}
            userProjects={userProjects}
            userCampaigns={userCampaigns}
            voteHistory={voteHistory || []}
            allProjects={allProjects}
            CELO_TOKEN={CELO_TOKEN}
          />
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <ProjectsTab
            filteredProjects={filteredProjects}
            filter={filter}
            sortBy={sortBy}
            onFilterChange={setFilter}
            onSortChange={setSortBy}
            navigate={navigate}
            getProjectRoute={getProjectRoute}
          />
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <CampaignsTab
            userCampaigns={userCampaigns}
            navigate={navigate}
            getCampaignRoute={getCampaignRoute}
          />
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <VotesTab
            userMetrics={userMetrics}
            voteHistory={voteHistory || []}
            allProjects={allProjects}
            allCampaigns={allCampaigns}
            CELO_TOKEN={CELO_TOKEN}
            navigate={navigate}
            getProjectRoute={getProjectRoute}
            getCampaignRoute={getCampaignRoute}
          />
        )}

        {/* Identity Tab */}
        {activeTab === 'identity' && (
          <IdentityTab
            isVerified={isVerified}
            verificationProviders={verificationProviders}
            verificationDetails={verificationDetails}
            verificationLoading={verificationLoading}
            onVerifyClick={() => { setShowVerification(true); setShowMethodSelection(false); }}
            onMethodSelectionClick={() => setShowMethodSelection(true)}
            debugApiCall={IS_DEV ? debugApiCall : undefined}
            refreshVerificationData={refreshVerificationData}
            showDebugTools={IS_DEV}
          />
        )}


     {/* Verification Method Selection Modal */}
     {showMethodSelection && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
         <div className="bg-white rounded-lg p-6 max-w-md w-full mt-4 sm:mt-8 lg:mt-16 mb-4">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-gray-900">Choose Verification Method</h3>
             <button
               onClick={() => setShowMethodSelection(false)}
               className="text-gray-400 hover:text-gray-600"
             >
               <X className="h-5 w-5" />
             </button>
           </div>
           
           <p className="text-sm text-gray-600 mb-6">
             Select your preferred identity verification method:
           </p>

           <div className="space-y-3">
             <button
               onClick={() => {
                 setShowMethodSelection(false);
                 setShowVerification(true);
               }}
               className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border border-blue-200 transition-all group"
             >
               <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                 <User className="h-6 w-6" />
               </div>
               <div className="text-left">
                 <h4 className="font-semibold text-gray-900">Self Protocol</h4>
                 <p className="text-xs text-gray-600">Decentralized identity verification</p>
               </div>
             </button>
             
             <button
               onClick={() => {
                 setShowMethodSelection(false);
                 setShowGoodDollarVerification(true);
               }}
               className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg border border-green-200 transition-all group"
             >
               <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                 <CreditCard className="h-6 w-6" />
               </div>
               <div className="text-left">
                 <h4 className="font-semibold text-gray-900">Good Dollar</h4>
                 <p className="text-xs text-gray-600">Universal basic income verification</p>
               </div>
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Verification Success Modal */}
     {showSuccessModal && (
       <div 
         className="fixed inset-0 bg-black/60 flex items-start justify-center z-[9999] p-4 backdrop-blur-sm overflow-y-auto"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
         onClick={() => setShowSuccessModal(false)}
       >
         <div 
           className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 relative overflow-hidden mt-4 sm:mt-8 lg:mt-16 mb-4"
           style={{ position: 'relative', zIndex: 10000 }}
           onClick={(e) => e.stopPropagation()}
         >
           {/* Header */}
           <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
             <button
               onClick={() => setShowSuccessModal(false)}
               className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-150 p-2 rounded-full hover:bg-white/10 z-10"
             >
               <X className="h-5 w-5" />
             </button>
             
             <div className="relative z-10">
               <div className="flex items-center mb-2">
                 <Shield className="h-6 w-6 mr-2 text-blue-300" />
                 <h3 className="text-xl font-bold">Identity Verification</h3>
               </div>
             </div>
           </div>

           <div className="p-6">
           
           <div className="text-center mb-6">
             {verificationStatus === 'loading' && (
               <>
                 <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                 <p className="text-gray-600">Saving verification status...</p>
               </>
             )}
             
             {verificationStatus === 'success' && (
               <>
                 <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                 <h4 className="text-lg font-semibold text-gray-900 mb-2">Identity Verified!</h4>
                 <p className="text-gray-600">Your identity has been successfully verified.</p>
               </>
             )}
             
             {verificationStatus === 'error' && (
               <>
                 <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                 <h4 className="text-lg font-semibold text-gray-900 mb-2">Verification Error</h4>
                 <p className="text-red-600 mb-2">{verificationError}</p>
                 <p className="text-gray-600">Please try again later.</p>
               </>
             )}
           </div>

           {verificationStatus === 'success' && (
             <button
               onClick={() => {
                 setShowSuccessModal(false);
                 setIsVerified(true);
               }}
               className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
             >
               Continue
             </button>
           )}

           {verificationStatus === 'error' && (
             <button
               onClick={() => {
                 setShowSuccessModal(false);
                 setShowVerification(true);
               }}
               className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
             >
               Try Again
             </button>
           )}
           </div>
         </div>
       </div>
     )}

     {/* Verification Modal */}
     {showVerification && userId && (
       <div 
         className="fixed inset-0 bg-black/60 flex items-start justify-center z-[9999] p-4 backdrop-blur-sm overflow-y-auto"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
         onClick={() => setShowVerification(false)}
       >
         <div 
           className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 relative overflow-hidden max-h-[90vh] overflow-y-auto mt-4 sm:mt-8 lg:mt-16 mb-4"
           style={{ position: 'relative', zIndex: 10000 }}
           onClick={(e) => e.stopPropagation()}
         >
           {/* Header */}
           <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
             <button
               onClick={() => setShowVerification(false)}
               className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-10"
             >
               <X className="h-5 w-5" />
             </button>
             
             <div className="relative z-10">
               <div className="flex items-center mb-2">
                 <Shield className="h-6 w-6 mr-2 text-blue-300" />
                 <h3 className="text-xl font-bold">Verify Identity</h3>
               </div>
               <p className="text-blue-100 text-sm">
                 Scan the QR code with the Self app to verify your identity. This will enable enhanced features and anti-Sybil protection.
               </p>
             </div>
           </div>

           <div className="p-6">
             <VerificationComponent 
               onSuccess={() => {
                 console.log('[ProfilePage] Self verification onSuccess triggered');
                 refreshVerificationData();
                 setShowVerification(false);
               }}
               onError={(error) => {
                 console.error('[ProfilePage] Self verification error:', error);
               }}
             />
           </div>
         </div>
       </div>
     )}

     {/* GoodDollar Verification Modal */}
     <ErrorBoundary
       fallback={
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-white rounded-lg p-6 max-w-md w-full mt-4 sm:mt-8 lg:mt-16 mb-4">
             <div className="text-center">
               <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-gray-900 mb-2">Verification Error</h3>
               <p className="text-gray-600 mb-4">There was an error loading the verification modal. Please try again.</p>
               <button
                 onClick={() => setShowGoodDollarVerification(false)}
                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       }
     >
       <GoodDollarVerifyModal 
         isOpen={showGoodDollarVerification}
         onClose={() => setShowGoodDollarVerification(false)}
         onVerificationComplete={handleGoodDollarVerificationComplete}
       />
     </ErrorBoundary>

     {/* GoodDollar Face Verification Popup */}
     {showGoodDollarPopup && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
         <div className="bg-white rounded-lg p-6 max-w-md w-full relative mt-4 sm:mt-8 lg:mt-16 mb-4">
           <button
             className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
             onClick={() => setShowGoodDollarPopup(false)}
           >
             <X className="h-5 w-5" />
           </button>
           <h3 className="text-lg font-bold text-gray-900 mb-4">GoodDollar Face Verification</h3>
           <p className="text-sm text-gray-600 mb-4">To verify with GoodDollar, click the button below to start the face verification process.</p>
           {goodDollarLink ? (
             <a
               href={goodDollarLink}
               target="_blank"
               rel="noopener noreferrer"
               className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg text-center font-medium hover:bg-green-700 transition-colors mb-2"
             >
               Start GoodDollar Verification
             </a>
           ) : (
             <div className="flex items-center justify-center py-6">
               <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
             </div>
           )}
         </div>
       </div>
     )}
   </div>
 </div>
    </>
);
}