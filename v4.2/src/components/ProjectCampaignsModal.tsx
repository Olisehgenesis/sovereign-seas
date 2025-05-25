// components/ProjectCampaignsModal.tsx - Sovereign Seas Themed Version
'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  X, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Crown, 
  Ship, 
  Waves, 
  Trophy, 
  Coins,
  Users,
  Timer,
  Sparkles,
  Anchor
} from 'lucide-react';
import { useProjectCampaigns, useAddProjectToCampaign } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

interface ProjectCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const contractAddress = import.meta.env.VITE_CONTRACT_V4;

const ProjectCampaignsModal = ({ isOpen, onClose, projectId }: ProjectCampaignsModalProps) => {
  const [error, setError] = useState<string | null>(null);

  // Get project's current campaigns
  const { projectCampaigns, isLoading: isLoadingProjectCampaigns, error: hookError } = useProjectCampaigns(
    contractAddress as `0x${string}`,
    BigInt(projectId)
  );

  // Get all campaigns
  const { campaigns: allCampaigns, isLoading: isLoadingCampaigns } = useAllCampaigns(contractAddress as `0x${string}`);
  
  // Get the add to campaign hook
  const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress as `0x${string}`);
 
  useEffect(() => {
    if (hookError) {
      setError('Failed to load campaigns from the sovereign waters');
    }
  }, [hookError]);

  const handleAddToCampaign = async (campaignId: string) => {
    try {
      setError(null);
      
      const campaign = allCampaigns?.find((c) => Number(c.campaign.id) === Number(campaignId));
      
      const feeTokenAddress = campaign?.campaign.payoutToken || 
                             import.meta.env.VITE_CELO_TOKEN_ADDRESS || 
                             contractAddress;
      
      await addProjectToCampaign({
        campaignId: BigInt(campaignId),
        projectId: BigInt(projectId),
        feeToken: feeTokenAddress as `0x${string}`
      });
      
    } catch (err: any) {
      console.error('Error adding project to campaign:', err);
      
      let errorMessage = 'Unknown error in the sovereign waters';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.reason) {
        errorMessage = err.reason;
      }
      
      // Handle common error cases with nautical theme
      if (errorMessage.includes('Fee token not supported')) {
        errorMessage = 'The tribute token is not accepted in these waters.';
      } else if (errorMessage.includes('Campaign has ended')) {
        errorMessage = 'This voyage has already reached its destination.';
      } else if (errorMessage.includes('Project already in campaign')) {
        errorMessage = 'Your ship is already part of this expedition.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient treasure to pay the expedition fee.';
      }
      
      setError(`Failed to join voyage: ${errorMessage}`);
    }
  };

  const getCampaignLogo = (campaign) => {
    try {
      if (campaign.metadata?.mainInfo) {
        const mainInfo = JSON.parse(campaign.metadata.mainInfo);
        if (mainInfo.logo) return mainInfo.logo;
      }
      
      if (campaign.metadata?.additionalInfo) {
        const additionalInfo = JSON.parse(campaign.metadata.additionalInfo);
        if (additionalInfo.logo) return additionalInfo.logo;
      }
    } catch (e) {
      // If JSON parsing fails, return null
    }
    return null;
  };

  const isLoading = isLoadingProjectCampaigns || isLoadingCampaigns;

  // Get available campaigns (campaigns where project is not already participating)
  const availableCampaigns = allCampaigns?.filter(campaignDetails => {
    const campaignId = Number(campaignDetails.campaign.id);
    return !projectCampaigns?.some(pc => Number(pc.id) === campaignId);
  }) || [];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gradient-to-br from-blue-900/50 via-indigo-900/50 to-purple-900/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Animated background waves */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-cyan-400/10 animate-pulse blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-indigo-400/10 to-blue-400/10 animate-pulse blur-3xl"></div>
        </div>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 -translate-y-10"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 -translate-y-10"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl p-6 text-left align-middle shadow-2xl transition-all border border-blue-200/50 relative">
                {/* Decorative top border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"></div>
                
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300 p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2 flex items-center"
                  >
                    <Crown className="h-6 w-6 text-blue-500 mr-3" />
                    Sovereign Voyages
                  </Dialog.Title>
                  <p className="text-gray-600">Manage your project's expedition participation</p>
                </div>

                {/* Current Campaigns Section */}
                {projectCampaigns && projectCampaigns.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <Ship className="h-5 w-5 text-emerald-500 mr-2" />
                      Active Expeditions
                    </h4>
                    <div className="space-y-3">
                      {projectCampaigns.map((campaign) => {
                        const campaignLogo = getCampaignLogo(campaign);
                        
                        return (
                          <div key={Number(campaign.id)} className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm group hover:shadow-md transition-all duration-300">
                            <div className="flex items-center space-x-3">
                              {/* Campaign Logo */}
                              <div className="animate-float">
                                {campaignLogo ? (
                                  <img 
                                    src={formatIpfsUrl(campaignLogo)} 
                                    alt={`${campaign.name} logo`}
                                    className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white text-sm font-bold ${campaignLogo ? 'hidden' : 'flex'}`}>
                                  {campaign.name.charAt(0)}
                                </div>
                              </div>
                              
                              <div>
                                <h5 className="font-bold text-emerald-800 group-hover:text-emerald-900 transition-colors duration-300">{campaign.name}</h5>
                                <p className="text-sm text-emerald-600">Status: {campaign.status}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                              <span className="text-sm font-medium text-emerald-700">Aboard</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl border border-red-200 flex items-start mb-6 shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-1">Navigation Error</p>
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <Waves className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-wave" />
                      </div>
                      <p className="text-blue-600 font-medium">Charting the sovereign waters...</p>
                    </div>
                  </div>
                ) : availableCampaigns.length === 0 ? (
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8 text-center border border-gray-200">
                    <div className="text-6xl mb-4 animate-wave">🌊</div>
                    <h4 className="text-lg font-bold text-gray-800 mb-3">
                      {allCampaigns?.length === 0 ? 'No Voyages Available' : 'All Expeditions Joined'}
                    </h4>
                    <p className="text-gray-600 mb-6">
                      {allCampaigns?.length === 0 
                        ? 'No sovereign voyages are currently available in these waters.' 
                        : 'Your ship is already part of all available expeditions.'}
                    </p>
                    <button
                      onClick={() => {/* TODO: Add navigation to create campaign */}}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex items-center mx-auto group relative overflow-hidden"
                    >
                      <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      Launch New Voyage
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-800 flex items-center">
                        <Anchor className="h-5 w-5 text-blue-500 mr-2" />
                        Available Expeditions
                      </h4>
                      <span className="text-sm text-gray-600">{availableCampaigns.length} voyage{availableCampaigns.length !== 1 ? 's' : ''} available</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {availableCampaigns.map((campaignDetails) => {
                        const campaign = campaignDetails.campaign;
                        const campaignLogo = getCampaignLogo(campaignDetails);
                        
                        // Determine campaign status
                        const now = Math.floor(Date.now() / 1000);
                        const startTime = Number(campaign.startTime);
                        const endTime = Number(campaign.endTime);
                        
                        let status: string;
                        let statusStyling: { bgClass: string; textClass: string; icon: any; label: string };
                        
                        if (!campaign.active) {
                          status = 'inactive';
                          statusStyling = { bgClass: 'bg-gray-100', textClass: 'text-gray-700', icon: Anchor, label: 'Anchored' };
                        } else if (now < startTime) {
                          status = 'upcoming';
                          statusStyling = { bgClass: 'bg-gradient-to-r from-amber-100 to-yellow-100', textClass: 'text-amber-700', icon: Timer, label: 'Preparing' };
                        } else if (now >= startTime && now <= endTime) {
                          status = 'active';
                          statusStyling = { bgClass: 'bg-gradient-to-r from-emerald-100 to-green-100', textClass: 'text-emerald-700', icon: Waves, label: 'Live Voyage' };
                        } else {
                          status = 'ended';
                          statusStyling = { bgClass: 'bg-gradient-to-r from-blue-100 to-indigo-100', textClass: 'text-blue-700', icon: Trophy, label: 'Complete' };
                        }
                        
                        return (
                          <div 
                            key={Number(campaign.id)}
                            className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 duration-300 overflow-hidden relative group"
                          >
                            {/* Status Badge */}
                            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${statusStyling.bgClass} ${statusStyling.textClass}`}>
                              <statusStyling.icon className="h-3 w-3" />
                              <span>{statusStyling.label}</span>
                            </div>

                            <div className="p-5">
                              <div className="flex items-start space-x-4 pr-16">
                                {/* Campaign Logo */}
                                <div className="animate-float">
                                  {campaignLogo ? (
                                    <img 
                                      src={formatIpfsUrl(campaignLogo)} 
                                      alt={`${campaign.name} logo`}
                                      className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200 shadow-md group-hover:border-blue-300 transition-colors duration-300"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-blue-200 group-hover:border-blue-300 transition-colors duration-300 ${campaignLogo ? 'hidden' : 'flex'}`}>
                                    {campaign.name.charAt(0)}
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-800 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-300">{campaign.name}</h3>
                                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>
                                  
                                  {/* Campaign Stats */}
                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center space-x-2">
                                      <Coins className="h-4 w-4 text-emerald-500" />
                                      <div>
                                        <p className="text-xs text-gray-600">Treasury</p>
                                        <p className="font-bold text-emerald-600">{Number(campaign.totalFunds) / 1e18} CELO</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <Trophy className="h-4 w-4 text-amber-500" />
                                      <div>
                                        <p className="text-xs text-gray-600">Max Winners</p>
                                        <p className="font-bold text-amber-600">{Number(campaign.maxWinners) || 'All'}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => handleAddToCampaign(campaign.id.toString())}
                                    disabled={isAddingProject || status === 'ended' || status === 'inactive'}
                                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 group/btn relative overflow-hidden"
                                  >
                                    {isAddingProject ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Boarding Ship...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-4 w-4 group-hover/btn:rotate-90 transition-transform duration-300" />
                                        <span>Join Expedition</span>
                                        <Sparkles className="h-4 w-4 group-hover/btn:rotate-12 transition-transform duration-300" />
                                      </>
                                    )}
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ProjectCampaignsModal;