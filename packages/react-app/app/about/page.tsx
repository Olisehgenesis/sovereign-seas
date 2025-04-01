'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Waves, 
  Globe, 
  Anchor, 
  Users, 
  FileText, 
  Vote, 
  Award,
  ArrowRight,
  Github,
  Coins,
  BarChart3,
  TrendingUp,
  Zap,
  HelpCircle,
  LayoutDashboard,
  Info
} from 'lucide-react';

export default function About() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const navigateToCampaigns = () => {
    router.push('/campaigns');
  };

  const navigateToCreateCampaign = () => {
    router.push('/campaign/create');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        {/* Background Wave Effect */}
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#84cc16" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#eab308" fillOpacity="1" d="M0,256L48,261.3C96,267,192,277,288,266.7C384,256,480,224,576,213.3C672,203,768,213,864,213.3C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            <div className="flex items-center mb-2">
              <div className="relative h-12 w-12 mr-3">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lime-500 to-yellow-500 animate-pulse-slow opacity-40"></div>
                <div className="absolute inset-0.5 rounded-full bg-slate-900 flex items-center justify-center">
                  <Image 
                    src="/logo.svg" 
                    alt="Sovereign Seas Logo"
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                About <span className="text-lime-400">Sovereign Seas</span>
              </h1>
            </div>
            
            <h2 className="text-xl md:text-2xl text-lime-100 max-w-3xl">
              A decentralized voting platform where communities decide, and collective decisions drive impact.
            </h2>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20">
            <div className="flex items-center mb-6">
              <Globe className="h-7 w-7 text-lime-500 mr-3" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">Overview</h2>
            </div>
            
            <p className="text-slate-300 mb-6 leading-relaxed">
              Sovereign Seas is a groundbreaking decentralized application built on the Celo blockchain, 
              designed to empower communities to fund and support innovative projects. 
              Our platform creates a transparent ecosystem where the best ideas rise to the top through 
              collective decision-making, with every vote contributing to real-world positive change.
            </p>
            
            <p className="text-slate-300 leading-relaxed">
              Through our unique voting and funding mechanism, we're democratizing project funding and 
              ensuring that resources flow to the most valued initiatives as determined by the community. 
              From open-source development to community-led research, Sovereign Seas enables direct support 
              for the projects that matter most.
            </p>
          </div>
        </div>
      </div>
      
      {/* Core Components Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
            <Coins className="h-8 w-8 text-lime-400 mr-3" />
            Core Components
          </h2>
          <p className="text-lime-100 max-w-2xl mx-auto">
            Sovereign Seas is built on a foundation of powerful, transparent systems that work together to create
            a fair and effective funding platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Voting Mechanism */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 border-t-4 border-lime-500 transform hover:-translate-y-1 transition-all">
            <div className="flex items-center mb-4">
              <Vote className="h-6 w-6 text-lime-500 mr-2" />
              <h3 className="text-xl font-bold text-white">Voting Mechanism</h3>
            </div>
            <ul className="text-slate-300 space-y-2">
              <li className="flex items-start">
                <span className="text-lime-400 mr-2">•</span>
                <span>CELO token used as the voting medium</span>
              </li>
              <li className="flex items-start">
                <span className="text-lime-400 mr-2">•</span>
                <span>Configurable vote multiplier (1-5x per token)</span>
              </li>
              <li className="flex items-start">
                <span className="text-lime-400 mr-2">•</span>
                <span>Transparent, on-chain voting for full auditability</span>
              </li>
            </ul>
          </div>
          
          {/* Economic Structure */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 border-t-4 border-lime-400 transform hover:-translate-y-1 transition-all">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-lime-400 mr-2" />
              <h3 className="text-xl font-bold text-white">Economic Structure</h3>
            </div>
            <ul className="text-slate-300 space-y-2">
              <li className="flex items-start">
                <span className="text-lime-500 mr-2">•</span>
                <span>15% platform fee for development and maintenance</span>
              </li>
              <li className="flex items-start">
                <span className="text-lime-500 mr-2">•</span>
                <span>Variable admin fee set by campaign creators</span>
              </li>
              <li className="flex items-start">
                <span className="text-lime-500 mr-2">•</span>
                <span>Majority of funds distributed directly to projects</span>
              </li>
            </ul>
          </div>
          
          {/* Campaign Management */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 border-t-4 border-lime-500 transform hover:-translate-y-1 transition-all">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-6 w-6 text-lime-500 mr-2" />
              <h3 className="text-xl font-bold text-white">Campaign Management</h3>
            </div>
            <ul className="text-slate-300 space-y-2">
              <li className="flex items-start">
                <span className="text-lime-400 mr-2">•</span>
                <span>Create themed funding campaigns</span>
              </li>
              <li className="flex items-start">
                <span className="text-lime-400 mr-2">•</span>
                <span>Submit and approve community projects</span>
              </li>
              <li className="flex items-start">
                <span className="text-lime-400 mr-2">•</span>
                <span>Choose linear or quadratic fund distribution</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* User Roles Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-lime-400 mr-3" />
            User Roles
          </h2>
          <p className="text-lime-100 max-w-2xl mx-auto">
            Sovereign Seas brings together different stakeholders, each with their own important role in the ecosystem.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Platform Administrators */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 hover:bg-slate-800/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-full flex items-center justify-center mb-4">
              <LayoutDashboard className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Super Admins</h3>
            <p className="text-slate-300 mb-4">
              Manage the overall platform, handle disputes, and maintain system integrity to ensure a
              fair and functional ecosystem for all participants.
            </p>
          </div>
          
          {/* Campaign Administrators */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 hover:bg-slate-800/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Campaign Administrators</h3>
            <p className="text-slate-300 mb-4">
              Create and manage campaigns, set campaign-specific voting rules, review project submissions,
              and configure distribution parameters.
            </p>
          </div>
          
          {/* Project Owners */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 hover:bg-slate-800/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Project Owners</h3>
            <p className="text-slate-300 mb-4">
              Submit innovative projects to campaigns, provide detailed information about their initiatives,
              and engage with the voting community to gain support.
            </p>
          </div>
          
          {/* Voters */}
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 hover:bg-slate-800/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-full flex items-center justify-center mb-4">
              <Vote className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Voters</h3>
            <p className="text-slate-300 mb-4">
              Use CELO tokens to support their favorite projects across multiple campaigns,
              directly influencing which initiatives receive funding.
            </p>
          </div>
        </div>
      </div>
      
      {/* Technical Section */}
      <div className="container mx-auto px-6 py-16 relative">
        {/* Background Wave Effect */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#84cc16" fillOpacity="1" d="M0,160L48,170.7C96,181,192,203,288,208C384,213,480,203,576,181.3C672,160,768,128,864,133.3C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Technical Implementation</h2>
            <p className="text-lime-100 max-w-2xl mx-auto">
              Built with robust blockchain technology to ensure security, transparency, and reliability.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-lime-600/20">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-3">Main Platform Contract</h3>
                  <p className="text-slate-300 text-sm">
                    Handles the platform fee, anti-spam mechanisms, manages campaign creation, and governs global parameters.
                  </p>
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-3">Campaign Contract</h3>
                  <p className="text-slate-300 text-sm">
                    Manages project submissions, approvals, voting logic, and handles fund distribution with quadratic or linear options.
                  </p>
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-3">Treasury Contract</h3>
                  <p className="text-slate-300 text-sm">
                    Securely holds funds during the campaign period and handles automated distribution to winning projects.
                  </p>
                </div>
              </div>
              
              <div className="p-6 bg-slate-700/30 border-t border-slate-700/50">
                <p className="text-slate-300 text-center">
                  Built on the <span className="text-lime-400">Celo</span> blockchain for low environmental impact and global accessibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Roadmap Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
            <Award className="h-8 w-8 text-lime-400 mr-3" />
            Roadmap
          </h2>
          <p className="text-lime-100 max-w-2xl mx-auto">
            Our journey to revolutionize community-driven funding is just beginning.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-lime-500 via-lime-400 to-lime-500 transform -translate-x-1/2 hidden md:block"></div>
            
            {/* Phase 1 */}
            <div className="mb-16 relative">
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-12 md:text-right">
                  <h3 className="text-2xl font-bold text-white mb-3">Phase 1: Foundation</h3>
                  <ul className="text-slate-300 space-y-2 md:ml-auto">
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Develop core smart contracts</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Create intuitive user interface</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Implement CELO integration</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Launch alpha testing with limited campaigns</span>
                    </li>
                  </ul>
                </div>
                
                <div className="hidden md:flex md:w-8 md:h-8 rounded-full bg-lime-500 absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                  <span className="text-slate-900 font-bold">1</span>
                </div>
                
                <div className="md:w-1/2 md:pl-12 md:hidden">
                  <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center shadow-lg mb-4">
                    <span className="text-slate-900 font-bold">1</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Phase 2 */}
            <div className="mb-16 relative">
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-12 order-1 md:order-2">
                  <h3 className="text-2xl font-bold text-white mb-3">Phase 2: Enhancement</h3>
                  <ul className="text-slate-300 space-y-2">
                    <li className="flex items-start">
                      <span className="text-lime-400 mr-2">•</span>
                      <span>Add advanced analytics for campaigns</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-lime-400 mr-2">•</span>
                      <span>Implement reputation system for creators</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-lime-400 mr-2">•</span>
                      <span>Develop templates for easier campaign creation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-lime-400 mr-2">•</span>
                      <span>Anti-spam measures with creation fees</span>
                    </li>
                  </ul>
                </div>
                
                <div className="hidden md:flex md:w-8 md:h-8 rounded-full bg-lime-400 absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                  <span className="text-slate-900 font-bold">2</span>
                </div>
                
                <div className="md:w-1/2 order-0 md:order-1 md:text-right md:hidden">
                  <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center shadow-lg mb-4">
                    <span className="text-slate-900 font-bold">2</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Phase 3 */}
            <div className="relative">
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-12 md:text-right">
                  <h3 className="text-2xl font-bold text-white mb-3">Phase 3: Expansion</h3>
                  <ul className="text-slate-300 space-y-2 md:ml-auto">
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Integration with additional blockchains</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Support for multiple voting tokens</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Launch governance token for platform decisions</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-lime-400 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Create cross-campaign funding opportunities</span>
                    </li>
                  </ul>
                </div>
                
                <div className="hidden md:flex md:w-8 md:h-8 rounded-full bg-lime-500 absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                  <span className="text-slate-900 font-bold">3</span>
                </div>
                
                <div className="md:w-1/2 md:pl-12 md:hidden">
                  <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center shadow-lg mb-4">
                    <span className="text-slate-900 font-bold">3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vision Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-lime-900/40 to-lime-800/40 backdrop-blur-md rounded-2xl p-8 border border-lime-500/30">
            <div className="flex items-center mb-6">
              <Waves className="h-7 w-7 text-lime-400 mr-3" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">Our Vision</h2>
            </div>
            
            <p className="text-slate-200 mb-6 leading-relaxed text-lg">
              "Sovereign Seas democratizes project funding through community voting, creating a transparent 
              ecosystem where the best ideas rise to the top through collective decision-making."
            </p>
            
            <p className="text-lime-100 leading-relaxed">
              Our vision is to create a global community of innovators and supporters, channeling resources directly to 
              impactful projects through the power of decentralized technology. By removing traditional 
              barriers to funding and enabling direct community participation, we're building a more equitable 
              future for project funding.
            </p>
          </div>
        </div>
      </div>
      
      {/* Team Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Our Team</h2>
          <p className="text-lime-100 max-w-2xl mx-auto">
            Passionate individuals dedicated to blockchain innovation and decentralized technologies.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 text-center border border-lime-600/20 transform hover:-translate-y-1 transition-all">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-lime-600 to-lime-500 mx-auto mb-4 flex items-center justify-center">
              <span className="text-slate-900 font-bold text-2xl">OG</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Oliseh Genesis</h3>
            <p className="text-lime-400 mb-3">Designer & Founder</p>
            <p className="text-slate-300 mb-4 text-sm">
              Creative visionary behind Sovereign Seas with a passion for combining blockchain and community governance.
            </p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 text-center border border-lime-600/20 transform hover:-translate-y-1 transition-all">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-lime-600 to-lime-500 mx-auto mb-4 flex items-center justify-center">
              <span className="text-slate-900 font-bold text-2xl">ST</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sam The Tutor</h3>
            <p className="text-lime-400 mb-3">Lead Developer</p>
            <p className="text-slate-300 mb-4 text-sm">
              Blockchain expert developing the secure, transparent infrastructure of Sovereign Seas.
            </p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 text-center border border-lime-600/20 transform hover:-translate-y-1 transition-all">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-lime-600 to-lime-500 mx-auto mb-4 flex items-center justify-center">
              <span className="text-slate-900 font-bold text-2xl">YU</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">You</h3>
            <p className="text-lime-400 mb-3">Community Member</p>
            <p className="text-slate-300 mb-4 text-sm">
              Become part of our vibrant ecosystem as a voter, project creator, or campaign admin.
            </p>
          </div>
        </div>
      </div>
      
      {/* Contact Section - Simplified without socials */}
      <div className="container mx-auto px-6 py-16">
      <div className="max-w-4xl mx-auto bg-slate-800/40 backdrop-blur-md rounded-xl p-8 border border-lime-600/20">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0">
              <h2 className="text-2xl font-bold text-white mb-4">Join Our Community</h2>
              <p className="text-slate-300 mb-6">
                Be part of our mission to revolutionize project funding through decentralized community action.
              </p>
              
              <div className="flex items-center">
                <Github className="h-5 w-5 text-lime-400 mr-3" />
                <span className="text-lime-300">GitHub repository coming soon</span>
              </div>
            </div>
            
            <div className="bg-slate-700/50 p-6 rounded-xl w-full md:w-auto">
              <h3 className="text-xl font-bold text-white mb-4">Development Updates</h3>
              <div className="flex items-start mb-4">
                <Info className="h-5 w-5 text-lime-400 mr-2 flex-shrink-0 mt-1" />
                <p className="text-slate-300 text-sm">
                  This platform is in active development. 
                  Subscribe to receive updates about new features and launch details.
                </p>
              </div>
              
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email address"
                  className="flex-grow px-4 py-2 rounded-l-lg bg-slate-600 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-lime-500"
                />
                <button className="px-4 py-2 rounded-r-lg bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-lime-900/40 to-lime-800/40 backdrop-blur-md rounded-2xl p-8 border border-lime-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to make an impact?</h2>
                <p className="text-lime-100">Join Sovereign Seas today and help fund innovative projects through decentralized voting.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all flex items-center"
                >
                  Start a Campaign <Waves className="ml-2 h-5 w-5" />
                </button>
                <button 
                  onClick={navigateToCampaigns}
                  className="px-6 py-3 rounded-full bg-transparent border border-lime-400 text-lime-400 font-semibold hover:bg-lime-500/10 transition-all flex items-center"
                >
                  Explore Campaigns <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
     
    </div>
  );
}