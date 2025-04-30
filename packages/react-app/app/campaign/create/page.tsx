'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CalendarRange, ChevronDown, Clock, Coins, Settings, Users, Waves, Check, X, HelpCircle, Image as ImageIcon, Video, Link, Hash, AlertCircle, Shield, Upload } from 'lucide-react';
import { useSovereignSeas, CAMPAIGN_CREATION_FEE, PROJECT_CREATION_FEE } from '../../../hooks/useSovereignSeas';
import { uploadToIPFS } from '@/app/utils/imageUtils';

export default function CreateCampaign() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [demoVideo, setDemoVideo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminFee, setAdminFee] = useState(5);
  const [voteMultiplier, setVoteMultiplier] = useState(1);
  const [maxWinners, setMaxWinners] = useState(0);
  const [customWinners, setCustomWinners] = useState('');
  const [useCustomWinners, setUseCustomWinners] = useState(false);
  const [useQuadratic, setUseQuadratic] = useState(true);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    adminFee: '',
    demoVideo: '',
    customWinners: ''
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
  } = useSovereignSeas();
  
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
      demoVideo: '',
      customWinners: ''
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
    
    // Demo video validation (optional field, but validate URL format if provided)
    if (demoVideo && !isValidUrl(demoVideo)) {
      newErrors.demoVideo = 'Please enter a valid URL for the demo video';
      valid = false;
    }
    
    // Validate custom winners if that option is selected
    if (useCustomWinners) {
      const winnersNum = parseInt(customWinners);
      if (isNaN(winnersNum) || winnersNum <= 0) {
        newErrors.customWinners = 'Please enter a valid number greater than 0';
        valid = false;
      }
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
    
    try {
      // Handle logo upload if a file was selected
      let logoUrl = logo;
      if (logoFileInputRef.current?.files?.[0]) {
        setIsUploadingLogo(true);
        const logoFile = logoFileInputRef.current.files[0];
        try {
          // Use your existing uploadToIPFS function to upload the logo
          logoUrl = await uploadToIPFS(logoFile);
        } catch (error) {
          console.error('Error uploading logo:', error);
          setIsUploadingLogo(false);
          return;
        }
        setIsUploadingLogo(false);
      }
      
      // Convert dates to unix timestamps
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      // Determine max winners value
      const finalMaxWinners = useCustomWinners ? parseInt(customWinners) : maxWinners;
      
      // Call createCampaign with the updated logoUrl
      await createCampaign(
        name,
        description,
        logoUrl,
        demoVideo,
        startTimestamp,
        endTimestamp,
        adminFee,
        voteMultiplier,
        finalMaxWinners,
        useQuadratic
      );
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800 relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-2/3 right-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-sky-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Hash className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Create New Campaign</h1>
          </div>
          
          {/* Fee Notice */}
          <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm relative group hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl opacity-0 group-hover:opacity-5 blur-sm transition-all duration-500"></div>
            <div className="relative z-10 flex items-start">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 flex items-center">
                  Creation Fee Required
                  <button 
                    type="button" 
                    onClick={() => setShowFeeTooltip(!showFeeTooltip)}
                    className="text-amber-400 hover:text-amber-600 ml-2 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </h3>
                <p className="text-amber-700 mt-1">
                  A fee of <span className="font-semibold">{CAMPAIGN_CREATION_FEE} CELO</span> will be charged to create this campaign.
                </p>
                <p className="text-amber-600 text-sm mt-2">
                  This fee helps prevent spam and abuse. Projects will also require a {PROJECT_CREATION_FEE} CELO submission fee.
                </p>
                
                {showFeeTooltip && (
                  <div className="absolute right-4 top-4 w-64 p-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg z-10 text-sm border border-amber-100">
                    <p className="text-amber-700">
                      These fees are collected to prevent spam and maintain platform quality. Fees are managed by platform superadmins and support ongoing development.
                    </p>
                    <button 
                      type="button" 
                      className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowFeeTooltip(false)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-blue-500" />
                    Campaign Details
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-blue-600 mb-2">Campaign Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                        placeholder="Enter campaign name"
                      />
                      {formErrors.name && <p className="mt-1 text-red-500 text-sm">{formErrors.name}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-blue-600 mb-2">Campaign Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 transition-all duration-300"
                        placeholder="Describe your campaign"
                      />
                      {formErrors.description && <p className="mt-1 text-red-500 text-sm">{formErrors.description}</p>}
                    </div>
                    
                    {/* Logo field with file upload */}
                    <div>
                      <label className="block text-blue-600 mb-2 flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Logo URL or Upload
                      </label>
                      
                      <input
                        type="file"
                        ref={logoFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            // Just show a placeholder when file is selected
                            setLogo(`File selected: ${e.target.files[0].name}`);
                          }
                        }}
                        className="hidden" // Hide the native file input
                      />
                      
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-blue-400/30 relative overflow-hidden group"
                          disabled={isUploadingLogo}
                        >
                          {isUploadingLogo ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Uploading...
                            </div>
                          ) : (
                            <div className="flex items-center relative z-10">
                              <Upload className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                              Upload Logo
                            </div>
                          )}
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </button>
                        <span className="text-gray-500">or</span>
                      </div>
                      
                      <input
                        type="text"
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                        placeholder="Enter logo URL or IPFS hash"
                      />
                      <p className="mt-1 text-gray-500 text-sm">
                        Provide a campaign logo image for better visibility
                      </p>
                    </div>
                    
                    {/* Demo video field */}
                    <div>
                      <label className="block text-blue-600 mb-2 flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        Demo Video URL (optional)
                      </label>
                      <input
                        type="url"
                        value={demoVideo}
                        onChange={(e) => setDemoVideo(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                        placeholder="Enter demo video URL or IPFS hash"
                      />
                      <p className="mt-1 text-gray-500 text-sm">
                        Add a demonstration video to showcase your campaign's purpose
                      </p>
                      {formErrors.demoVideo && <p className="mt-1 text-red-500 text-sm">{formErrors.demoVideo}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                    <CalendarRange className="h-5 w-5 mr-2 text-blue-500" />
                    Campaign Timeline
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-blue-600 mb-2">Start Date</label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                      />
                      {formErrors.startDate && <p className="mt-1 text-red-500 text-sm">{formErrors.startDate}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-blue-600 mb-2">End Date</label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                      />
                      {formErrors.endDate && <p className="mt-1 text-red-500 text-sm">{formErrors.endDate}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Voting Settings */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                    <Coins className="h-5 w-5 mr-2 text-blue-500" />
                    Voting & Distribution Settings
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-blue-600 mb-2">Admin Fee Percentage (%)</label>
                      <input
                        type="number"
                        value={adminFee}
                        onChange={(e) => setAdminFee(parseInt(e.target.value))}
                        min="0"
                        max="30"
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                      />
                      <p className="mt-1 text-gray-500 text-sm">
                        This is your fee as the campaign admin (max 30%). The platform also takes a 15% fee.
                      </p>
                      {formErrors.adminFee && <p className="mt-1 text-red-500 text-sm">{formErrors.adminFee}</p>}
                    </div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-blue-600">Vote Multiplier</label>
                        <button 
                          type="button" 
                          onClick={() => setShowVoteTooltip(!showVoteTooltip)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {showVoteTooltip && (
                        <div className="absolute right-0 w-64 p-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg z-10 text-sm border border-blue-100">
                          This determines how many votes each CELO token is worth. Higher multipliers make each token more impactful.
                          <button 
                            type="button" 
                            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                            className={`flex-1 py-2 rounded-full ${
                              voteMultiplier === value 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 transition-colors'
                            }`}
                          >
                            {value}x
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-gray-500 text-sm">
                        Each CELO will be worth {voteMultiplier} vote{voteMultiplier !== 1 ? 's' : ''}.
                      </p>
                    </div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-blue-600">Distribution Method</label>
                        <button 
                          type="button" 
                          onClick={() => setShowDistributionTooltip(!showDistributionTooltip)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {showDistributionTooltip && (
                        <div className="absolute right-0 w-64 p-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg z-10 text-sm border border-blue-100">
                          Quadratic distribution makes funding more equitable by using the square root of votes to determine shares. Linear distribution is directly proportional to votes.
                          <button 
                            type="button" 
                            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                          className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center ${
                            useQuadratic 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm' 
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 transition-colors'
                          }`}
                        >
                          {useQuadratic && <Check className="h-4 w-4 mr-2" />}
                          Quadratic
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setUseQuadratic(false)}
                          className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center ${
                            !useQuadratic 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm' 
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 transition-colors'
                          }`}
                        >
                          {!useQuadratic && <Check className="h-4 w-4 mr-2" />}
                          Linear
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-blue-600">Max Winners</label>
                        <button 
                          type="button" 
                          onClick={() => setShowWinnersTooltip(!showWinnersTooltip)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {showWinnersTooltip && (
                        <div className="absolute right-0 w-64 p-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg z-10 text-sm border border-blue-100">
                          Set the maximum number of projects that can receive funding. Set to 0 for unlimited winners.
                          <button 
                            type="button" 
                            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={() => setShowWinnersTooltip(false)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      
                      <div className="relative mb-2">
                        <select
                          value={useCustomWinners ? 'custom' : maxWinners.toString()}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setUseCustomWinners(true);
                            } else {
                              setUseCustomWinners(false);
                              setMaxWinners(parseInt(e.target.value));
                            }
                          }}
                          className="w-full pl-4 pr-10 py-2.5 appearance-none rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                        >
                          <option value="0">All projects (unlimited)</option>
                          {[1, 2, 3, 4, 5, 10].map((value) => (
                            <option key={value} value={value.toString()}>
                              Top {value} project{value !== 1 ? 's' : ''}
                            </option>
                          ))}
                          <option value="custom">Custom number</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                      
                      {useCustomWinners && (
                        <div>
                          <input
                            type="number"
                            value={customWinners}
                            onChange={(e) => setCustomWinners(e.target.value)}
                            min="1"
                            placeholder="Enter number of winners"
                            className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                          />
                          {formErrors.customWinners && <p className="mt-1 text-red-500 text-sm">{formErrors.customWinners}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Submit Section */}
                <div className="mt-10">
                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      type="submit"
                      disabled={isWritePending || isWaitingForTx || !isConnected}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed border border-blue-400/30 relative overflow-hidden group"
                    >
                      {isWritePending || isWaitingForTx ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                          {isWritePending ? 'Preparing...' : 'Processing...'}
                        </div>
                      ) : (
                        <span className="relative z-10">Create Campaign</span>
                      )}
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="flex-1 md:flex-initial py-3 px-6 bg-white border border-blue-200 text-blue-600 font-semibold rounded-full hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                    >
                      <span className="relative z-10">Cancel</span>
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  </div>
                  
                  {!isConnected && (
                    <p className="mt-3 text-amber-600 text-center">
                      Please connect your wallet to create a campaign
                    </p>
                  )}
                  
                
                  <p className="mt-4 text-center text-gray-500 text-sm">
                    By creating a campaign, you agree to pay the {CAMPAIGN_CREATION_FEE} CELO creation fee
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}