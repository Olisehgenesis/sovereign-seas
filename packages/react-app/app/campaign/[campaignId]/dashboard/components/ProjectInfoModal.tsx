// components/ProjectInfoModal.jsx
import { X, User, Edit, Award, ExternalLink, Code, Github, Globe, FileText, ImageIcon, Video, History } from 'lucide-react';

interface ProjectInfoModalProps {
  project: any;
  isActive: boolean;
  isAdmin: boolean;
  isConnected: boolean;
  address: string;
  campaignId: string;
  formatTokenAmount: (bigint: any) => string;
  userVoteHistory: any[];
  fundsDistributed: boolean;
  setSelectedProject: (project: any) => void;
  setVoteModalVisible: (visible: boolean) => void;
  setProjectInfoModalVisible: (visible: boolean) => void;
}

const ProjectInfoModal: React.FC<ProjectInfoModalProps> = ({
  project,
  isActive,
  isAdmin,
  isConnected,
  address,
  campaignId,
  formatTokenAmount,
  userVoteHistory,
  fundsDistributed,
  setSelectedProject,
  setVoteModalVisible,
  setProjectInfoModalVisible
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto shadow-xl">
        <button 
          onClick={() => setProjectInfoModalVisible(false)} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Header section with title and badges */}
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <h3 className="text-2xl font-bold text-gray-800 tilt-neon">{project.name}</h3>
          
          {!project.approved && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200">
              Pending Approval
            </span>
          )}
          
          {fundsDistributed && Number(project.fundsReceived) > 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200">
              Funded: {formatTokenAmount(project.fundsReceived)} CELO
            </span>
          )}
        </div>
        
        {/* Project Owner and Edit Button */}
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-mono text-gray-600">
              {`${project.owner.slice(0, 6)}...${project.owner.slice(-4)}`}
            </span>
          </div>
          
          {/* Only show edit button if user is owner or admin */}
          {address && (address.toLowerCase() === project.owner.toLowerCase() || isAdmin) && (
            <a 
              href={`/campaign/${campaignId}/project/${project.id}/edit`}
              className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm rounded-full px-3 py-1 flex items-center gap-1 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Project
            </a>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="md:w-2/3">
            {/* Description section */}
            <div className="rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Description</h4>
              <p className="text-gray-800">{project.description}</p>
            </div>
            
            {/* Contracts section */}
            {project.contracts && project.contracts.length > 0 && (
              <div className="rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <Code className="h-4 w-4 mr-1 text-purple-600" />
                  Contract Addresses
                </h4>
                <div className="space-y-2">
                  {project.contracts.map((contract: string, idx: number) => (
                    <div key={idx} className="font-mono text-sm text-gray-800 bg-white p-2 rounded-lg break-all border border-gray-200">
                      {contract}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Links Section */}
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.githubLink && (
                  <a 
                    href={project.githubLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 py-2 px-3 bg-white rounded-lg border border-gray-200"
                  >
                    <Github className="h-5 w-5 mr-2" />
                    GitHub Repository
                  </a>
                )}
                
                {project.socialLink && (
                  <a 
                    href={project.socialLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 py-2 px-3 bg-white rounded-lg border border-gray-200"
                  >
                    <Globe className="h-5 w-5 mr-2" />
                    Social Media
                  </a>
                )}
                
                {project.testingLink && (
                  <a 
                    href={project.testingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 py-2 px-3 bg-white rounded-lg border border-gray-200"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Demo / Testing
                  </a>
                )}
                
                {project.logo && (
                  <a 
                    href={project.logo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 py-2 px-3 bg-white rounded-lg border border-gray-200"
                  >
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Project Logo
                  </a>
                )}
                
                {project.demoVideo && (
                  <a 
                    href={project.demoVideo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 py-2 px-3 bg-white rounded-lg border border-gray-200"
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Demo Video
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* Right sidebar */}
          <div className="md:w-1/3">
            {/* Vote statistics card */}
            <div className="rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-600 mb-3">Vote Statistics</h4>
              <div className="bg-white rounded-lg px-4 py-5 text-center mb-3 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">
                  {formatTokenAmount(project.voteCount)}
                </div>
                <div className="text-xs text-gray-500 mt-1">TOTAL VOTES</div>
              </div>
              
              {address && isConnected && (
                <div className="bg-white rounded-lg px-4 py-3 text-center border border-gray-200 shadow-sm">
                  <div className="text-lg font-bold text-purple-600 flex items-center justify-center">
                    <History className="h-4 w-4 mr-1" />
                    <span id="user-vote-count">
                      {userVoteHistory
                        .filter((v: { projectId: { toString: () => any; }; }) => v.projectId.toString() === project.id.toString())
                        .reduce((sum: number, v: { voteCount: any; }) => sum + Number(formatTokenAmount(v.voteCount)), 0)
                      }
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">YOUR VOTES</div>
                </div>
              )}
            </div>
            
            {/* Project info card */}
            <div className="rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-600 mb-3">Project Info</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`text-sm ${project.approved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {project.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
                
                {fundsDistributed && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Funds Received:</span>
                    <span className="text-sm text-emerald-600">
                      {formatTokenAmount(project.fundsReceived)} CELO
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="space-y-2">
              {isActive && project.approved && (
                <button
                  onClick={() => {
                    setSelectedProject(project);
                    setVoteModalVisible(true);
                    setProjectInfoModalVisible(false);
                  }}
                  className="w-full py-3 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center shadow-md"
                >
                  <Award className="h-5 w-5 mr-2" />
                  Vote for this Project
                </button>
              )}
              
              <a 
                href={`/campaign/${campaignId}/project/${project.id}`}
                className="w-full py-3 rounded-full bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors flex items-center justify-center shadow-md"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                View Full Project Page
              </a>
            </div>
          </div>
        </div>
        
        <div className="flex">
          <button
            onClick={() => setProjectInfoModalVisible(false)}
            className="flex-1 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfoModal;