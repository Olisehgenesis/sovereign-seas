// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  X, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Crown, 
  Ship, 
  Trophy, 
  Coins,
  Timer,
  Sparkles,
  DollarSign,
  Info,
  Shield,
  Calendar,
  Activity,
  Clock,
  ArrowRight,
  Gift,
  Target,
  Filter,
  Search,
  SortDesc,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Flame,
  BarChart3,
  Eye
} from 'lucide-react';
import { useAllProjects, useAddProjectToCampaign, formatProjectForDisplay } from '@/hooks/useProjectMethods';
import { formatEther, Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useAccount } from 'wagmi';

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

const PARTICIPATION_FEE = '1.0'; // 1 CELO
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
    <div className={`group relative bg-white/95 backdrop-blur-sm rounded-2xl border-2 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
      isInCampaign ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-green-50/50' : 'border-blue-200'
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-tr from-purple-400 to-pink-500 rounded-full blur-2xl"></div>
      </div>

      <div className="relative p-6">
        <div className="flex items-start gap-4 mb-6">
          {/* Project Logo */}
          <div className="relative">
            {projectLogo ? (
              <img 
                src={formatIpfsUrl(projectLogo)} 
                alt={`${project.name} logo`}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md group-hover:shadow-lg transition-shadow duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-white ${projectLogo ? 'hidden' : 'flex'}`}>
              {project.name?.charAt(0) || 'P'}
            </div>
            {isInCampaign && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-300 truncate">
              {project.name}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
              {project.description}
            </p>
            
            {isInCampaign && status && (
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {status === 'Approved' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {status}
              </div>
            )}
          </div>
        </div>
        
        {/* Project Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Campaigns</span>
            </div>
            <p className="font-bold text-blue-800 text-lg">
              {project.campaignIds?.length || 0}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
           <div className="flex items-center gap-2 mb-1">
             <Calendar className="w-4 h-4 text-purple-600" />
             <span className="text-xs text-purple-700 font-medium">Created</span>
           </div>
           <p className="font-bold text-purple-800 text-sm">
             {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}
           </p>
         </div>
       </div>
       
       {/* Action Button */}
       {isInCampaign ? (
         <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-xl border border-emerald-200">
           <CheckCircle className="w-4 h-4" />
           <span className="font-semibold">Already in Campaign</span>
         </div>
       ) : (
         <div className="flex gap-2">
           <button
             onClick={() => onAdd(project.id.toString())}
             disabled={isLoading || disabled}
             className="flex-1 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group/btn relative overflow-hidden shadow-md hover:shadow-lg"
           >
             {isLoading ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 <span>Adding...</span>
               </>
             ) : (
               <>
                 <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" />
                 <span>Add to Campaign</span>
               </>
             )}
             <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
           </button>
           
           <button
             onClick={() => window.open(`/explorer/project/${project.id}`, '_blank')}
             className="p-3 bg-white text-blue-600 border border-blue-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:shadow-md group/view"
           >
             <Eye className="w-4 h-4 group-hover/view:scale-110 transition-transform duration-300" />
           </button>
         </div>
       )}
     </div>
   </div>
 );
};

const AddProjectsToCampaignModal: React.FC<AddProjectsToCampaignModalProps> = ({ 
 isOpen, 
 onClose, 
 campaignId, 
 campaignName, 
 onSuccess 
}) => {
 const { address, isConnected } = useAccount();
 const [error, setError] = useState<string | null>(null);
 const [addingProjectId, setAddingProjectId] = useState<string | null>(null);
 const [successProjectId, setSuccessProjectId] = useState<string | null>(null);

 // Hooks
 const { projects: allProjects, isLoading: isLoadingProjects } = useAllProjects(contractAddress);
 const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress);

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
     const feeTokenAddress = import.meta.env.VITE_CELO_TOKEN;
     await addProjectToCampaign({
       campaignId: BigInt(campaignId),
       projectId: BigInt(projectId),
       feeToken: feeTokenAddress,
       feeAmount: BigInt('1000000000000000000'), // 1 CELO in wei
       shouldPayFee: true
     });
     setSuccessProjectId(projectId);
     setTimeout(() => {
       setAddingProjectId(null);
       setSuccessProjectId(null);
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
         <div className="fixed inset-0 bg-gradient-to-br from-blue-900/60 via-indigo-900/60 to-purple-900/60 backdrop-blur-sm" />
       </Transition.Child>
       <div className="fixed inset-0 overflow-y-auto">
         <div className="flex min-h-full items-center justify-center p-4">
           <Transition.Child
             as={Fragment}
             enter="ease-out duration-300"
             enterFrom="opacity-0 scale-95 -translate-y-10"
             enterTo="opacity-100 scale-100 translate-y-0"
             leave="ease-in duration-200"
             leaveFrom="opacity-100 scale-100 translate-y-0"
             leaveTo="opacity-0 scale-95 -translate-y-10"
           >
             <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl text-left align-middle shadow-2xl transition-all border border-blue-200/50 relative max-h-[90vh] flex flex-col">
               {/* Close button */}
               <button
                 onClick={onClose}
                 className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300 p-2 rounded-full hover:bg-gray-100/80 backdrop-blur-sm"
                 disabled={!!addingProjectId}
                 aria-disabled={!!addingProjectId}
               >
                 <X className="h-6 w-6" />
               </button>
               {/* Header */}
               <div className="p-8 pb-4">
                 <Dialog.Title className="flex items-center gap-4 mb-2">
                   <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                     <Target className="h-8 w-8 text-white" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                       Add Projects to Campaign
                     </h3>
                     <p className="text-gray-600 text-base">
                       {campaignName}
                     </p>
                   </div>
                 </Dialog.Title>
                 
                 {/* Fee Information */}
                 <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-amber-100 rounded-lg">
                       <Coins className="h-5 w-5 text-amber-600" />
                     </div>
                     <div className="flex-1">
                       <p className="text-sm font-semibold text-amber-800 mb-1">
                         1 CELO fee required to prevent spam
                       </p>
                       <p className="text-xs text-amber-700">
                         Don't worry, this fee is added to the campaign's funding pool
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="flex-1 overflow-y-auto px-8 pb-8">
                 {/* Projects already in campaign */}
                 {campaignProjectsFormatted.length > 0 && (
                   <div className="mb-6">
                     <h4 className="text-lg font-bold text-gray-900 mb-2">Projects in Campaign</h4>
                     <div className="grid grid-cols-1 gap-4">
                       {campaignProjectsFormatted.map((project) => (
                         <ProjectCard
                           key={project?.id}
                           project={project}
                           onAdd={() => {}}
                           isLoading={false}
                           isInCampaign={true}
                           status="In Campaign"
                         />
                       ))}
                     </div>
                   </div>
                 )}
                 {/* Error Message */}
                 {error && (
                   <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-4">
                     <div className="flex items-start gap-2">
                       <AlertTriangle className="h-5 w-5 text-red-600" />
                       <div>
                         <p className="font-bold text-red-900 mb-1">Transaction Failed</p>
                         <p className="text-red-700 text-sm">{error}</p>
                       </div>
                     </div>
                   </div>
                 )}
                 {/* Loading State */}
                 {isLoadingProjects ? (
                   <div className="flex flex-col items-center justify-center py-12">
                     <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                     <h4 className="text-lg font-bold text-gray-900 mb-1">Loading Projects</h4>
                   </div>
                 ) : !isConnected ? (
                   <div className="bg-amber-50 rounded-2xl p-8 text-center border-2 border-amber-200">
                     <h4 className="text-lg font-bold text-amber-900 mb-2">
                       Wallet Not Connected
                     </h4>
                     <p className="text-amber-800 mb-2 text-base">
                       Please connect your wallet to add your projects to this campaign.
                     </p>
                   </div>
                 ) : availableProjectsFormatted.length === 0 ? (
                   <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-gray-200">
                     <h4 className="text-lg font-bold text-gray-900 mb-2">
                       {campaignProjectsFormatted.length > 0 ? 'All Your Projects Added!' : 'No Projects Found'}
                     </h4>
                     <p className="text-gray-600 mb-2 text-base">
                       {campaignProjectsFormatted.length > 0 
                         ? 'All your available projects are already participating in this campaign.'
                         : 'You don\'t have any projects yet. Create a project first to add it to campaigns.'
                       }
                     </p>
                     {campaignProjectsFormatted.length === 0 && (
                       <a 
                         href="/app/project/start" 
                         className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all duration-300"
                       >
                         <Plus className="w-4 h-4" />
                         Create Project
                       </a>
                     )}
                   </div>
                 ) : (
                   <div>
                     <h4 className="text-lg font-bold text-gray-900 mb-2">Available Projects</h4>
                     <div className="grid grid-cols-1 gap-4">
                       {availableProjectsFormatted.map((project) => (
                         <ProjectCard
                           key={project?.id}
                           project={project}
                           onAdd={handleAddProject}
                           isLoading={addingProjectId === project?.id}
                           isInCampaign={false}
                           status={successProjectId === project?.id ? 'Added!' : undefined}
                           disabled={!!addingProjectId && addingProjectId !== project?.id}
                         />
                       ))}
                     </div>
                   </div>
                 )}
               </div>
               {/* Footer */}
               <div className="border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm p-4">
                 <div className="flex items-center justify-end">
                   <button
                     onClick={onClose}
                     className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                     disabled={!!addingProjectId}
                     aria-disabled={!!addingProjectId}
                   >
                     Close
                   </button>
                 </div>
               </div>
             </Dialog.Panel>
           </Transition.Child>
         </div>
       </div>
     </Dialog>
   </Transition>
 );
};

export default AddProjectsToCampaignModal;