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
}

interface ProjectCardProps {
  project: any;
  onAdd: (projectId: string) => void;
  isLoading: boolean;
  isInCampaign?: boolean;
  status?: string;
}

const PARTICIPATION_FEE = '1.0'; // 1 CELO
const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onAdd, isLoading, isInCampaign = false, status }) => {
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
             disabled={isLoading}
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

const FeeNotice: React.FC = () => (
 <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-8">
   <div className="flex items-start gap-4">
     <div className="p-3 bg-amber-100 rounded-xl">
       <DollarSign className="w-6 h-6 text-amber-600" />
     </div>
     <div className="flex-1">
       <h4 className="font-bold text-amber-900 text-lg mb-2 flex items-center gap-2">
         Project Addition Fee
         <Info className="w-4 h-4 text-amber-600" />
       </h4>
       <p className="text-amber-800 mb-4 leading-relaxed">
         Adding a project to a campaign requires a <span className="font-bold">{PARTICIPATION_FEE} CELO</span> fee to prevent spam and ensure serious participation.
       </p>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-amber-100">
           <Shield className="w-5 h-5 text-amber-600" />
           <div>
             <p className="font-semibold text-amber-900 text-sm">Quality Control</p>
             <p className="text-amber-700 text-xs">Prevents spam submissions</p>
           </div>
         </div>
         <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-amber-100">
           <Gift className="w-5 h-5 text-amber-600" />
           <div>
             <p className="font-semibold text-amber-900 text-sm">Boosts Prize Pool</p>
             <p className="text-amber-700 text-xs">Fees contribute to rewards</p>
           </div>
         </div>
       </div>
     </div>
   </div>
 </div>
);

const AddProjectsToCampaignModal: React.FC<AddProjectsToCampaignModalProps> = ({ 
 isOpen, 
 onClose, 
 campaignId, 
 campaignName 
}) => {
 const { address, isConnected } = useAccount();
 const [error, setError] = useState<string | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [sortBy, setSortBy] = useState<'name' | 'created' | 'campaigns'>('name');

 // Hooks
 const { projects: allProjects, isLoading: isLoadingProjects } = useAllProjects(contractAddress);
 const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress);

 // Get projects already in campaign (from campaign participation)
 const campaignProjects = useMemo(() => {
   if (!allProjects) return [];
   
   return allProjects.filter(projectDetails => {
     const formatted = formatProjectForDisplay(projectDetails);
     return formatted && projectDetails.project.campaignIds.some(cId => 
       BigInt(cId) === BigInt(campaignId)
     );
   });
 }, [allProjects, campaignId]);

 // Get available projects (not in campaign)
 const availableProjects = useMemo(() => {
   if (!allProjects) return [];
   
   return allProjects.filter(projectDetails => {
     const formatted = formatProjectForDisplay(projectDetails);
     return formatted && !projectDetails.project.campaignIds.some(cId => 
       BigInt(cId) === BigInt(campaignId)
     );
   });
 }, [allProjects, campaignId]);

 const filteredAndSortedAvailableProjects = useMemo(() => {
   let filtered = availableProjects.map(formatProjectForDisplay).filter(Boolean);

   // Apply search filter
   if (searchTerm) {
     filtered = filtered.filter(project => 
       project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       project?.description?.toLowerCase().includes(searchTerm.toLowerCase())
     );
   }

   // Apply sorting
   filtered.sort((a, b) => {
     if (!a || !b) return 0;
     
     switch (sortBy) {
       case 'name':
         return (a.name || '').localeCompare(b.name || '');
       case 'created':
         return Number(b.createdAt || 0) - Number(a.createdAt || 0);
       case 'campaigns':
         return (b.campaignIds?.length || 0) - (a.campaignIds?.length || 0);
       default:
         return 0;
     }
   });

   return filtered;
 }, [availableProjects, searchTerm, sortBy]);

 const campaignProjectsFormatted = useMemo(() => {
   return campaignProjects.map(formatProjectForDisplay).filter(Boolean);
 }, [campaignProjects]);

 // Handlers
 const handleAddProject = async (projectId: string) => {
   if (!isConnected || !address) {
     setError('Please connect your wallet to add projects to campaigns.');
     return;
   }

   try {
     setError(null);
     
     const feeTokenAddress = import.meta.env.VITE_CELO_TOKEN;
     
     await addProjectToCampaign({
       campaignId: BigInt(campaignId),
       projectId: BigInt(projectId),
       feeToken: feeTokenAddress,
       feeAmount: BigInt('1000000000000000000'), // 1 CELO in wei
       shouldPayFee: true
     });
     
   } catch (err: any) {
     console.error('Error adding project to campaign:', err);
     
     let errorMessage = 'Failed to add project to campaign. Please try again.';
     
     if (err?.message) {
       if (err.message.includes('user rejected')) {
         errorMessage = 'Transaction was rejected. No fees were charged.';
       } else if (err.message.includes('insufficient funds')) {
         errorMessage = `Insufficient CELO balance. You need at least ${PARTICIPATION_FEE} CELO to add a project.`;
       } else if (err.message.includes('Campaign has ended')) {
         errorMessage = 'This campaign has already ended.';
       } else if (err.message.includes('Project already in campaign')) {
         errorMessage = 'This project is already participating in this campaign.';
       } else {
         errorMessage = err.message;
       }
     }
     
     setError(errorMessage);
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

       {/* Animated background elements */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-blue-400/10 to-cyan-400/10 animate-pulse blur-3xl"></div>
         <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-pulse blur-3xl"></div>
         <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-pulse blur-3xl"></div>
       </div>

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
             <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl text-left align-middle shadow-2xl transition-all border border-blue-200/50 relative max-h-[90vh] flex flex-col">
               {/* Decorative elements */}
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-pink-500"></div>
               <div className="absolute top-2 left-6 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
               <div className="absolute top-2 right-20 w-3 h-3 bg-purple-400 rounded-full animate-pulse delay-100"></div>
               <div className="absolute top-4 right-32 w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-200"></div>
               
               {/* Close button */}
               <button
                 onClick={onClose}
                 className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300 p-2 rounded-full hover:bg-gray-100/80 backdrop-blur-sm"
               >
                 <X className="h-6 w-6" />
               </button>

               {/* Header */}
               <div className="p-8 pb-6">
                 <Dialog.Title className="flex items-center gap-4 mb-4">
                   <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                     <Target className="h-8 w-8 text-white" />
                   </div>
                   <div>
                     <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                       Add Projects to Campaign
                     </h3>
                     <p className="text-gray-600 text-lg">
                       Add projects to <span className="font-semibold text-blue-600">{campaignName}</span>
                     </p>
                   </div>
                 </Dialog.Title>
               </div>

               {/* Scrollable Content */}
               <div className="flex-1 overflow-y-auto px-8 pb-8">
                 {/* Fee Notice */}
                 <FeeNotice />

                 {/* Projects already in campaign */}
                 {campaignProjectsFormatted.length > 0 && (
                   <div className="mb-10">
                     <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 bg-emerald-100 rounded-lg">
                         <CheckCircle className="h-5 w-5 text-emerald-600" />
                       </div>
                       <h4 className="text-2xl font-bold text-gray-900">Projects in Campaign</h4>
                       <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                         {campaignProjectsFormatted.length} project{campaignProjectsFormatted.length !== 1 ? 's' : ''}
                       </span>
                     </div>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                   <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 mb-8 shadow-sm">
                     <div className="flex items-start gap-4">
                       <div className="p-2 bg-red-100 rounded-lg">
                         <AlertTriangle className="h-5 w-5 text-red-600" />
                       </div>
                       <div>
                         <p className="font-bold text-red-900 mb-2">Transaction Failed</p>
                         <p className="text-red-700 leading-relaxed">{error}</p>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Loading State */}
                 {isLoadingProjects ? (
                   <div className="flex flex-col items-center justify-center py-16">
                     <div className="relative mb-6">
                       <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                       <Ship className="h-8 w-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                     </div>
                     <h4 className="text-xl font-bold text-gray-900 mb-2">Loading Projects</h4>
                     <p className="text-gray-600">Discovering available projects...</p>
                   </div>
                 ) : availableProjects.length === 0 ? (
                   <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 text-center border-2 border-gray-200">
                     <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Trophy className="h-12 w-12 text-blue-500" />
                     </div>
                     <h4 className="text-2xl font-bold text-gray-900 mb-4">
                       All Projects Added!
                     </h4>
                     <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                       All available projects are already participating in this campaign.
                     </p>
                   </div>
                 ) : (
                   <div className="space-y-8">
                     {/* Search and Filters */}
                     <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-sm">
                       <div className="flex flex-col lg:flex-row gap-4">
                         {/* Search */}
                         <div className="flex-1">
                           <div className="relative">
                             <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                             <input
                               type="text"
                               placeholder="Search projects..."
                               value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/80"
                             />
                           </div>
                         </div>
                         
                         {/* Sort */}
                         <div className="relative">
                           <select
                             value={sortBy}
                             onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'campaigns')}
                             className="appearance-none pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 font-medium"
                           >
                             <option value="name">Sort by Name</option>
                             <option value="created">Sort by Created Date</option>
                             <option value="campaigns">Sort by Campaign Count</option>
                           </select>
                           <SortDesc className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                         </div>
                       </div>
                     </div>

                     {/* Available Projects Header */}
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-100 rounded-lg">
                           <Plus className="h-5 w-5 text-blue-600" />
                         </div>
                         <h4 className="text-2xl font-bold text-gray-900">Available Projects</h4>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                         <BarChart3 className="h-4 w-4" />
                         <span>{filteredAndSortedAvailableProjects.length} project{filteredAndSortedAvailableProjects.length !== 1 ? 's' : ''} available</span>
                       </div>
                     </div>
                     
                     {/* Project Grid */}
                     {filteredAndSortedAvailableProjects.length === 0 ? (
                       <div className="text-center py-12">
                         <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                         <h5 className="text-lg font-semibold text-gray-600 mb-2">No projects match your criteria</h5>
                         <p className="text-gray-500">Try adjusting your search terms</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         {filteredAndSortedAvailableProjects.map((project) => (
                           <ProjectCard
                             key={project?.id}
                             project={project}
                             onAdd={handleAddProject}
                             isLoading={isAddingProject}
                           />
                         ))}
                       </div>
                     )}
                   </div>
                 )}
               </div>

               {/* Footer */}
               <div className="border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm p-6">
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-2 text-sm text-gray-600">
                     <Info className="h-4 w-4" />
                     <span>Projects need approval from campaign admins before accepting votes</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <button
                       onClick={onClose}
                       className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                     >
                       Close
                     </button>
                   </div>
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