'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Plus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useProjectCampaigns, useAddProjectToCampaign, useCanBypassFees, useProjectAdditionFee } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { useAccount } from 'wagmi';
import { Address } from 'viem';

interface ProjectCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const contractAddress = import.meta.env.VITE_CONTRACT_V4;
const CELO_TOKEN_ADDRESS = import.meta.env.VITE_CELO_TOKEN || contractAddress; // Fallback to contract address if not set

const ProjectCampaignsModal = ({ isOpen, onClose, projectId }: ProjectCampaignsModalProps) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<bigint | null>(null);
  
  const { address: userAddress, isConnected } = useAccount();

  // Get project's current campaigns
  const { projectCampaigns, isLoading: isLoadingProjectCampaigns, error: hookError } = useProjectCampaigns(
    contractAddress as Address,
    BigInt(projectId)
  );

  // Get all campaigns
  const { campaigns: allCampaigns, isLoading: isLoadingCampaigns } = useAllCampaigns(contractAddress as Address);
  
  // Get the add to campaign hook
  const { addProjectToCampaign, isPending: isAddingProject, isSuccess, isError: addError, error: addErrorDetails } = useAddProjectToCampaign(contractAddress as Address);
  
  // Get project addition fee
  const { projectAdditionFee, isLoading: feeLoading } = useProjectAdditionFee(contractAddress as Address);
  
  // Check if user can bypass fees for the selected campaign
  const { isAdmin, isLoading: adminLoading } = useCanBypassFees(
    contractAddress as Address, 
    selectedCampaignId || 0n
  );

  useEffect(() => {
    if (hookError) {
      setError('Failed to load campaigns');
    }
  }, [hookError]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      setError(null);
      setSelectedCampaignId(null);
      // Optionally close modal or show success message
      // onClose(); // Uncomment if you want to close on success
    }
  }, [isSuccess]);

  // Handle add project error
  useEffect(() => {
    if (addError && addErrorDetails) {
      let errorMessage = 'Unknown error occurred';
      
      if (addErrorDetails?.message) {
        errorMessage = addErrorDetails.message;
      } else if ((addErrorDetails as any)?.reason) {
        errorMessage = (addErrorDetails as any).reason;
      }
      
      // Handle common error cases
      if (errorMessage.includes('Insufficient CELO sent')) {
        errorMessage = 'Insufficient CELO sent for the project addition fee.';
      } else if (errorMessage.includes('Fee token not supported')) {
        errorMessage = 'The fee token is not supported. Please contact support.';
      } else if (errorMessage.includes('Campaign has ended')) {
        errorMessage = 'This campaign has already ended.';
      } else if (errorMessage.includes('Project already in campaign')) {
        errorMessage = 'This project is already in the campaign.';
      }
      
      setError(`Failed to add project to campaign: ${errorMessage}`);
      setSelectedCampaignId(null);
    }
  }, [addError, addErrorDetails]);

  const handleAddToCampaign = async (campaignId: string) => {
    if (!isConnected || !userAddress) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError(null);
      const campaignIdBigInt = BigInt(campaignId);
      setSelectedCampaignId(campaignIdBigInt);
      
      // Find the campaign to get any additional info if needed
      const campaign = allCampaigns?.find((c) => Number(c.campaign.id) === Number(campaignId));
      
      console.log('Campaign details:', campaign);
      
      // Use CELO as the fee token (most common case)
      const feeTokenAddress = CELO_TOKEN_ADDRESS as Address;
      
      // Wait a bit for admin check to complete if it's loading
      if (adminLoading) {
        // Wait for admin check to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Determine if user should pay fee and fee amount
      const shouldPayFee = !isAdmin;
      let feeAmount = 0n;
      
      if (shouldPayFee && projectAdditionFee) {
        feeAmount = projectAdditionFee;
      }
      
      console.log('Adding project with params:', {
        campaignId: campaignId,
        projectId: projectId,
        feeToken: feeTokenAddress,
        shouldPayFee,
        feeAmount: feeAmount.toString(),
        isAdmin
      });

      await addProjectToCampaign({
        campaignId: campaignIdBigInt,
        projectId: BigInt(projectId),
        feeToken: feeTokenAddress,
        feeAmount,
        shouldPayFee
      });
      
    } catch (err: any) {
      console.error('Error adding project to campaign:', err);
      setError(`Failed to add project to campaign: ${err.message || 'Unknown error'}`);
      setSelectedCampaignId(null);
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
                  Campaign Management
                </Dialog.Title>

                {/* Fee Information Display */}
                {!feeLoading && projectAdditionFee && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-1">Fee Information</h4>
                    <div className="text-sm text-blue-700">
                      <p>Project Addition Fee: {Number(projectAdditionFee) / 1e18} CELO</p>
                      {selectedCampaignId && !adminLoading && (
                        <p>Your Status: {isAdmin ? 'Admin (No fee required)' : 'Regular User (Fee required)'}</p>
                      )}
                    </div>
                  </div>
                )}

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
                            {campaign.participation && (
                              <p className="text-sm text-green-600">
                                Approved: {campaign.participation.approved ? 'Yes' : 'Pending'}
                              </p>
                            )}
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success message */}
                {isSuccess && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-start mb-4">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">Project successfully added to campaign!</p>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-start mb-4">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Connection warning */}
                {!isConnected && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-start mb-4">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">Please connect your wallet to add projects to campaigns.</p>
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
                      const campaignIdStr = campaign.id.toString();
                      
                      // Determine campaign status
                      const now = Math.floor(Date.now() / 1000);
                      const startTime = Number(campaign.startTime);
                      const endTime = Number(campaign.endTime);
                      
                      let status: string;
                      let canAdd = true;
                      
                      if (!campaign.active) {
                        status = 'inactive';
                        canAdd = false;
                      } else if (now < startTime) {
                        status = 'upcoming';
                      } else if (now >= startTime && now <= endTime) {
                        status = 'active';
                      } else {
                        status = 'ended';
                        canAdd = false;
                      }
                      
                      const isCurrentlyAdding = isAddingProject && selectedCampaignId === campaign.id;
                      
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
                                onClick={() => handleAddToCampaign(campaignIdStr)}
                                disabled={!canAdd || !isConnected || isCurrentlyAdding || (adminLoading && selectedCampaignId === campaign.id)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-sm font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isCurrentlyAdding ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Adding...
                                  </>
                                ) : adminLoading && selectedCampaignId === campaign.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Checking...
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