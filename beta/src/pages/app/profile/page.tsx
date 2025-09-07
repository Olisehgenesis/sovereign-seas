'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
// import { motion, AnimatePresence } from 'framer-motion'; // Removed for performance optimization
// import axios from 'axios'; // Removed to use fetch instead
import { 
  FileCode,
  Vote,
  Coins,
  Trophy,
  Plus,
  Filter,
  SortAsc,
  ExternalLink,
  Wallet,
  Loader2,
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  BarChart3,
  Home,
  Compass,
  CheckCircle,
  AlertCircle,
  Shield,
  UserCheck,
  X,
  Star,
  User,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { useUserVoteHistory } from '@/hooks/useVotingMethods';
import {type Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { v4 as uuidv4 } from 'uuid';
import  { SelfAppBuilder, SelfQRcodeWrapper } from '@selfxyz/qrcode';
import { getUniversalLink } from "@selfxyz/core";
import { getGoodLink } from '@/utils/get-good-link';

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

// GoodDollar imports
import GoodDollarVerifyModal from '@/components/goodDollar';
import LocationBadge from '@/components/LocationBadge';
import { getNormalizedLocation } from '@/utils/locationUtils';
import CountryFlag from 'react-country-flag';
import { getFlagColorData } from '@/utils/flagUtils';
// Add GoodDollar logo import (add the image to public/images/gooddollar.png if not present)
// import goodDollarLogo from '/public/images/good.png';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;
const CELO_TOKEN = import.meta.env.VITE_CELO_TOKEN as Address;

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  trend?: number | null;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function VerificationComponent({ onSuccess, onError }: { onSuccess: () => void; onError: (error: any) => void }) {
  const { address } = useAccount();
  const [universalLink, setUniversalLink] = useState<string | null>(null);
  if (!address) return null;
  const selfApp = new SelfAppBuilder({
    version : 2,
    appName: "Sovereign Seas",
    scope: "seasv2",
    endpoint: "https://selfauth.vercel.app/api/verify",
    logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
    endpointType: "https",
    userDefinedData: "Sovereign Seas V4.2",
    userId: address,
    userIdType: "hex",
    disclosures: {
      nationality: true,
      minimumAge: 18,
      gender: true,
      excludedCountries: [],
      ofac: false,
    },
  }).build();

  useEffect(() => {
    setUniversalLink(getUniversalLink(selfApp as any));
  }, [address]);

  return (
    <div>
      {/* Show deep link button on mobile */}
      <div className="md:hidden flex flex-col items-center gap-2 mb-4">
        <button
          onClick={() => universalLink && window.open(universalLink, '_blank')}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors duration-150 font-medium"
        >
          <Smartphone className="h-5 w-5" />
          Open Self App
        </button>
        <p className="text-xs text-gray-500">Tap to open the Self app directly</p>
      </div>
      {/* Show QR code on desktop */}
      <div className="hidden md:flex justify-center">
        <SelfQRcodeWrapper
          selfApp={selfApp}
          onSuccess={onSuccess}
          darkMode={true}
          onError={onError}
        />
      </div>
    </div>
  );
}




const StatCard = ({ icon: Icon, label, value, color = 'blue', trend = null, onClick }: StatCardProps) => (
  <div 
    className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl p-4 shadow-sm border border-${color}-200/50 hover:shadow-lg transition-shadow duration-150 ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <div 
        className={`w-10 h-10 bg-${color}-500/10 rounded-lg flex items-center justify-center`}
      >
        <Icon className={`h-5 w-5 text-${color}-600`} />
      </div>
      {trend && (
        <div 
          className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          <TrendingUp className="h-3 w-3" />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
    <p 
      className="text-2xl font-bold text-gray-900 mb-1"
    >
      {value}
    </p>
    <p className="text-xs font-medium text-gray-600">{label}</p>
  </div>
);

interface ProjectCardProps {
  project: {
    name: string;
    description: string;
    active: boolean;
    createdAt: bigint;
    campaignIds?: bigint[];
    metadata: {
      tagline?: string;
      category?: string;
      tags?: string[];
      location?: string;
      establishedDate?: string;
      website?: string;
      blockchain?: string;
      techStack?: string[];
      license?: string;
      developmentStage?: string;
      openSource?: boolean;
      logo?: string;
      coverImage?: string;
      demoVideo?: string;
      demoUrl?: string;
      githubRepo?: string;
      documentation?: string;
      karmaGapProfile?: string;
      twitter?: string;
      linkedin?: string;
      discord?: string;
      telegram?: string;
      teamMembers?: any[];
      contactEmail?: string;
      keyFeatures?: string[];
      bio?: string;
    };
  };
  onClick: () => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const location = getNormalizedLocation(project.metadata);

  // Get logo from processed metadata
  const projectLogo = project.metadata.logo || project.metadata.coverImage || null;

  // Debug logging for logo issues
  if (import.meta.env.DEV && !projectLogo) {
    console.log(`No logo found for project ${project.name}:`, {
      metadata: project.metadata,
      logo: project.metadata.logo,
      coverImage: project.metadata.coverImage
    });
  }

  return (
    <div 
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/50 hover:shadow-xl transition-shadow duration-150 group relative"
    >
      {/* Location Badge (card style) */}
      <LocationBadge location={location} variant="card" />
              <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {projectLogo ? (
              <img
                src={formatIpfsUrl(projectLogo)}
                alt={`${project.name} logo`}
                className="w-12 h-12 rounded-xl object-cover shadow-md"
                onError={(e) => {
                  console.warn(`Failed to load logo for project ${project.name}:`, projectLogo);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div 
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md"
              >
                {project.name?.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors duration-150 mb-1">
                {project.name}
              </h3>
              <div 
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  project.active ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
                }`}
              >
                {project.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        <div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-150" />
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">{project.description}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>Created {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
        <span className="font-medium">{project.campaignIds?.length || 0} campaigns</span>
      </div>
      
      <button
        onClick={onClick}
        className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors duration-150 text-sm font-semibold"
      >
        View Project
      </button>
    </div>
  );
};

interface CampaignCardProps {
  campaign: {
    name: string;
    description: string;
    active: boolean;
    startTime: bigint;
    endTime: bigint;
    maxWinners: bigint;
    totalFunds: bigint;
    metadata: {
      type?: string;
      category?: string;
      tags?: string[];
      logo?: string;
      bannerImage?: string;
      bio?: string;
      tagline?: string;
      [key: string]: any;
    };
  };
  onClick: () => void;
}

const CampaignCard = ({ campaign, onClick }: CampaignCardProps) => {
  // Get logo from processed metadata
  const campaignLogo = campaign.metadata.logo || campaign.metadata.bannerImage || null;

  // Debug logging for logo issues
  if (import.meta.env.DEV && !campaignLogo) {
    console.log(`No logo found for campaign ${campaign.name}:`, {
      metadata: campaign.metadata,
      logo: campaign.metadata.logo,
      bannerImage: campaign.metadata.bannerImage
    });
  }

  const getStatus = () => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(campaign.startTime);
    const end = Number(campaign.endTime);
    
    if (!campaign.active) return 'inactive';
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'active';
    return 'ended';
  };

  const status = getStatus();
  const statusColors = {
    active: 'text-green-600 bg-green-50',
    ended: 'text-gray-600 bg-gray-50',
    upcoming: 'text-blue-600 bg-blue-50',
    inactive: 'text-red-600 bg-red-50'
  };

  return (
    <div 
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/50 hover:shadow-xl transition-shadow duration-150 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {campaignLogo ? (
            <img
              src={formatIpfsUrl(campaignLogo)}
              alt={`${campaign.name} logo`}
              className="w-12 h-12 rounded-xl object-cover shadow-md"
              onError={(e) => {
                console.warn(`Failed to load logo for campaign ${campaign.name}:`, campaignLogo);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div 
              className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md"
            >
              <Trophy className="h-5 w-5" />
            </div>
          )}
          <div>
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-600 transition-colors duration-150 mb-1">
              {campaign.name}
            </h3>
            <div 
              className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        </div>
        <div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors duration-150" />
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">{campaign.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Funds</span>
          <span className="font-semibold text-green-600">{formatEther(BigInt(campaign.totalFunds))} CELO</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Max Winners</span>
          <span className="font-semibold text-purple-600">{campaign.maxWinners.toString()}</span>
        </div>
      </div>
      
      <button
        onClick={onClick}
        className="w-full px-4 py-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors duration-150 text-sm font-semibold"
      >
        View Campaign
      </button>
    </div>
  );
};



  



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
        window.alert(responseData.reason || 'Failed to save GoodDollar verification. Please try again.');
      }
    } catch (err) {
      console.error('Error during GoodDollar verification save:', err);
      setVerificationError(err instanceof Error ? err.message : 'Failed to save GoodDollar verification. Please try again.');
      setVerificationStatus('error');
      setShowSuccessModal(true);
      window.alert(err instanceof Error ? err.message : 'Failed to save GoodDollar verification. Please try again.');
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
        window.alert('Wallet client not available. Please connect your wallet.');
        return;
      }
      const link = await getGoodLink({
        address,
        walletClient,
        popupMode: true,
        callbackUrl: window.location.href,
        chainId: undefined
      });
      setGoodDollarLink(link);
    } catch (e) {
      setGoodDollarLink(null);
      window.alert('Failed to generate GoodDollar verification link.');
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
          
          // Set default values on error
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto p-6 bg-white rounded-lg shadow-sm">
          <Wallet className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-4 text-sm">Please connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  if (projectsLoading || campaignsLoading || votesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Get theme colors based on nationality
  const getThemeColors = () => {
    if (verificationDetails?.self?.isVerified && verificationDetails.self.nationality) {
      const countryCode = verificationDetails.self.nationality.length === 3 
        ? verificationDetails.self.nationality.substring(0, 2).toUpperCase()
        : verificationDetails.self.nationality.toUpperCase();
      
      const flagData = getFlagColorData(countryCode);
      if (flagData) {
        const baseColor = flagData.borderColor.replace('border-', '').replace('-300', '');
        return {
          from: `${baseColor}-50`,
          via: 'white',
          to: `${baseColor}-50`,
          accent: `${baseColor}-100`
        };
      }
    }
    return {
      from: 'indigo-50',
      via: 'white', 
      to: 'purple-50',
      accent: 'indigo-100'
    };
  };

  const themeColors = getThemeColors();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-${themeColors.from} via-${themeColors.via} to-${themeColors.to}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-${themeColors.accent.replace('-100', '-200')}/50 p-6 mb-8`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {address?.slice(2, 4).toUpperCase()}
                </div>
                {/* Badges Row - Show as smaller stacked cards */}
                <div className="flex flex-col gap-3 mt-4 w-48">
                  {/* GoodDollar Badge Card */}
                  <div className={`flex flex-col items-center p-2 rounded-xl border shadow transition-all ${verificationDetails?.gooddollar?.isVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <img src="/images/good.png" alt="GoodDollar" className={`h-5 w-5 mb-1 ${verificationDetails?.gooddollar?.isVerified ? '' : 'opacity-50'}`} />
                    <span className="text-base font-bold mb-0.5">GoodDollar</span>
                    {verificationDetails?.gooddollar?.isVerified ? (
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-semibold text-xs">Verified</span>
                      </div>
                    ) : (
                      <button
                        className="mt-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors duration-150"
                        onClick={handleGoodDollarVerifyClick}
                      >
                        Verify with GoodDollar
                      </button>
                    )}
                    {/* Show expiry if available */}
                    {verificationDetails?.gooddollar?.isVerified && verificationDetails.gooddollar.expiry?.expiryDate && (() => {
                      try {
                        return (
                          <span className="mt-1 text-[10px] text-gray-500">
                            exp. {new Date(verificationDetails.gooddollar.expiry.expiryDate).toLocaleDateString()}
                          </span>
                        );
                      } catch (error) {
                        console.error('Error parsing expiry date:', error);
                        return null;
                      }
                    })()}
                  </div>
                  {/* Self Badge Card */}
                  <div className={`flex flex-col items-center p-2 rounded-xl border shadow transition-all ${verificationDetails?.self?.isVerified ? `${themeColors.accent} border-${themeColors.accent.replace('-100', '-200')}` : 'bg-gray-50 border-gray-200'}`}>
                    <Shield className={`h-5 w-5 mb-1 ${verificationDetails?.self?.isVerified ? `text-${themeColors.accent.replace('-100', '-600')}` : 'text-gray-400'}`} />
                    <span className="text-base font-bold mb-0.5">Self Protocol</span>
                    {verificationLoading ? (
                      <div className="flex items-center gap-1 mb-1">
                        <Loader2 className={`h-4 w-4 text-${themeColors.accent.replace('-100', '-600')} animate-spin`} />
                        <span className={`text-${themeColors.accent.replace('-100', '-700')} font-semibold text-xs`}>Loading...</span>
                      </div>
                    ) : verificationDetails?.self?.isVerified ? (
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className={`h-4 w-4 text-${themeColors.accent.replace('-100', '-600')}`} />
                        <span className={`text-${themeColors.accent.replace('-100', '-700')} font-semibold text-xs`}>Verified</span>
                      </div>
                    ) : (
                      <button
                        className={`mt-1 px-3 py-1 bg-${themeColors.accent.replace('-100', '-600')} text-white rounded-lg text-xs font-semibold hover:bg-${themeColors.accent.replace('-100', '-700')} transition-colors duration-150`}
                        onClick={() => { setShowVerification(true); setShowMethodSelection(false); }}
                      >
                        Verify with Self Protocol
                      </button>
                    )}
                    {/* Show nationality if available */}
                    {verificationDetails?.self?.isVerified && verificationDetails.self.nationality && (
                      <span className="mt-1 text-[10px] text-gray-500">{verificationDetails.self.nationality}</span>
                    )}
                    {/* Show verification timestamp if available */}
                    {verificationDetails?.self?.isVerified && verificationDetails.self.timestamp && (() => {
                      try {
                        return (
                          <span className="mt-1 text-[10px] text-gray-500">
                            {new Date(verificationDetails.self.timestamp).toLocaleDateString()}
                          </span>
                        );
                      } catch (error) {
                        console.error('Error parsing timestamp:', error);
                        return null;
                      }
                    })()}
                  </div>
                </div>
                {/* End Badges Row */}
                {isVerified && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Profile</h1>
                  {/* Nationality Flag */}
                  {verificationDetails?.self?.isVerified && verificationDetails.self.nationality && (() => {
                    // Convert 3-letter country code to 2-letter if needed
                    const countryCode = verificationDetails.self.nationality.length === 3 
                      ? verificationDetails.self.nationality.substring(0, 2).toUpperCase()
                      : verificationDetails.self.nationality.toUpperCase();
                    
                    const flagData = getFlagColorData(countryCode);
                    const flagBorderColor = flagData?.borderColor || 'border-blue-200';
                    const flagBgColor = flagBorderColor.replace('border-', 'bg-').replace('-300', '-50');
                    
                    return (
                      <div className={`flex items-center gap-2 px-3 py-2 ${flagBgColor} rounded-full border ${flagBorderColor} shadow-sm`}>
                        <CountryFlag 
                          countryCode={countryCode} 
                          svg 
                          style={{ width: '1.2em', height: '1.2em', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} 
                          title={`Nationality: ${verificationDetails.self.nationality}`}
                        />
                        <span className="text-sm font-semibold text-gray-800">
                          {verificationDetails.self.nationality}
                        </span>
                      </div>
                    );
                  })()}
                  {isVerified ? (
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded-full">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">
                        Verified by {verificationProviders.length > 1 ? 'Multiple Providers' : verificationProviders[0] || 'Self Protocol'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMethodSelection(true)}
                      className="flex items-center gap-1 px-2 py-1 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors duration-150"
                    >
                      <Shield className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-700">Verify</span>
                    </button>
                  )}
                </div>
                <p className="text-gray-600 text-sm font-mono bg-gray-50/50 px-2 py-1 rounded-lg">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            </div>
            
            <div className="flex-1 lg:ml-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FileCode} label="Projects" value={userMetrics.projects} color="blue" />
                <StatCard icon={Trophy} label="Campaigns" value={userMetrics.campaigns} color="purple" />
                <StatCard icon={Vote} label="Votes" value={userMetrics.votes} color="green" />
                <StatCard icon={Coins} label="Balance" value={`${userMetrics.balance} CELO`} color="amber" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div 
          className="flex flex-wrap gap-2 mb-8"
        >
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'projects', label: 'Projects', icon: FileCode, count: userMetrics.projects },
            { id: 'campaigns', label: 'Campaigns', icon: Trophy, count: userMetrics.campaigns },
            { id: 'votes', label: 'Votes', icon: Vote, count: userMetrics.votes },
            { id: 'identity', label: 'Identity', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm relative ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span 
                  className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Enhanced Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div 
            className="space-y-8"
          >
            {/* Quick Actions */}
            <div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200/50"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'New Project',
                    subtitle: 'Start building',
                    icon: Plus,
                    color: 'from-blue-500 to-indigo-600',
                    bgColor: 'from-blue-50 to-indigo-50',
                    hoverColor: 'hover:from-blue-100 hover:to-indigo-100',
                    action: () => navigate('/app/project/start')
                  },
                  {
                    title: 'New Campaign',
                    subtitle: 'Launch funding',
                    icon: Trophy,
                    color: 'from-purple-500 to-indigo-600',
                    bgColor: 'from-purple-50 to-indigo-50',
                    hoverColor: 'hover:from-purple-100 hover:to-indigo-100',
                    action: () => navigate('/app/campaign/start')
                  },
                  {
                    title: 'Explore',
                    subtitle: 'Discover projects',
                    icon: Compass,
                    color: 'from-green-500 to-teal-600',
                    bgColor: 'from-green-50 to-teal-50',
                    hoverColor: 'hover:from-green-100 hover:to-teal-100',
                    action: () => navigate('/explore')
                  }
                ].map((action) => (
                  <button
                    key={action.title}
                    onClick={action.action}
                    className={`flex items-center gap-3 p-4 bg-gradient-to-br ${action.bgColor} rounded-xl ${action.hoverColor} transition-all group shadow-sm hover:shadow-md`}
                  >
                    <div 
                      className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center text-white shadow-md`}
                    >
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <p className="text-xs text-gray-600">{action.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Stats Grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <StatCard 
                icon={TrendingUp} 
                label="Total Value" 
                value={`${userMetrics.totalVoteValue} CELO`} 
                color="green"
              />
              <StatCard 
                icon={Star} 
                label="Avg. Vote" 
                value={`${userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO`} 
                color="yellow"
              />
              <StatCard 
                icon={Users} 
                label="Active Projects" 
                value={userProjects.filter(p => p.active).length}
                color="purple"
              />
              <StatCard 
                icon={Zap} 
                label="Active Campaigns" 
                value={userCampaigns.filter(c => c.active).length}
                color="blue"
              />
            </div>

            {/* Visual Analytics Section */}
            <div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200/50"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Analytics Overview</h2>
              
              {/* Progress Bars */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Project Completion</span>
                    <span className="font-semibold text-blue-600">
                      {userProjects.filter(p => p.active).length}/{userProjects.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                                             className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-200"
                      style={{ width: `${userProjects.length > 0 ? (userProjects.filter(p => p.active).length / userProjects.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Campaign Success Rate</span>
                    <span className="font-semibold text-purple-600">
                      {userCampaigns.filter(c => c.active).length}/{userCampaigns.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                                             className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-200"
                      style={{ width: `${userCampaigns.length > 0 ? (userCampaigns.filter(c => c.active).length / userCampaigns.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Voting Activity</span>
                    <span className="font-semibold text-green-600">{userMetrics.votes} votes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                                             className="bg-gradient-to-r from-green-500 to-teal-600 h-3 rounded-full transition-all duration-200"
                      style={{ width: `${Math.min(userMetrics.votes * 10, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Visual Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Value</p>
                      <p className="text-xl font-bold text-blue-900">{userMetrics.totalVoteValue} CELO</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div 
                  className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Avg. Vote</p>
                      <p className="text-xl font-bold text-purple-900">
                        {userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200/50"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {voteHistory.slice(0, 3).map((vote, index) => {
                  const project = allProjects?.find(p => p.project.id === vote.projectId);
                  // const campaign = allCampaigns?.find(c => c.campaign.id === vote.campaignId);
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">
                          Voted {formatEther(BigInt(vote.amount))} {vote.token === CELO_TOKEN ? 'CELO' : 'cUSD'} on{' '}
                          <span className="font-medium">{project?.project.name || `Project #${vote.projectId}`}</span>
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
                {voteHistory.length === 0 && (
                  <div
                    className="text-center py-4 text-gray-500 text-sm"
                  >
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Projects</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredProjects.map((project) => (
                <div
                  key={project.id.toString()}
                >
                  <ProjectCard
                    project={project}
                    onClick={() => navigate(`/explorer/project/${project.id}`)}
                  />
                </div>
              ))}
              
              {filteredProjects.length === 0 && (
                <div 
                  className="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200"
                >
                  <FileCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    {filter === 'all' 
                      ? "You haven't created any projects yet." 
                      : `No ${filter} projects found.`
                    }
                  </p>
                  <button
                    onClick={() => navigate('/app/project/start')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-sm font-medium"
                  >
                    Create Project
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div 
            className="space-y-4"
          >
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {userCampaigns.map((campaign) => (
                <div
                  key={campaign.id.toString()}
                >
                  <CampaignCard
                    campaign={campaign}
                    onClick={() => navigate(`/explorer/campaign/${campaign.id}`)}
                  />
                </div>
              ))}
              
              {userCampaigns.length === 0 && (
                <div 
                  className="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200"
                >
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaigns Found</h3>
                  <p className="text-gray-600 mb-4 text-sm">You haven't created any campaigns yet.</p>
                  <button
                    onClick={() => navigate('/app/campaign/start')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-150 text-sm font-medium"
                  >
                    Launch Campaign
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Voting Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Vote className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 text-sm">Total Votes</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{userMetrics.votes}</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-sm">Total Value</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{userMetrics.totalVoteValue} CELO</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900 text-sm">Avg. Vote</span>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    {userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO
                  </p>
                </div>
              </div>
            </div>

            {/* Votes Table */}
            {voteHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CELO Equivalent
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {voteHistory.map((vote, index) => {
                        // Find project and campaign details
                        const project = allProjects?.find(p => p.project.id === vote.projectId);
                        const campaign = allCampaigns?.find(c => c.campaign.id === vote.campaignId);
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">
                                  {project?.project.name?.charAt(0) || 'P'}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {project?.project.name || `Project #${vote.projectId}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {vote.projectId.toString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white mr-3">
                                  <Trophy className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {campaign?.campaign.name || `Campaign #${vote.campaignId}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {vote.campaignId.toString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-green-600">
                                {formatEther(BigInt(vote.amount))} {vote.token === CELO_TOKEN ? 'CELO' : 'cUSD'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {formatEther(BigInt(vote.celoEquivalent))} CELO
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => navigate(`/explorer/project/${vote.projectId}`)}
                                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-150 text-xs font-medium"
                                >
                                  View Project
                                </button>
                                <button
                                  onClick={() => navigate(`/explorer/campaign/${vote.campaignId}`)}
                                  className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors duration-150 text-xs font-medium"
                                >
                                  View Campaign
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {voteHistory.length === 0 && (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <Vote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Votes Cast Yet</h3>
                <p className="text-gray-600 mb-4 text-sm">Start participating by voting on projects you believe in.</p>
                <button
                  onClick={() => navigate('/explore')}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-150 text-sm font-medium"
                >
                  Explore Projects
                </button>
              </div>
            )}
          </div>
        )}

     {/* Identity Tab */}
     {activeTab === 'identity' && (
       <div className="space-y-6">
                    {/* Identity Status */}
           <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                   isVerified ? 'bg-green-50' : 'bg-yellow-50'
                 }`}>
                   <Shield className={`h-6 w-6 ${
                     isVerified ? 'text-green-600' : 'text-yellow-600'
                   }`} />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-gray-900">
                     Identity Verification
                   </h2>
                   <p className="text-sm text-gray-600">
                     {isVerified ? 'Your identity has been verified' : 'Verify your identity for enhanced security'}
                   </p>
                 </div>
               </div>
               {isVerified && (
                 <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                   <CheckCircle className="h-4 w-4 text-green-600" />
                   <span className="text-sm font-medium text-green-700">
                     Verified ({verificationProviders.join(', ')})
                   </span>
                 </div>
               )}
             </div>

             {/* Verification Progress Circle */}
             <div className="flex items-center justify-center mb-6">
               <div className="relative">
                 <svg className="w-24 h-24 transform -rotate-90">
                   <circle
                     cx="48"
                     cy="48"
                     r="36"
                     stroke="currentColor"
                     strokeWidth="8"
                     fill="transparent"
                     className="text-gray-200"
                   />
                   <circle
                     cx="48"
                     cy="48"
                     r="36"
                     stroke="currentColor"
                     strokeWidth="8"
                     fill="transparent"
                     className="text-green-500"
                     strokeLinecap="round"
                     style={{ 
                       strokeDasharray: `${isVerified ? 226 : 113} 226`,
                       transition: 'stroke-dasharray 0.3s ease-in-out'
                     }}
                   />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-gray-900">
                       {isVerified ? '100%' : '50%'}
                     </div>
                     <div className="text-xs text-gray-500">Verified</div>
                   </div>
                 </div>
               </div>
             </div>

           {!isVerified && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
               <div className="flex items-start gap-3">
                 <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                 <div>
                   <h3 className="font-semibold text-amber-800 mb-1">
                     V3 Preview: Anti-Sybil Future
                   </h3>
                   <p className="text-sm text-amber-700 mb-3">
                     With the upcoming V3 release, identity verification through Self Protocol will help prevent Sybil attacks and ensure fair participation in campaigns and voting.
                   </p>
                   <ul className="text-sm text-amber-700 space-y-1">
                     <li>• Enhanced voting integrity</li>
                     <li>• Reduced spam and fake accounts</li>
                     <li>• Increased trust in project funding</li>
                     <li>• Better reputation system</li>
                   </ul>
                 </div>
               </div>
             </div>
           )}

           {/* Verification Actions */}
           <div className="space-y-4">
             {!isVerified ? (
               <button
                 onClick={() => setShowMethodSelection(true)}
                 className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 font-medium"
               >
                 <UserCheck className="h-5 w-5" />
                 Start Identity Verification
               </button>
             ) : (
               <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                 <div className="flex items-center gap-3">
                   <CheckCircle className="h-6 w-6 text-green-600" />
                   <div>
                     <h3 className="font-semibold text-green-800">Identity Verified</h3>
                     <p className="text-sm text-green-700">
                       Your account is verified and ready for V3 features
                     </p>
                     {verificationProviders.length > 0 && (
                       <div className="mt-2">
                         <p className="text-xs text-green-600 font-medium">Verification Methods:</p>
                         <div className="flex flex-wrap gap-1 mt-1">
                           {verificationProviders.map((provider, index) => (
                             <span 
                               key={index}
                               className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                             >
                               {provider === 'self' ? 'Self Protocol' : 
                                provider === 'gooddollar' ? 'GoodDollar' : provider}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}
           </div>

           {/* Benefits */}
           <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-blue-50 rounded-lg">
               <h4 className="font-semibold text-blue-800 mb-2">Enhanced Security</h4>
               <p className="text-sm text-blue-700">
                 Protect your account and participate in verified-only campaigns
               </p>
             </div>
             <div className="p-4 bg-purple-50 rounded-lg">
               <h4 className="font-semibold text-purple-800 mb-2">Reputation Building</h4>
               <p className="text-sm text-purple-700">
                 Build trust within the community with verified identity
               </p>
             </div>
           </div>

           {/* Debug Section (only in development) */}
           {true && (
             <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
               <h4 className="font-semibold text-yellow-800 mb-2">Debug Tools</h4>
               <p className="text-sm text-yellow-700 mb-3">
                 Development tools to help debug verification issues
               </p>
               <div className="space-y-2">
                 <button
                   onClick={() => debugApiCall()}
                   className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors duration-150"
                 >
                   Test API Call
                 </button>
                 <button
                   onClick={() => refreshVerificationData()}
                   className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-150"
                 >
                   Refresh Data
                 </button>
                 <button
                   onClick={() => {
                     console.log('Current verification state:', {
                       isVerified,
                       verificationProviders,
                       verificationDetails,
                       verificationLoading
                     });
                   }}
                   className="ml-2 px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors duration-150"
                 >
                   Log State
                 </button>
               </div>
             </div>
           )}
         </div>
       </div>
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
     <GoodDollarVerifyModal 
       isOpen={showGoodDollarVerification}
       onClose={() => setShowGoodDollarVerification(false)}
       onVerificationComplete={handleGoodDollarVerificationComplete}
     />

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
);
}