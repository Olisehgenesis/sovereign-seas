'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CalendarRange, ChevronDown, Clock, Coins, Settings, Users, Waves, Check, X, HelpCircle, Image as ImageIcon, Video, Link, Hash, AlertCircle, Shield } from 'lucide-react';
import { useSovereignSeas, CAMPAIGN_CREATION_FEE, PROJECT_CREATION_FEE } from '../../../hooks/useSovereignSeas';

// Placeholder for the contract addresses - replace with your actual addresses
//get const CONTRACT_ADDRESS AND CELO_TOKEN_ADDRESS  FRON  ,env next.js
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CAMPAIGN_ADDRESS as `0x${string}` | undefined;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_MCELO_ADDRESS as `0x${string}` | undefined;

export default function CreateCampaign() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState(''); // Added logo field
  const [demoVideo, setDemoVideo] = useState(''); // Added demo video field
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminFee, setAdminFee] = useState(5);
  const [voteMultiplier, setVoteMultiplier] = useState(1);
  const [maxWinners, setMaxWinners] = useState(0);
  const [useQuadratic, setUseQuadratic] = useState(true);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    adminFee: '',
    logo: '',
    demoVideo: ''
  });
  
  // Tooltips
  const [showVoteTooltip, setShowVoteTooltip] = useState(false);
  const [showDistributionTooltip, setShowDistributionTooltip] = useState(false);
  const [showWinnersTooltip, setShowWinnersTooltip] = useState(false);
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  
  // Contract interaction
  const {
    isInitialized,
    createCampaign,
    loadCampaigns,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    txReceipt,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS!,
    celoTokenAddress: CELO_TOKEN_ADDRESS!,
  });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Redirect to dashboard on successful transaction
  useEffect(() => {
    if (isTxSuccess && txReceipt) {
      try {
        // Option 1: Check all logs and use a more generic approach
        // Find the latest log that might contain relevant information
        if (txReceipt.logs.length > 0) {
          // For most contracts, the campaign ID would be in the first topic after the event signature
          const lastLog = txReceipt.logs[txReceipt.logs.length - 1];
          if (lastLog.topics.length > 1) {
            const campaignIdHex = lastLog.topics[1];
            const campaignIdDecimal = campaignIdHex ? parseInt(campaignIdHex.slice(2), 16) : NaN;
            
            // Make sure it's a reasonable number before redirecting
            if (!isNaN(campaignIdDecimal) && campaignIdDecimal < 1000000) {
              router.push(`/campaign/${campaignIdDecimal}/dashboard`);
              return;
            }
          }
        }
        
        // Option 2: Fallback - redirect to campaigns list and show a message
        console.warn("Could not extract campaign ID from transaction, going to campaigns list");
        router.push('/campaigns');
        
      } catch (error) {
        console.error("Error extracting campaign ID:", error);
        router.push('/campaigns');
      }
    }
  }, [isTxSuccess, txReceipt, router]);
  if (!isMounted) {
    return null;
  }
  
  // Form validation function
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      adminFee: '',
      logo: '',
      demoVideo: ''
    };
    
    if (!name.trim()) {
      newErrors.name = 'Campaign name is required';
      valid = false;
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
      valid = false;
    }
    
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
      valid = false;
    }
    
    if (!endDate) {
      newErrors.endDate = 'End date is required';
      valid = false;
    } else if (new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = 'End date must be after start date';
      valid = false;
    }
    
    if (adminFee < 0 || adminFee > 30) {
      newErrors.adminFee = 'Admin fee must be between 0% and 30%';
      valid = false;
    }
    
    // Logo validation (optional field, but validate URL format if provided)
    if (logo && !isValidUrl(logo)) {
      newErrors.logo = 'Please enter a valid URL for the logo';
      valid = false;
    }
    
    // Demo video validation (optional field, but validate URL format if provided)
    if (demoVideo && !isValidUrl(demoVideo)) {
      newErrors.demoVideo = 'Please enter a valid URL for the demo video';
      valid = false;
    }
    
    setFormErrors(newErrors);
    return valid;
  };
  
  // Simple URL validation
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  // Submit handler
  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet to create a campaign');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    // Convert dates to unix timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    try {
      await createCampaign(
        name,
        description,
        logo,
        demoVideo,
        startTimestamp,
        endTimestamp,
        adminFee,
        voteMultiplier,
        maxWinners,
        useQuadratic
      );
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <Hash className="h-8 w-8 text-lime-500 mr-3" />
            <h1 className="text-3xl font-bold">Create New Campaign</h1>
          </div>
          
          {/* Fee Notice */}
          <div className="mb-6 bg-amber-900/40 backdrop-blur-sm rounded-lg p-4 border border-amber-500/30 relative">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-400 flex items-center">
                  Creation Fee Required
                  <button 
                    type="button" 
                    onClick={() => setShowFeeTooltip(!showFeeTooltip)}
                    className="text-amber-400/70 hover:text-amber-300 ml-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </h3>
                <p className="text-amber-100/90 mt-1">
                  A fee of <span className="font-semibold">{CAMPAIGN_CREATION_FEE} CELO</span> will be charged to create this campaign.
                </p>
                <p className="text-amber-100/70 text-sm mt-2">
                  This fee helps prevent spam and abuse. Projects will also require a {PROJECT_CREATION_FEE} CELO submission fee.
                </p>
                
                {showFeeTooltip && (
                  <div className="absolute right-4 top-4 w-64 p-3 bg-slate-800 rounded-md shadow-lg z-10 text-sm border border-amber-500/30">
                    <p className="text-amber-100">
                      These fees are collected to prevent spam and maintain platform quality. Fees are managed by platform superadmins and support ongoing development.
                    </p>
                    <button 
                      type="button" 
                      className="absolute top-1 right-1 text-slate-400 hover:text-white"
                      onClick={() => setShowFeeTooltip(false)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20">
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Campaign Details
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-lime-300 mb-2">Campaign Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                      placeholder="Enter campaign name"
                    />
                    {formErrors.name && <p className="mt-1 text-red-400 text-sm">{formErrors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 h-24"
                      placeholder="Describe your campaign"
                    />
                    {formErrors.description && <p className="mt-1 text-red-400 text-sm">{formErrors.description}</p>}
                  </div>
                  
                  {/* Added logo field */}
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Logo URL (optional)
                    </label>
                    <input
                      type="url"
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                      placeholder="Enter logo URL or IPFS hash"
                    />
                    <p className="mt-1 text-slate-400 text-sm">
                      Provide a URL to your campaign logo image for better visibility
                    </p>
                    {formErrors.logo && <p className="mt-1 text-red-400 text-sm">{formErrors.logo}</p>}
                  </div>
                  
                  {/* Added demo video field */}
                  <div>
                    <label className="block text-lime-300 mb-2 flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      Demo Video URL (optional)
                    </label>
                    <input
                      type="url"
                      value={demoVideo}
                      onChange={(e) => setDemoVideo(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                      placeholder="Enter demo video URL or IPFS hash"
                    />
                    <p className="mt-1 text-slate-400 text-sm">
                      Add a demonstration video to showcase your campaign's purpose
                    </p>
                    {formErrors.demoVideo && <p className="mt-1 text-red-400 text-sm">{formErrors.demoVideo}</p>}
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <CalendarRange className="h-5 w-5 mr-2" />
                  Campaign Timeline
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lime-300 mb-2">Start Date</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                    />
                    {formErrors.startDate && <p className="mt-1 text-red-400 text-sm">{formErrors.startDate}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-lime-300 mb-2">End Date</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                    />
                    {formErrors.endDate && <p className="mt-1 text-red-400 text-sm">{formErrors.endDate}</p>}
                  </div>
                </div>
              </div>
              
              {/* Voting Settings */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <Coins className="h-5 w-5 mr-2" />
                  Voting & Distribution Settings
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-lime-300 mb-2">Admin Fee Percentage (%)</label>
                    <input
                      type="number"
                      value={adminFee}
                      onChange={(e) => setAdminFee(parseInt(e.target.value))}
                      min="0"
                      max="30"
                      className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                    />
                    <p className="mt-1 text-slate-400 text-sm">
                      This is your fee as the campaign admin (max 30%). The platform also takes a 15% fee.
                    </p>
                    {formErrors.adminFee && <p className="mt-1 text-red-400 text-sm">{formErrors.adminFee}</p>}
                  </div>
                  
                  <div className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-lime-300">Vote Multiplier</label>
                      <button 
                        type="button" 
                        onClick={() => setShowVoteTooltip(!showVoteTooltip)}
                        className="text-slate-400 hover:text-white"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {showVoteTooltip && (
                      <div className="absolute right-0 w-64 p-3 bg-slate-700 rounded-md shadow-lg z-10 text-sm">
                        This determines how many votes each CELO token is worth. Higher multipliers make each token more impactful.
                        <button 
                          type="button" 
                          className="absolute top-1 right-1 text-slate-400 hover:text-white"
                          onClick={() => setShowVoteTooltip(false)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setVoteMultiplier(value)}
                          className={`flex-1 py-2 rounded-lg ${
                            voteMultiplier === value 
                              ? 'bg-lime-600 text-white' 
                              : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {value}x
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-slate-400 text-sm">
                      Each CELO will be worth {voteMultiplier} vote{voteMultiplier !== 1 ? 's' : ''}.
                    </p>
                  </div>
                  
                  <div className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-lime-300">Distribution Method</label>
                      <button 
                        type="button" 
                        onClick={() => setShowDistributionTooltip(!showDistributionTooltip)}
                        className="text-slate-400 hover:text-white"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {showDistributionTooltip && (
                      <div className="absolute right-0 w-64 p-3 bg-slate-700 rounded-md shadow-lg z-10 text-sm">
                        Quadratic distribution makes funding more equitable by using the square root of votes to determine shares. Linear distribution is directly proportional to votes.
                        <button 
                          type="button" 
                          className="absolute top-1 right-1 text-slate-400 hover:text-white"
                          onClick={() => setShowDistributionTooltip(false)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setUseQuadratic(true)}
                        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center ${
                          useQuadratic 
                            ? 'bg-lime-600 text-white' 
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {useQuadratic && <Check className="h-4 w-4 mr-2" />}
                        Quadratic
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setUseQuadratic(false)}
                        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center ${
                          !useQuadratic 
                            ? 'bg-lime-600 text-white' 
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {!useQuadratic && <Check className="h-4 w-4 mr-2" />}
                        Linear
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-lime-300">Max Winners</label>
                      <button 
                        type="button" 
                        onClick={() => setShowWinnersTooltip(!showWinnersTooltip)}
                        className="text-slate-400 hover:text-white"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {showWinnersTooltip && (
                      <div className="absolute right-0 w-64 p-3 bg-slate-700 rounded-md shadow-lg z-10 text-sm">
                        Set the maximum number of projects that can receive funding. Set to 0 for unlimited winners.
                        <button 
                          type="button" 
                          className="absolute top-1 right-1 text-slate-400 hover:text-white"
                          onClick={() => setShowWinnersTooltip(false)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    
                    <div className="relative">
                      <select
                        value={maxWinners}
                        onChange={(e) => setMaxWinners(parseInt(e.target.value))}
                        className="w-full pl-4 pr-10 py-2 appearance-none rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                      >
                        <option value="0">All projects (unlimited)</option>
                        {[1, 2, 3, 4, 5, 10].map((value) => (
                          <option key={value} value={value}>
                            Top {value} project{value !== 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submit Section */}
              <div className="mt-10">
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isWritePending || isWaitingForTx || !isConnected}
                    className="flex-1 py-3 px-6 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                  >
                    {isWritePending || isWaitingForTx ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900 mr-2"></div>
                        {isWritePending ? 'Preparing...' : 'Processing...'}
                      </div>
                    ) : (
                      'Create Campaign'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 md:flex-initial py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
                {!isConnected && (
                  <p className="mt-3 text-yellow-400 text-center">
                    Please connect your wallet to create a campaign
                  </p>
                )}
                
                <p className="mt-4 text-center text-slate-400 text-sm">
                  By creating a campaign, you agree to pay the {CAMPAIGN_CREATION_FEE} CELO creation fee
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}