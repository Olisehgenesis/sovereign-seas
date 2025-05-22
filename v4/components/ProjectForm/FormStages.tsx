import { ProjectFormData } from '@/hooks/useProjectForm';
import { 
  Hash, Star, FileText, Tag, Bookmark, MapPin, Calendar, Globe,
  ImageIcon, Github, Code, Globe2, Twitter, Linkedin, Users, Mail,
  Zap, Award, Shield, Heart, Lightbulb, Target, DollarSign, Building,
  CalendarIcon, Info, LinkIcon
} from 'lucide-react';

interface FormStagesProps {
  currentStage: number;
  formData: ProjectFormData;
  formErrors: Record<string, string>;
  updateFormData: (field: keyof ProjectFormData, value: any) => void;
  addArrayItem: (field: keyof ProjectFormData, defaultValue?: any) => void;
  removeArrayItem: (field: keyof ProjectFormData, index: number) => void;
  updateArrayItem: (field: keyof ProjectFormData, index: number, value: any) => void;
}

const categories = [
  'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
  'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
  'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 'Other'
];

const blockchains = [
  'Celo', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche',
  'Solana', 'Near', 'Cosmos', 'Polkadot', 'Cardano', 'Multi-chain', 'Other'
];

const techStackOptions = [
  'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Node.js', 'Python', 'Rust',
  'Solidity', 'Go', 'TypeScript', 'JavaScript', 'Web3.js', 'Ethers.js', 'Wagmi',
  'Hardhat', 'Foundry', 'Truffle', 'IPFS', 'PostgreSQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'Vercel', 'Netlify', 'Firebase'
];

const licenses = [
  'MIT', 'Apache 2.0', 'GPL v3', 'GPL v2', 'BSD 3-Clause', 'BSD 2-Clause',
  'MPL 2.0', 'LGPL v3', 'AGPL v3', 'ISC', 'Unlicense', 'Proprietary', 'Other'
];

const developmentStages = [
  'Concept', 'Design', 'Development', 'Testing', 'Beta', 'Production', 'Maintenance'
];

const fundingStages = [
  'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'ICO/IEO', 'IDO',
  'Bootstrapped', 'Grant Funded', 'Not Seeking Funding'
];

export function FormStages({
  currentStage,
  formData,
  formErrors,
  updateFormData,
  addArrayItem,
  removeArrayItem,
  updateArrayItem
}: FormStagesProps) {
  // Stage 1: Basic Information
  if (currentStage === 1) {
    return (
      <div className="space-y-8">
        {/* Project Name & Tagline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Hash className="h-4 w-4 mr-2" />
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="Enter your project name"
            />
            {formErrors.name && <p className="mt-2 text-red-500 text-sm">{formErrors.name}</p>}
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Tagline *
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => updateFormData('tagline', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="Brief, catchy description"
            />
            {formErrors.tagline && <p className="mt-2 text-red-500 text-sm">{formErrors.tagline}</p>}
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-blue-700 font-medium mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Project Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            placeholder="Provide a comprehensive description of your project, its purpose, and value proposition..."
          />
          {formErrors.description && <p className="mt-2 text-red-500 text-sm">{formErrors.description}</p>}
          <p className="mt-2 text-gray-500 text-sm">Minimum 50 characters • {formData.description.length} characters</p>
        </div>
        
        {/* Category & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateFormData('category', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {formErrors.category && <p className="mt-2 text-red-500 text-sm">{formErrors.category}</p>}
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Project Type
            </label>
            <select
              value={formData.projectType}
              onChange={(e) => updateFormData('projectType', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            >
              <option value="dapp">DApp</option>
              <option value="protocol">Protocol</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="tooling">Developer Tooling</option>
              <option value="defi">DeFi</option>
              <option value="nft">NFT</option>
              <option value="gaming">Gaming</option>
              <option value="dao">DAO</option>
            </select>
          </div>
        </div>
        
        {/* Tags */}
        <div>
          <label className="block text-blue-700 font-medium mb-3 flex items-center">
            <Bookmark className="h-4 w-4 mr-2" />
            Tags
          </label>
          {formData.tags.map((tag, index) => (
            <div key={index} className="flex mb-3">
              <input
                type="text"
                value={tag}
                onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="Enter tag (e.g., DeFi, Cross-chain)"
              />
              {formData.tags.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('tags', index)}
                  className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('tags')}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </button>
        </div>
        
        {/* Location & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => updateFormData('location', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="City, Country"
            />
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Established Date
            </label>
            <input
              type="date"
              value={formData.establishedDate}
              onChange={(e) => updateFormData('establishedDate', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => updateFormData('website', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="https://yourproject.com"
            />
          </div>
        </div>
      </div>
    );
  }

  // Stage 2: Media & Links
  if (currentStage === 2) {
    return (
      <div className="space-y-8">
        {/* Repository Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Github className="h-4 w-4 mr-2" />
              GitHub Repository *
            </label>
            <input
              type="url"
              value={formData.githubRepo}
              onChange={(e) => updateFormData('githubRepo', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="https://github.com/username/project"
            />
            {formErrors.githubRepo && <p className="mt-2 text-red-500 text-sm">{formErrors.githubRepo}</p>}
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Demo URL
            </label>
            <input
              type="url"
              value={formData.demoUrl}
              onChange={(e) => updateFormData('demoUrl', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="https://demo.yourproject.com"
            />
          </div>
        </div>

        {/* Additional Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Documentation
            </label>
            <input
              type="url"
              value={formData.documentation}
              onChange={(e) => updateFormData('documentation', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="https://docs.yourproject.com"
            />
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Code className="h-4 w-4 mr-2" />
              NPM Package
            </label>
            <input
              type="url"
              value={formData.npmPackage}
              onChange={(e) => updateFormData('npmPackage', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="https://npmjs.com/package/your-package"
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div>
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
            <Globe2 className="h-5 w-5 mr-2" />
            Social Media & Community
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-blue-700 font-medium mb-3 flex items-center">
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => updateFormData('twitter', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="https://twitter.com/yourproject"
              />
            </div>
            
            <div>
              <label className="block text-blue-700 font-medium mb-3 flex items-center">
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => updateFormData('linkedin', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="https://linkedin.com/company/yourproject"
              />
            </div>
            
            <div>
              <label className="block text-blue-700 font-medium mb-3 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Discord
              </label>
              <input
                type="url"
                value={formData.discord}
                onChange={(e) => updateFormData('discord', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="https://discord.gg/yourproject"
              />
            </div>
            
            <div>
              <label className="block text-blue-700 font-medium mb-3 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Telegram
              </label>
              <input
                type="url"
                value={formData.telegram}
                onChange={(e) => updateFormData('telegram', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="https://t.me/yourproject"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stage 3: Team & Contact
  if (currentStage === 3) {
    return (
      <div className="space-y-8">
        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-blue-700 font-medium mb-3">Contact Email *</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateFormData('contactEmail', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="contact@yourproject.com"
              />
              {formErrors.contactEmail && <p className="mt-2 text-red-500 text-sm">{formErrors.contactEmail}</p>}
            </div>
            
            <div>
              <label className="block text-blue-700 font-medium mb-3">Business Email</label>
              <input
                type="email"
                value={formData.businessEmail}
                onChange={(e) => updateFormData('businessEmail', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="business@yourproject.com"
              />
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div>
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members
          </h3>
          {formData.teamMembers.map((member, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-6 mb-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => {
                    const updated = [...formData.teamMembers];
                    updated[index] = {...member, name: e.target.value};
                    updateFormData('teamMembers', updated);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                  placeholder="Full Name"
                />
                <input
                  type="text"
                  value={member.role}
                  onChange={(e) => {
                    const updated = [...formData.teamMembers];
                    updated[index] = {...member, role: e.target.value};
                    updateFormData('teamMembers', updated);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                  placeholder="Role/Position"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => {
                    const updated = [...formData.teamMembers];
                    updated[index] = {...member, email: e.target.value};
                    updateFormData('teamMembers', updated);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                  placeholder="Email"
                />
                <input
                  type="url"
                  value={member.linkedin}
                  onChange={(e) => {
                    const updated = [...formData.teamMembers];
                    updated[index] = {...member, linkedin: e.target.value};
                    updateFormData('teamMembers', updated);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                  placeholder="LinkedIn URL"
                />
                <div className="flex">
                  <input
                    type="url"
                    value={member.twitter}
                    onChange={(e) => {
                      const updated = [...formData.teamMembers];
                      updated[index] = {...member, twitter: e.target.value};
                      updateFormData('teamMembers', updated);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-l-xl bg-white border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                    placeholder="Twitter URL"
                  />
                  {formData.teamMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...formData.teamMembers];
                        updated.splice(index, 1);
                        updateFormData('teamMembers', updated);
                      }}
                      className="bg-red-100 text-red-600 px-3 py-2.5 rounded-r-xl hover:bg-red-200 transition-colors border-y border-r border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('teamMembers', {
              name: '',
              role: '',
              email: '',
              linkedin: '',
              twitter: '',
              avatar: ''
            })}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </button>
        </div>
      </div>
    );
  }

  // Stage 4: Technical Details
  if (currentStage === 4) {
    return (
      <div className="space-y-8">
        {/* Blockchain & Tech Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Primary Blockchain
            </label>
            <select
              value={formData.blockchain}
              onChange={(e) => updateFormData('blockchain', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            >
              <option value="">Select blockchain</option>
              {blockchains.map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Development Stage
            </label>
            <select
              value={formData.developmentStage}
              onChange={(e) => updateFormData('developmentStage', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            >
              <option value="">Select stage</option>
              {developmentStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <label className="block text-blue-700 font-medium mb-3 flex items-center">
            <Code className="h-4 w-4 mr-2" />
            Technology Stack *
          </label>
          {formData.techStack.map((tech, index) => (
            <div key={index} className="flex mb-3">
              <select
                value={tech}
                onChange={(e) => updateArrayItem('techStack', index, e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              >
                <option value="">Select technology</option>
                {techStackOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {formData.techStack.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('techStack', index)}
                  className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {formErrors.techStack && <p className="mb-2 text-red-500 text-sm">{formErrors.techStack}</p>}
          <button
            type="button"
            onClick={() => addArrayItem('techStack')}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Technology
          </button>
        </div>

        {/* License & Open Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              License
            </label>
            <select
              value={formData.license}
              onChange={(e) => updateFormData('license', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            >
              <option value="">Select license</option>
              {licenses.map(license => (
                <option key={license} value={license}>{license}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Heart className="h-4 w-4 mr-2" />
              Open Source
            </label>
            <div className="flex items-center space-x-4 mt-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="openSource"
                  checked={formData.openSource === true}
                  onChange={() => updateFormData('openSource', true)}
                  className="mr-2 text-blue-500"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="openSource"
                  checked={formData.openSource === false}
                  onChange={() => updateFormData('openSource', false)}
                  className="mr-2 text-blue-500"
                />
                No
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stage 5: Funding & Goals
  if (currentStage === 5) {
    return (
      <div className="space-y-8">
        {/* Key Features */}
        <div>
          <label className="block text-blue-700 font-medium mb-3 flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Key Features *
          </label>
          {formData.keyFeatures.map((feature, index) => (
            <div key={index} className="flex mb-3">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateArrayItem('keyFeatures', index, e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="Describe a key feature"
              />
              {formData.keyFeatures.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('keyFeatures', index)}
                  className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-r-xl hover:bg-gray-200 transition-colors border-y border-r border-gray-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {formErrors.keyFeatures && <p className="mb-2 text-red-500 text-sm">{formErrors.keyFeatures}</p>}
          <button
            type="button"
            onClick={() => addArrayItem('keyFeatures')}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors border border-blue-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </button>
        </div>

        {/* Innovation & Use Cases */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Innovation Statement
            </label>
            <textarea
              value={formData.innovation}
              onChange={(e) => updateFormData('innovation', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="What makes your project innovative?"
            />
          </div>
          
          <div>
            <label className="block text-blue-700 font-medium mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Target Audience
            </label>
            <textarea
              value={formData.targetAudience}
              onChange={(e) => updateFormData('targetAudience', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              placeholder="Who is your target audience?"
            />
          </div>
        </div>

        {/* Funding Information */}
        <div>
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Funding & Business Model
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-blue-700 font-medium mb-3">Funding Stage</label>
              <select
                value={formData.fundingStage}
                onChange={(e) => updateFormData('fundingStage', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
              >
                <option value="">Select funding stage</option>
                {fundingStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-blue-700 font-medium mb-3">Funding Goal</label>
              <input
                type="text"
                value={formData.fundingGoal}
                onChange={(e) => updateFormData('fundingGoal', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
                placeholder="e.g., $1M, 500 CELO"
              />
            </div>
          </div>
        </div>

        {/* Business Model */}
        <div>
          <label className="block text-blue-700 font-medium mb-3 flex items-center">
            <Building className="h-4 w-4 mr-2" />
            Business Model
          </label>
          <textarea
            value={formData.businessModel}
            onChange={(e) => updateFormData('businessModel', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-all"
            placeholder="Describe your business model and revenue strategy..."
          />
        </div>
      </div>
    );
  }

  // Stage 6: Review & Submit
  if (currentStage === 6) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Project Summary</h3>
          <p className="text-gray-600">Review your project details before submission</p>
        </div>

        {/* Basic Information Summary */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-500" />
            Basic Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Project Name:</span>
              <p className="text-gray-800">{formData.name || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Category:</span>
              <p className="text-gray-800">{formData.category || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tagline:</span>
              <p className="text-gray-800">{formData.tagline || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Location:</span>
              <p className="text-gray-800">{formData.location || 'Not specified'}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="font-medium text-gray-600">Description:</span>
            <p className="text-gray-800 mt-1">{formData.description || 'Not specified'}</p>
          </div>
        </div>

        {/* Technical Summary */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
            <Code className="h-5 w-5 mr-2 text-blue-500" />
            Technical Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Blockchain:</span>
              <p className="text-gray-800">{formData.blockchain || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Development Stage:</span>
              <p className="text-gray-800">{formData.developmentStage || 'Not specified'}</p>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-600">Tech Stack:</span>
              <p className="text-gray-800">
                {formData.techStack.filter(t => t.trim() !== '').join(', ') || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Team Summary */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Team & Contact
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Contact Email:</span>
              <p className="text-gray-800">{formData.contactEmail || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Team Members:</span>
              <p className="text-gray-800">
                {formData.teamMembers.filter(m => m.name.trim() !== '').length} member(s)
              </p>
            </div>
          </div>
        </div>

        {/* Links Summary */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
            <LinkIcon className="h-5 w-5 mr-2 text-blue-500" />
            Links & Media
          </h4>
          <div className="space-y-2 text-sm">
            {formData.githubRepo && (
              <div>
                <span className="font-medium text-gray-600">GitHub:</span>
                <a href={formData.githubRepo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                  {formData.githubRepo}
                </a>
              </div>
            )}
            {formData.website && (
              <div>
                <span className="font-medium text-gray-600">Website:</span>
                <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                  {formData.website}
                </a>
              </div>
            )}
            {formData.demoUrl && (
              <div>
                <span className="font-medium text-gray-600">Demo:</span>
                <a href={formData.demoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 ml-2">
                  {formData.demoUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
} 