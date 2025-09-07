'use client';

import { useState, useMemo } from 'react';
import { 
  Plus, 
  CheckCircle, 
  Trophy, 
  Coins,
  Clock,
  Target,
  AlertTriangle,
  Loader2,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllProjects, useAddProjectToCampaign, formatProjectForDisplay } from '@/hooks/useProjectMethods';
import type { Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useAccount } from 'wagmi';
import { getCeloTokenAddress } from '@/utils/contractConfig';
import { isCeloToken } from '@/utils/tokenUtils';

interface AddProjectsToCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
}

interface ProjectCardProps {
  project: any;
  onAdd: (projectId: string) => void;
  isLoading: boolean;
  isInCampaign?: boolean;
  status?: string;
  disabled?: boolean;
}

const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onAdd, isLoading, isInCampaign = false, status, disabled }) => {
  const getProjectLogo = (project: any) => {
    try {
      if (project.additionalDataParsed?.logo) return project.additionalDataParsed.logo;
      if (project.additionalData) {
        const additionalData = JSON.parse(project.additionalData);
        if (additionalData.logo) return additionalData.logo;
      }
    } catch (e) {
      // Parse error, continue without logo
    }
    return null;
  };

  const projectLogo = getProjectLogo(project);

  return (
    <Card className={`group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 ${isInCampaign ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-green-50/60 shadow-emerald-100' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Project Logo */}
          <div className="relative flex-shrink-0">
            {projectLogo ? (
              <img 
                src={formatIpfsUrl(projectLogo)} 
                alt={`${project.name} logo`}
                className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground text-lg font-bold shadow-sm ${projectLogo ? 'hidden' : 'flex'}`}>
              {project.name?.charAt(0) || 'P'}
            </div>
            {isInCampaign && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-lg truncate font-semibold">
                {project.name}
              </CardTitle>
              
              {/* Action Button */}
              {isInCampaign ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-lg border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold">Added</span>
                </div>
              ) : (
                <Button
                  onClick={() => onAdd(project.id.toString())}
                  disabled={isLoading || disabled}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <div className="p-0.5 bg-amber-100 rounded">
                  <Trophy className="w-3 h-3 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-gray-600">{project.campaignIds?.length || 0} campaigns</span>
              </div>
              <span className="text-gray-300">•</span>
              <p className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                Click to view details
              </p>
            </div>
            
            {isInCampaign && status && (
              <Badge variant={status === 'Approved' ? 'default' : 'secondary'} className="text-xs px-2 py-1">
                {status === 'Approved' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                {status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
    </Card>
  );
};

const AddProjectsToCampaignModal: React.FC<AddProjectsToCampaignModalProps> = ({ 
 isOpen, 
 onClose, 
 campaignId, 
 onSuccess 
}) => {
 const { address, isConnected } = useAccount();
 const [error, setError] = useState<string | null>(null);
 const [addingProjectId, setAddingProjectId] = useState<string | null>(null);
 const [successProjectId, setSuccessProjectId] = useState<string | null>(null);

 // Hooks
 const { projects: allProjects, isLoading: isLoadingProjects } = useAllProjects(contractAddress);
 const { addProjectToCampaign } = useAddProjectToCampaign(contractAddress);

 // Get projects already in campaign (from campaign participation)
 const campaignProjects = useMemo(() => {
   // Always return an array, never early return
   const projects = (allProjects && address) ?
     allProjects.filter(projectDetails => {
       const formatted = formatProjectForDisplay(projectDetails);
       return formatted &&
         projectDetails.project.owner.toLowerCase() === address.toLowerCase() &&
         projectDetails.project.campaignIds.some(cId =>
           BigInt(cId) === BigInt(campaignId)
         );
     }) : [];
   return projects;
 }, [allProjects, campaignId, address]);

 // Get available projects (not in campaign)
 const availableProjects = useMemo(() => {
   // Always return an array, never early return
   const projects = (allProjects && address) ?
     allProjects.filter(projectDetails => {
       const formatted = formatProjectForDisplay(projectDetails);
       return formatted &&
         projectDetails.project.owner.toLowerCase() === address.toLowerCase() &&
         !projectDetails.project.campaignIds.some(cId =>
           BigInt(cId) === BigInt(campaignId)
         );
     }) : [];
   return projects;
 }, [allProjects, campaignId, address]);

 const campaignProjectsFormatted = useMemo(() => {
   return campaignProjects.map(formatProjectForDisplay).filter(Boolean);
 }, [campaignProjects]);

 const availableProjectsFormatted = useMemo(() => {
   return availableProjects.map(formatProjectForDisplay).filter(Boolean);
 }, [availableProjects]);

 // Handlers
 const handleAddProject = async (projectId: string) => {
   if (!isConnected || !address) {
     setError('Please connect your wallet to add projects to campaigns.');
     return;
   }
   try {
     setError(null);
     setAddingProjectId(projectId);
     const feeTokenAddress = getCeloTokenAddress();
     
     // Log token information for debugging
     console.log('Fee token address:', feeTokenAddress);
     console.log('Is CELO token:', isCeloToken(feeTokenAddress));
     console.log('Environment:', import.meta.env.VITE_ENV);
     
     await addProjectToCampaign({
       campaignId: BigInt(campaignId),
       projectId: BigInt(projectId),
       feeToken: feeTokenAddress,
       feeAmount: BigInt('1000000000000000000'), // 1 CELO in wei
       shouldPayFee: true
     });
     setSuccessProjectId(projectId);
     
     // Refresh projects after successful addition
     setTimeout(() => {
       setAddingProjectId(null);
       setSuccessProjectId(null);
       // Trigger a refresh of the projects list
       window.location.reload();
       onClose();
       if (onSuccess) {
         onSuccess();
       }
     }, 1200);
   } catch (err: any) {
     let errorMessage = 'Failed to add project to campaign. Please try again.';
     if (err?.message) {
       if (err.message.includes('user rejected')) {
         errorMessage = 'Transaction was rejected. No fees were charged.';
       } else if (err.message.includes('insufficient funds')) {
         errorMessage = `Insufficient CELO balance. You need at least 1.0 CELO to add a project.`;
       } else if (err.message.includes('Campaign has ended')) {
         errorMessage = 'This campaign has already ended.';
       } else if (err.message.includes('Project already in campaign')) {
         errorMessage = 'This project is already participating in this campaign.';
       } else {
         errorMessage = err.message;
       }
     }
     setError(errorMessage);
     setAddingProjectId(null);
   }
 };

 return (
   <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="max-w-[72rem] max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-white to-gray-50/50 p-0">
       <DialogHeader className="p-6 pb-4">
         {/* Fee Information */}
         <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl shadow-sm">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 rounded-lg">
               <Coins className="h-5 w-5 text-amber-600" />
             </div>
             <div>
               <p className="text-sm font-semibold text-amber-800">
                 1 CELO fee required to prevent spam
               </p>
               <p className="text-xs text-amber-700 mt-1">
                 This fee is added to the campaign's funding pool and helps maintain quality
               </p>
             </div>
           </div>
         </div>
       </DialogHeader>
       <div className="flex-1 overflow-y-auto px-6 pb-0">
         
         {/* Error Message */}
         {error && (
           <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 mb-6 shadow-sm">
             <div className="flex items-start gap-3">
               <div className="p-1 bg-red-100 rounded-lg">
                 <AlertTriangle className="h-4 w-4 text-red-600" />
               </div>
               <div>
                 <p className="font-semibold text-red-900 text-sm mb-1">Transaction Failed</p>
                 <p className="text-red-700 text-sm">{error}</p>
               </div>
             </div>
           </div>
         )}
         
         {/* Loading State */}
         {isLoadingProjects ? (
           <div className="flex flex-col items-center justify-center py-12">
             <div className="relative">
               <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
               <div className="absolute inset-0 w-10 h-10 border-2 border-primary/20 rounded-full"></div>
             </div>
             <h4 className="text-xl font-semibold text-gray-700 mb-2">Loading Your Projects</h4>
             <p className="text-gray-500 text-sm">Please wait while we fetch your projects...</p>
           </div>
         ) : !isConnected ? (
           <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-8 text-center border-2 border-amber-200 shadow-sm">
             <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto mb-4">
               <AlertTriangle className="h-6 w-6 text-amber-600" />
             </div>
             <h4 className="text-xl font-semibold text-amber-900 mb-3">
               Wallet Not Connected
             </h4>
             <p className="text-amber-800 text-sm mb-4">
               Please connect your wallet to add your projects to this campaign.
             </p>
             <Button className="bg-amber-600 hover:bg-amber-700 text-white">
               Connect Wallet
             </Button>
           </div>
         ) : availableProjectsFormatted.length === 0 ? (
           <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 text-center border-2 border-gray-200 shadow-sm">
             <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
               {campaignProjectsFormatted.length > 0 ? (
                 <CheckCircle className="h-6 w-6 text-blue-600" />
               ) : (
                 <Target className="h-6 w-6 text-blue-600" />
               )}
             </div>
             <h4 className="text-xl font-semibold text-gray-700 mb-3">
               {campaignProjectsFormatted.length > 0 ? 'All Your Projects Added!' : 'No Projects Found'}
             </h4>
             <p className="text-gray-600 text-sm mb-6">
               {campaignProjectsFormatted.length > 0 
                 ? 'All your available projects are already participating in this campaign.'
                 : 'You don\'t have any projects yet. Create a project first to add it to campaigns.'
               }
             </p>
             {campaignProjectsFormatted.length === 0 && (
               <Button asChild className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg">
                 <a href="/app/project/start">
                   <Plus className="w-4 h-4 mr-2" />
                   Create Your First Project
                 </a>
               </Button>
             )}
           </div>
         ) : (
           <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-1 bg-primary/10 rounded-lg">
                 <Sparkles className="h-3 w-3 text-primary" />
               </div>
               <h4 className="text-sm font-semibold text-gray-700">Available Projects</h4>
               <Badge variant="secondary" className="ml-auto text-xs">
                 {availableProjectsFormatted.length} project{availableProjectsFormatted.length !== 1 ? 's' : ''}
               </Badge>
             </div>
             <div className="space-y-2">
               {availableProjectsFormatted.map((project) => (
                 <ProjectCard
                   key={project?.id}
                   project={project}
                   onAdd={handleAddProject}
                   isLoading={addingProjectId === project?.id?.toString()}
                   isInCampaign={false}
                   status={successProjectId === project?.id?.toString() ? 'Added!' : undefined}
                   disabled={!!addingProjectId && addingProjectId !== project?.id?.toString()}
                 />
               ))}
             </div>
           </div>
         )}
       </div>
       
       {/* Cancel Button */}
       <div className="p-6 pt-4 flex justify-end">
         <Button
           variant="outline"
           onClick={onClose}
           size="sm"
         >
           Cancel
         </Button>
       </div>
     </DialogContent>
   </Dialog>
 );
};

export default AddProjectsToCampaignModal;