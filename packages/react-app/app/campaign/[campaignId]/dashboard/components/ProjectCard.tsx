// components/ProjectCard.jsx
import { Github, Globe, FileText, Eye, Award, ImageIcon, Video, Code } from 'lucide-react';

interface ProjectCardProps {
  project: {
    name: string;
    approved: boolean;
    fundsReceived: number;
    logo?: string;
    demoVideo?: string;
    description: string;
    githubLink?: string;
    socialLink?: string;
    testingLink?: string;
    contracts?: { id: string }[];
    voteCount: number;
    id: string|number|bigint;
  };
  isActive: boolean;
  isAdmin: boolean;
  fundsDistributed: boolean;
  openProjectInfo: (project: any) => void;
  setSelectedProject: (project: any) => void;
  setVoteModalVisible: (visible: boolean) => void;
  approveProject: (campaignId: number, projectId: number) => Promise<void>;
  campaignId: string;
  formatTokenAmount: (amount: bigint) => string;
  isWritePending: boolean;
  isWaitingForTx: boolean;
  setStatusMessage: (message: { text: string; type: 'success' | 'error' }) => void;
  loadCampaignData: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isActive,
  isAdmin,
  fundsDistributed,
  openProjectInfo,
  setSelectedProject,
  setVoteModalVisible,
  approveProject,
  campaignId,
  formatTokenAmount,
  isWritePending,
  isWaitingForTx,
  setStatusMessage,
  loadCampaignData
}) => {
  return (
    <div className="bg-white rounded-xl p-5 hover:shadow-md transition-all border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-grow">
          <div className="flex items-start flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
            {!project.approved && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200">
                Pending Approval
              </span>
            )}
            {fundsDistributed && Number(project.fundsReceived) > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200">
                Funded: {formatTokenAmount(BigInt(project.fundsReceived))} CELO
              </span>
            )}
            
            {/* Media indicators */}
            {(project.logo || project.demoVideo) && (
              <div className="flex items-center gap-1">
                {project.logo && (
                  <span className="text-blue-600">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                {project.demoVideo && (
                  <span className="text-red-600">
                    <Video className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            )}
          </div>
          
          <p className="text-gray-600 mt-1 mb-3">{project.description.length > 200 ? project.description.substring(0, 200) + '...' : project.description}</p>
          
       
          
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm">
            {project.githubLink && (
              <a 
                href={project.githubLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Github className="h-4 w-4 mr-1" />
                GitHub
              </a>
            )}
            
            {project.socialLink && (
              <a 
                href={project.socialLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Globe className="h-4 w-4 mr-1" />
                Karma Gap Page
              </a>
            )}
            
            {project.testingLink && (
              <a 
                href={project.testingLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center"
              >
                <FileText className="h-4 w-4 mr-1" />
                Demo
              </a>
            )}
            
            {/* Show contract count if there are any contracts */}
            {project.contracts && project.contracts.length > 0 && (
              <span className="text-purple-600 flex items-center">
                <Code className="h-4 w-4 mr-1" />
                {project.contracts.length} Contract{project.contracts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center min-w-[120px] border border-gray-100">
            <div className="text-xl font-bold text-emerald-600">
              {formatTokenAmount(BigInt(project.voteCount))}
            </div>
            <div className="text-xs text-gray-500 mt-1">VOTES</div>
          </div>
          
          <div className="flex gap-2 mt-3 w-full md:w-auto">
            <button
              onClick={() => openProjectInfo(project)}
              className="px-3 py-2 bg-white text-gray-700 rounded-full text-sm hover:bg-gray-50 transition-colors flex items-center flex-1 justify-center border border-gray-200 shadow-sm"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </button>
            
            {isActive && project.approved && (
              <button
                onClick={() => {
                  setSelectedProject(project);
                  setVoteModalVisible(true);
                }}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm transition-colors flex items-center flex-1 justify-center shadow-sm"
              >
                <Award className="h-4 w-4 mr-1" />
                Vote
              </button>
            )}
          </div>
          
          {isAdmin && !project.approved && (
            <button
              onClick={async () => {
                try {
                  await approveProject(Number(campaignId), Number(project.id));
                  setStatusMessage({
                    text: `Project "${project.name}" approved successfully!`,
                    type: 'success'
                  });
                  setTimeout(() => {
                    loadCampaignData();
                  }, 2000);
                } catch (error) {
                  console.error('Error approving project:', error);
                  setStatusMessage({
                    text: 'Error approving project. Please try again.',
                    type: 'error'
                  });
                }
              }}
              disabled={isWritePending || isWaitingForTx}
              className="mt-2 w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm transition-colors disabled:bg-gray-300 shadow-sm"
            >
              Approve Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;