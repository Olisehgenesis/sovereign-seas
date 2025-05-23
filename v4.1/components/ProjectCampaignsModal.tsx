'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useProjectCampaigns, useAddProjectToCampaign } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';    

interface ProjectCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;

const ProjectCampaignsModal = ({ isOpen, onClose, projectId }: ProjectCampaignsModalProps) => {
  const [error, setError] = useState<string | null>(null);

  // Get project's current campaigns
  const { projectCampaigns, isLoading: isLoadingProjectCampaigns, error: hookError } = useProjectCampaigns(
    contractAddress as `0x${string}`,
    BigInt(projectId)
  );

  // Get all campaigns directly - no async loading needed
  const { campaigns: allCampaigns, isLoading: isLoadingCampaigns } = useAllCampaigns(contractAddress as `0x${string}`);
  
  // Get the add to campaign hook
  const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress as `0x${string}`);
 
  useEffect(() => {
    if (hookError) {
      setError('Failed to load campaigns');
    }
  }, [hookError]);

  const handleAddToCampaign = async (campaignId: string) => {
    try {
      setError(null);
      
      // Find the campaign to get any additional info if needed
      const campaign = allCampaigns?.find((c) => Number(c.campaign.id) === Number(campaignId));
      
      // Convert BigInt values to strings before logging
      const campaignForLogging = campaign ? {
        ...campaign,
        campaign: {
          ...campaign.campaign,
          id: campaign.campaign.id.toString(),
          startTime: campaign.campaign.startTime.toString(),
          endTime: campaign.campaign.endTime.toString(),
          totalFunds: campaign.campaign.totalFunds.toString(),
          maxWinners: campaign.campaign.maxWinners?.toString()
        }
      } : null;
      console.log('Campaign details:', campaignForLogging);
      
      // Use the campaign's payout token as the fee token (common practice)
      // If that's not available, use CELO token address from environment
      const feeTokenAddress = campaign?.campaign.payoutToken || 
                             process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS || 
                             contractAddress;
      
      // Log the parameters being passed to addProjectToCampaign
      const params = {
        campaignId: campaignId,
        projectId: projectId,
        feeToken: feeTokenAddress
      };
      console.log('Adding project to campaign with params:', params);

      await addProjectToCampaign({
        campaignId: BigInt(campaignId),
        projectId: BigInt(projectId),
        feeToken: feeTokenAddress as `0x${string}`
      });
      
      // The hook will automatically refetch data after successful transaction
    } catch (err: any) {
      console.error('Error adding project to campaign:', err);
      // Extract meaningful error message
      let errorMessage = 'Unknown error occurred';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.reason) {
        errorMessage = err.reason;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      }
      
      // Handle common error cases
      if (errorMessage.includes('Fee token not supported')) {
        errorMessage = 'The fee token is not supported. Please contact support.';
      } else if (errorMessage.includes('Campaign has ended')) {
        errorMessage = 'This campaign has already ended.';
      } else if (errorMessage.includes('Project already in campaign')) {
        errorMessage = 'This project is already in the campaign.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to pay the project addition fee.';
      }
      
      setError(`Failed to add project to campaign: ${errorMessage}`);
    }
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-blue-100 relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  Available Campaigns
                </Dialog.Title>

                {/* Current Campaigns Section */}
                {projectCampaigns && projectCampaigns.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Current Campaigns</h4>
                    <div className="space-y-2">
                      {projectCampaigns.map((campaign) => (
                        <div key={Number(campaign.id)} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div>
                            <h5 className="font-medium text-green-800">{campaign.name}</h5>
                            <p className="text-sm text-green-600">Status: {campaign.status}</p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-start mb-4">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Loading state */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : availableCampaigns.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-gray-600 mb-3">
                      {allCampaigns?.length === 0 ? 'No campaigns available' : 'Project is already in all available campaigns'}
                    </p>
                    <button
                      onClick={() => {/* TODO: Add navigation to create campaign */}}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
                    >
                      Create Campaign
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Available Campaigns</h4>
                    {availableCampaigns.map((campaignDetails) => {
                      const campaign = campaignDetails.campaign;
                      
                      // Determine campaign status
                      const now = Math.floor(Date.now() / 1000);
                      const startTime = Number(campaign.startTime);
                      const endTime = Number(campaign.endTime);
                      
                      let status: string;
                      if (!campaign.active) {
                        status = 'inactive';
                      } else if (now < startTime) {
                        status = 'upcoming';
                      } else if (now >= startTime && now <= endTime) {
                        status = 'active';
                      } else {
                        status = 'ended';
                      }
                      
                      return (
                        <div 
                          key={Number(campaign.id)}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 overflow-hidden"
                        >
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div>
                                  <h3 className="font-semibold text-gray-800">{campaign.name}</h3>
                                  <p className="text-sm text-gray-500">{campaign.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  status === 'active' 
                                    ? 'bg-green-100 text-green-700'
                                    : status === 'ended'
                                    ? 'bg-blue-100 text-blue-700'
                                    : status === 'upcoming'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                <p>Total Funds: {Number(campaign.totalFunds) / 1e18} CELO</p>
                                <p>Max Winners: {Number(campaign.maxWinners) || 'Unlimited'}</p>
                              </div>
                              <button
                                onClick={() => handleAddToCampaign(campaign.id.toString())}
                                disabled={isAddingProject || status === 'ended' || status === 'inactive'}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-sm font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isAddingProject ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-1"></div>
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Project
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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