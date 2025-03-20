'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Waves, 
  Github,
  Globe,
  FileText,
  Calendar,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';

const CONTRACT_ADDRESS = '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

export default function SubmitProject() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [testingLink, setTestingLink] = useState('');
  
  // Campaign data
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form validation
  const [formErrors, setFormErrors] = useState({
    projectName: '',
    description: '',
  });
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    submitProject,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    txReceipt,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (isInitialized && campaignId) {
      loadCampaignData();
    }
  }, [isInitialized, campaignId]);
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // Redirect or reset form on successful submission
  useEffect(() => {
    if (isTxSuccess) {
      setSuccessMessage('Project submitted successfully! Redirecting to campaign dashboard...');
      resetForm();
      
      // Redirect after a delay
      const timer = setTimeout(() => {
        router.push(`/campaign/${campaignId}/dashboard`);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isTxSuccess, campaignId, router]);
  
  const loadCampaignData = async () => {
    setLoading(true);
    try {
      // Load all campaigns
      const allCampaigns = await loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
        } else {
          setErrorMessage('Campaign not found');
        }
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      setErrorMessage('Error loading campaign data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = () => {
    let isValid = true;
    const errors = {
      projectName: '',
      description: '',
    };
    
    if (!projectName.trim()) {
      errors.projectName = 'Project name is required';
      isValid = false;
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    } else if (description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters long';
      isValid = false;
    }
    
    // Validate URLs if provided
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    
    if (githubLink && !urlRegex.test(githubLink)) {
      setErrorMessage('Please enter a valid GitHub URL');
      isValid = false;
    }
    
    if (socialLink && !urlRegex.test(socialLink)) {
      setErrorMessage('Please enter a valid social media URL');
      isValid = false;
    }
    
    if (testingLink && !urlRegex.test(testingLink)) {
      setErrorMessage('Please enter a valid testing/demo URL');
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!isConnected) {
      setErrorMessage('Please connect your wallet to submit a project');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await submitProject(
        campaignId,
        projectName,
        description,
        githubLink,
        socialLink,
        testingLink
      );
    } catch (error) {
      console.error('Error submitting project:', error);
      setErrorMessage('Error submitting project. Please try again later.');
    }
  };
  
  const resetForm = () => {
    setProjectName('');
    setDescription('');
    setGithubLink('');
    setSocialLink('');
    setTestingLink('');
    setFormErrors({
      projectName: '',
      description: '',
    });
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-lime-500 animate-spin mb-4" />
          <p className="text-lg text-lime-300">Loading campaign data...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6">
          <XCircle className="h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold mb-3">Campaign Not Found</h1>
          <p className="text-slate-300 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors"
          >
            View All Campaigns
          </button>
        </div>
      </div>
    );
  }
  
  const isActive = isCampaignActive(campaign);
  const timeRemaining = getCampaignTimeRemaining(campaign);
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  // Check if campaign is still accepting submissions (even if not yet started)
  const canSubmit = !hasEnded && campaign.active;
  
  if (hasEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
              className="inline-flex items-center text-slate-300 hover:text-white mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20 text-center">
              <Info className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-3">Campaign Has Ended</h1>
              <p className="text-slate-300 mb-6">
                This campaign has ended and is no longer accepting project submissions.
              </p>
              <button
                onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors"
              >
                View Campaign Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-slate-300 hover:text-white mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center">
              <Waves className="h-8 w-8 text-lime-500 mr-3" />
              Submit Project to Campaign
            </h1>
            <p className="text-slate-300 mt-2">{campaign.name}</p>
          </div>
          
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20 mb-6">
                          <div className="flex items-center justify-between mb-6">
              {hasStarted ? (
                <div className="flex items-center text-yellow-400">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="font-medium">Time Remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m</span>
                </div>
              ) : (
                <div className="flex items-center text-lime-400">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span className="font-medium">Starts: {formatCampaignTime(campaign.startTime)}</span>
                </div>
              )}
              <div className="flex items-center text-slate-300">
                <Calendar className="h-4 w-4 mr-2" />
                Ends: {formatCampaignTime(campaign.endTime)}
              </div>
            </div>
            
            {!hasStarted && (
              <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4 mb-6 flex items-start">
                <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300">
                  This campaign hasn't started yet, but you can submit your project early! Your project will need approval from the campaign admin before it appears in the list of projects.
                </p>
              </div>
            )}
            
            {/* Success message */}
            {successMessage && (
              <div className="bg-green-900/30 border border-green-500/40 rounded-lg p-4 mb-6 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-green-300">{successMessage}</p>
              </div>
            )}
            
            {/* Error message */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4 mb-6 flex items-start">
                <XCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-300">{errorMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-lime-300 mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="Enter project name"
                  />
                  {formErrors.projectName && (
                    <p className="mt-1 text-red-400 text-sm">{formErrors.projectName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-lime-300 mb-2">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="Describe your project in detail. What problem does it solve? How does it relate to ocean conservation?"
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-red-400 text-sm">{formErrors.description}</p>
                  )}
                  <p className="mt-1 text-slate-400 text-sm">Minimum 20 characters</p>
                </div>
                
                <div>
                  <label className="block text-lime-300 mb-2 flex items-center">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub Repository (Optional)
                  </label>
                  <input
                    type="url"
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://github.com/yourusername/yourproject"
                  />
                  <p className="mt-1 text-slate-400 text-sm">Link to your project's GitHub repository</p>
                </div>
                
                <div>
                  <label className="block text-lime-300 mb-2 flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    Social Media Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://twitter.com/yourproject"
                  />
                  <p className="mt-1 text-slate-400 text-sm">Link to your project's social media page</p>
                </div>
                
                <div>
                  <label className="block text-lime-300 mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Demo/Testing Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={testingLink}
                    onChange={(e) => setTestingLink(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://demo.yourproject.com"
                  />
                  <p className="mt-1 text-slate-400 text-sm">Link to a demo or testing version of your project</p>
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4 mt-8 mb-6">
                <p className="text-slate-300 text-sm">
                  Your project will be submitted to campaign: <span className="text-lime-400 font-medium">{campaign.name}</span>. 
                  Once submitted, it will need to be approved by the campaign admin before it appears in the list of projects.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isWritePending || isWaitingForTx || !isConnected}
                  className="flex-1 py-3 px-6 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:bg-slate-500 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {isWritePending || isWaitingForTx ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isWritePending ? 'Preparing Submission...' : 'Submitting...'}
                    </div>
                  ) : (
                    'Submit Project'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                  className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              {!isConnected && (
                <p className="mt-3 text-yellow-400 text-center">
                  Please connect your wallet to submit a project
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}