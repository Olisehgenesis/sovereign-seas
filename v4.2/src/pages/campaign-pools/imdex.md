// import React, { useState, useEffect } from 'react';
// import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
// import { parseEther, formatEther } from 'viem';
// import { bridgeAbi as SIMPLE_BRIDGE_ABI } from '@/abi/bridge';
// const SIMPLE_BRIDGE_ADDRESS = import.meta.env.VITE_SIMPLE_BRIDGE_V1 || "0x8970026D77290AA73FF2c95f80D6a4beEd94284F"; // From deployment

// interface Project {
//   id: number;
//   name: string;
//   description: string;
//   owner: string;
//   active: boolean;
//   createdAt: number;
// }

// interface Campaign {
//   id: number;
//   name: string;
//   description: string;
//   goodDollarAmount: bigint;
//   startTime: number;
//   endTime: number;
//   maxWinners: number;
//   isActive: boolean;
//   participatingProjects: number[];
// }

// const CampaignPoolsPage: React.FC = () => {
//   const { address, isConnected } = useAccount();
  
//   // State
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [campaigns, setCampaigns] = useState<Campaign[]>([]);
//   const [selectedProject, setSelectedProject] = useState<number | null>(null);
//   const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  
//   // Form states
//   const [projectForm, setProjectForm] = useState({
//     name: '',
//     description: ''
//   });
  
//   const [campaignForm, setCampaignForm] = useState({
//     name: '',
//     description: '',
//     startTime: '',
//     endTime: '',
//     maxWinners: 1,
//     goodDollarPoolAmount: '',
//     poolProjectId: '',
//     poolIpfs: ''
//   });

//   // Contract reads
//   const { data: projectCount } = useContractRead({
//     address: SIMPLE_BRIDGE_ADDRESS as `0x${string}`,
//     abi: SIMPLE_BRIDGE_ABI,
//     functionName: 'projectCounter',
//     watch: true
//   });

//   const { data: campaignCount } = useContractRead({
//     address: SIMPLE_BRIDGE_ADDRESS as `0x${string}`,
//     abi: SIMPLE_BRIDGE_ABI,
//     functionName: 'campaignCounter',
//     watch: true
//   });

//   const { data: goodDollarBalance } = useContractRead({
//     address: SIMPLE_BRIDGE_ADDRESS as `0x${string}`,
//     abi: SIMPLE_BRIDGE_ABI,
//     functionName: 'getGoodDollarBalance',
//     watch: true
//   });

//   // Contract writes
//   const { write: createProject, data: createProjectData } = useContractWrite({
//     address: SIMPLE_BRIDGE_ADDRESS as `0x${string}`,
//     abi: SIMPLE_BRIDGE_ABI,
//     functionName: 'createProject'
//   });

//   const { write: createCampaign, data: createCampaignData } = useContractWrite({
//     address: SIMPLE_BRIDGE_ADDRESS as `0x${string}`,
//     abi: SIMPLE_BRIDGE_ABI,
//     functionName: 'createCampaign'
//   });

//   const { write: addProjectToCampaign } = useContractWrite({
//     address: SIMPLE_BRIDGE_ADDRESS as `0x${string}`,
//     abi: SIMPLE_BRIDGE_ABI,
//     functionName: 'addProjectToCampaign'
//   });

//   // Transaction status
//   const { isLoading: isCreatingProject, isSuccess: projectCreated } = useWaitForTransaction({
//     hash: createProjectData?.hash
//   });

//   const { isLoading: isCreatingCampaign, isSuccess: campaignCreated } = useWaitForTransaction({
//     hash: createCampaignData?.hash
//   });

//   // Load projects and campaigns
//   useEffect(() => {
//     if (projectCount && projectCount > 0) {
//       loadProjects();
//     }
//   }, [projectCount]);

//   useEffect(() => {
//     if (campaignCount && campaignCount > 0) {
//       loadCampaigns();
//     }
//   }, [campaignCount]);

//   const loadProjects = async () => {
//     if (!projectCount) return;
    
//     const projectArray: Project[] = [];
//     for (let i = 0; i < Number(projectCount); i++) {
//       try {
//         // You'll need to implement this with proper contract calls
//         // For now, we'll use placeholder data
//         projectArray.push({
//           id: i,
//           name: `Project ${i}`,
//           description: `Description for project ${i}`,
//           owner: address || '0x...',
//           active: true,
//           createdAt: Date.now()
//         });
//       } catch (error) {
//         console.error(`Error loading project ${i}:`, error);
//       }
//     }
//     setProjects(projectArray);
//   };

//   const loadCampaigns = async () => {
//     if (!campaignCount) return;
    
//     const campaignArray: Campaign[] = [];
//     for (let i = 0; i < Number(campaignCount); i++) {
//       try {
//         // You'll need to implement this with proper contract calls
//         // For now, we'll use placeholder data
//         campaignArray.push({
//           id: i,
//           name: `Campaign ${i}`,
//           description: `Description for campaign ${i}`,
//           goodDollarAmount: BigInt(1000 * 10**18), // 1000 G$
//           startTime: Date.now(),
//           endTime: Date.now() + 86400 * 30, // 30 days
//           maxWinners: 5,
//           isActive: true,
//           participatingProjects: []
//         });
//       } catch (error) {
//         console.error(`Error loading campaign ${i}:`, error);
//       }
//     }
//     setCampaigns(campaignArray);
//   };

//   const handleCreateProject = () => {
//     if (!projectForm.name || !projectForm.description) return;
    
//     createProject({
//       args: [projectForm.name, projectForm.description]
//     });
    
//     setProjectForm({ name: '', description: '' });
//   };

//   const handleCreateCampaign = () => {
//     if (!campaignForm.name || !campaignForm.description || !campaignForm.startTime || !campaignForm.endTime) return;
    
//     const startTime = Math.floor(new Date(campaignForm.startTime).getTime() / 1000);
//     const endTime = Math.floor(new Date(campaignForm.endTime).getTime() / 1000);
//     const poolAmount = parseEther(campaignForm.goodDollarPoolAmount || '1000');
    
//     createCampaign({
//       args: [
//         campaignForm.name,
//         campaignForm.description,
//         startTime,
//         endTime,
//         campaignForm.maxWinners,
//         poolAmount,
//         campaignForm.poolProjectId,
//         campaignForm.poolIpfs
//       ]
//     });
    
//     setCampaignForm({
//       name: '',
//       description: '',
//       startTime: '',
//       endTime: '',
//       maxWinners: 1,
//       goodDollarPoolAmount: '',
//       poolProjectId: '',
//       poolIpfs: ''
//     });
//   };

//   const handleAddProjectToCampaign = () => {
//     if (selectedProject === null || selectedCampaign === null) return;
    
//     addProjectToCampaign({
//       args: [selectedProject, selectedCampaign]
//     });
    
//     setSelectedProject(null);
//     setSelectedCampaign(null);
//   };

//   if (!isConnected) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
//         <div className="bg-white p-8 rounded-lg shadow-lg text-center">
//           <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Wallet</h2>
//           <p className="text-gray-600">Please connect your wallet to access campaign pools</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//       <div className="container mx-auto px-4 py-8">
//         <div className="text-center mb-12">
//           <h1 className="text-4xl font-bold text-gray-800 mb-4">Campaign Pools</h1>
//           <p className="text-xl text-gray-600">Create campaigns with integrated Good Dollar pools</p>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white p-6 rounded-lg shadow-md">
//             <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Projects</h3>
//             <p className="text-3xl font-bold text-blue-600">{Number(projectCount || 0)}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow-md">
//             <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Campaigns</h3>
//             <p className="text-3xl font-bold text-green-600">{Number(campaignCount || 0)}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow-md">
//             <h3 className="text-lg font-semibold text-gray-700 mb-2">Bridge Balance</h3>
//             <p className="text-3xl font-bold text-purple-600">
//               {goodDollarBalance ? formatEther(goodDollarBalance) : '0'} G$
//             </p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow-md">
//             <h3 className="text-lg font-semibold text-gray-700 mb-2">Connected</h3>
//             <p className="text-3xl font-bold text-indigo-600">
//               {address ? address.slice(0, 6) + '...' + address.slice(-4) : 'N/A'}
//             </p>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//           {/* Create Project */}
//           <div className="bg-white p-6 rounded-lg shadow-md">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Project</h2>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
//                 <input
//                   type="text"
//                   value={projectForm.name}
//                   onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter project name"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
//                 <textarea
//                   value={projectForm.description}
//                   onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   rows={3}
//                   placeholder="Enter project description"
//                 />
//               </div>
//               <button
//                 onClick={handleCreateProject}
//                 disabled={isCreatingProject || !projectForm.name || !projectForm.description}
//                 className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isCreatingProject ? 'Creating...' : 'Create Project'}
//               </button>
//             </div>
//           </div>

//           {/* Create Campaign */}
//           <div className="bg-white p-6 rounded-lg shadow-md">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Create Campaign with Pool</h2>
//               <a
//                 href="/campaign-pools/v2/create-campaign"
//                 className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
//               >
//                 Use V2 Form →
//               </a>
//             </div>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
//                 <input
//                   type="text"
//                   value={campaignForm.name}
//                   onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter campaign name"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
//                 <textarea
//                   value={campaignForm.description}
//                   onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   rows={2}
//                   placeholder="Enter campaign description"
//                 />
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
//                   <input
//                     type="datetime-local"
//                     value={campaignForm.startTime}
//                     onChange={(e) => setCampaignForm({ ...campaignForm, startTime: e.target.value })}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
//                   <input
//                     type="datetime-local"
//                     value={campaignForm.endTime}
//                     onChange={(e) => setCampaignForm({ ...campaignForm, endTime: e.target.value })}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Max Winners</label>
//                   <input
//                     type="number"
//                     value={campaignForm.maxWinners}
//                     onChange={(e) => setCampaignForm({ ...campaignForm, maxWinners: parseInt(e.target.value) })}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     min="1"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Pool Amount (G$)</label>
//                   <input
//                     type="number"
//                     value={campaignForm.goodDollarPoolAmount}
//                     onChange={(e) => setCampaignForm({ ...campaignForm, goodDollarPoolAmount: e.target.value })}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     placeholder="1000"
//                     min="100"
//                   />
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Pool Project ID</label>
//                 <input
//                   type="text"
//                   value={campaignForm.poolProjectId}
//                   onChange={(e) => setCampaignForm({ ...campaignForm, poolProjectId: e.target.value })}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="campaign-001"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Pool IPFS Hash</label>
//                 <input
//                   type="text"
//                   value={campaignForm.poolIpfs}
//                   onChange={(e) => setCampaignForm({ ...campaignForm, poolIpfs: e.target.value })}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="QmHash..."
//                 />
//               </div>
//               <button
//                 onClick={handleCreateCampaign}
//                 disabled={isCreatingCampaign || !campaignForm.name || !campaignForm.description || !campaignForm.startTime || !campaignForm.endTime}
//                 className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isCreatingCampaign ? 'Creating...' : 'Create Campaign with Pool'}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Add Project to Campaign */}
//         <div className="bg-white p-6 rounded-lg shadow-md mt-8">
//           <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Project to Campaign</h2>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
//               <select
//                 value={selectedProject || ''}
//                 onChange={(e) => setSelectedProject(parseInt(e.target.value))}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">Choose a project</option>
//                 {projects.map((project) => (
//                   <option key={project.id} value={project.id}>
//                     {project.name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign</label>
//               <select
//                 value={selectedCampaign || ''}
//                 onChange={(e) => setSelectedCampaign(parseInt(e.target.value))}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">Choose a campaign</option>
//                 {campaigns.map((campaign) => (
//                   <option key={campaign.id} value={campaign.id}>
//                     {campaign.name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div className="flex items-end">
//               <button
//                 onClick={handleAddProjectToCampaign}
//                 disabled={selectedProject === null || selectedCampaign === null}
//                 className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Add to Campaign
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Success Messages */}
//         {projectCreated && (
//           <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
//             ✅ Project created successfully!
//           </div>
//         )}

//         {campaignCreated && (
//           <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
//             ✅ Campaign with pool created successfully!
//           </div>
//         )}

//         {/* Projects List */}
//         {projects.length > 0 && (
//           <div className="bg-white p-6 rounded-lg shadow-md mt-8">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">Projects</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {projects.map((project) => (
//                 <div key={project.id} className="border border-gray-200 rounded-lg p-4">
//                   <h3 className="font-semibold text-lg text-gray-800 mb-2">{project.name}</h3>
//                   <p className="text-gray-600 text-sm mb-3">{project.description}</p>
//                   <div className="text-xs text-gray-500">
//                     <p>Owner: {project.owner.slice(0, 6)}...{project.owner.slice(-4)}</p>
//                     <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
//                     <p>Status: {project.active ? 'Active' : 'Inactive'}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Campaigns List */}
//         {campaigns.length > 0 && (
//           <div className="bg-white p-6 rounded-lg shadow-md mt-8">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">Campaigns with Pools</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {campaigns.map((campaign) => (
//                 <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
//                   <h3 className="font-semibold text-lg text-gray-800 mb-2">{campaign.name}</h3>
//                   <p className="text-gray-600 text-sm mb-3">{campaign.description}</p>
//                   <div className="text-xs text-gray-500 space-y-1">
//                     <p>Pool: {formatEther(campaign.goodDollarAmount)} G$</p>
//                     <p>Start: {new Date(campaign.startTime).toLocaleDateString()}</p>
//                     <p>End: {new Date(campaign.endTime).toLocaleDateString()}</p>
//                     <p>Max Winners: {campaign.maxWinners}</p>
//                     <p>Projects: {campaign.participatingProjects.length}</p>
//                     <p>Status: {campaign.isActive ? 'Active' : 'Inactive'}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CampaignPoolsPage;
