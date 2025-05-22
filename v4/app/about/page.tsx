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
  Info,
  ChevronRight
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800 relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-2/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-sky-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
      </div>
      
      {/* Header Section */}
      <div className="relative overflow-hidden py-24">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            <div className="flex items-center mb-2 animate-float-delay-1">
              <div className="relative h-16 w-16 mr-3">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse-slow opacity-40"></div>
                <div className="absolute inset-0.5 rounded-full bg-white flex items-center justify-center">
                  <Image 
                    src="/logo.svg" 
                    alt="Sovereign Seas Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                About <span className="text-blue-700">Sovereign Seas</span>
              </h1>
            </div>
            
            <h2 className="text-xl md:text-2xl text-blue-600 max-w-3xl animate-float-delay-2">
              A decentralized voting platform where communities decide, and collective decisions drive impact.
            </h2>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <Globe className="h-7 w-7 text-blue-500 mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Overview</h2>
              </div>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                Sovereign Seas is a groundbreaking decentralized application built on the Celo blockchain, 
                designed to empower communities to fund and support innovative projects. 
                Our platform creates a transparent ecosystem where the best ideas rise to the top through 
                collective decision-making, with every vote contributing to real-world positive change.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                Through our unique voting and funding mechanism, we're democratizing project funding and 
                ensuring that resources flow to the most valued initiatives as determined by the community. 
                From open-source development to community-led research, Sovereign Seas enables direct support 
                for the projects that matter most.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Core Components Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Platform Features</span>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 flex items-center justify-center">
            <Coins className="h-8 w-8 text-blue-500 mr-3" />
            Core Components
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Sovereign Seas is built on a foundation of powerful, transparent systems that work together to create
            a fair and effective funding platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Voting Mechanism */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-t-4 border-blue-500 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <Vote className="h-6 w-6 text-blue-500 mr-2" />
                <h3 className="text-xl font-bold text-gray-800">Voting Mechanism</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>CELO token used as the voting medium</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Configurable vote multiplier (1-5x per token)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Transparent, on-chain voting for full auditability</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Economic Structure */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-t-4 border-blue-400 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-1">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-blue-400 mr-2" />
                <h3 className="text-xl font-bold text-gray-800">Economic Structure</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>15% platform fee for development and maintenance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Variable admin fee set by campaign creators</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Majority of funds distributed directly to projects</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Campaign Management */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-t-4 border-blue-500 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-500 mr-2" />
                <h3 className="text-xl font-bold text-gray-800">Campaign Management</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Create themed funding campaigns</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Submit and approve community projects</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Choose linear or quadratic fund distribution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* User Roles Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Ecosystem Participants</span>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            User Roles
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Sovereign Seas brings together different stakeholders, each with their own important role in the ecosystem.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Platform Administrators */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <LayoutDashboard className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Super Admins</h3>
              <p className="text-gray-600 mb-4">
                Manage the overall platform, handle disputes, and maintain system integrity to ensure a
                fair and functional ecosystem for all participants.
              </p>
            </div>
          </div>
          
          {/* Campaign Administrators */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-1">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Campaign Administrators</h3>
              <p className="text-gray-600 mb-4">
                Create and manage campaigns, set campaign-specific voting rules, review project submissions,
                and configure distribution parameters.
              </p>
            </div>
          </div>
          
          {/* Project Owners */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Project Owners</h3>
              <p className="text-gray-600 mb-4">
                Submit innovative projects to campaigns, provide detailed information about their initiatives,
                and engage with the voting community to gain support.
              </p>
            </div>
          </div>
          
          {/* Voters */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-3">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Vote className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Voters</h3>
              <p className="text-gray-600 mb-4">
                Use CELO tokens to support their favorite projects across multiple campaigns,
                directly influencing which initiatives receive funding.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Technical Section */}
      <div className="container mx-auto px-6 py-16 relative">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Architecture</span>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">Technical Implementation</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Built with robust blockchain technology to ensure security, transparency, and reliability.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-100 shadow-lg group hover:shadow-xl transition-all duration-300 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-blue-100">
                <div className="p-6 hover:bg-blue-50/50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Main Platform Contract</h3>
                  <p className="text-gray-600 text-sm">
                    Handles the platform fee, anti-spam mechanisms, manages campaign creation, and governs global parameters.
                  </p>
                </div>
                
                <div className="p-6 hover:bg-blue-50/50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Campaign Contract</h3>
                  <p className="text-gray-600 text-sm">
                    Manages project submissions, approvals, voting logic, and handles fund distribution with quadratic or linear options.
                  </p>
                </div>
                
                <div className="p-6 hover:bg-blue-50/50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Treasury Contract</h3>
                  <p className="text-gray-600 text-sm">
                    Securely holds funds during the campaign period and handles automated distribution to winning projects.
                  </p>
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
                <p className="text-gray-700 text-center">
                  Built on the <span className="text-blue-600 font-medium">Celo</span> blockchain for low environmental impact and global accessibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Roadmap Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Project Timeline</span>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 flex items-center justify-center">
            <Award className="h-8 w-8 text-blue-500 mr-3" />
            Roadmap
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our journey to revolutionize community-driven funding is just beginning.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-400 to-blue-500 transform -translate-x-1/2 hidden md:block"></div>
            
            {/* Phase 1 */}
            <div className="mb-16 relative">
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-12 md:text-right">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Phase 1: Foundation</h3>
                  <ul className="text-gray-600 space-y-2 md:ml-auto">
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Develop core smart contracts</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Create intuitive user interface</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Implement CELO integration</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Launch alpha testing with limited campaigns</span>
                    </li>
                  </ul>
                </div>
                
                <div className="hidden md:flex md:w-8 md:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">1</span>
                </div>
                
                <div className="md:w-1/2 md:pl-12 md:hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
                    <span className="text-white font-bold">1</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Phase 2 */}
            <div className="mb-16 relative">
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-12 order-1 md:order-2">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Phase 2: Enhancement</h3>
                  <ul className="text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Add advanced analytics for campaigns</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Implement reputation system for creators</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Develop templates for easier campaign creation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Anti-spam measures with creation fees</span>
                    </li>
                  </ul>
                </div>
                
                <div className="hidden md:flex md:w-8 md:h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">2</span>
                </div>
                
                <div className="md:w-1/2 order-0 md:order-1 md:text-right md:hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg mb-4">
                    <span className="text-white font-bold">2</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Phase 3 */}
            <div className="relative">
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-12 md:text-right">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Phase 3: Expansion</h3>
                  <ul className="text-gray-600 space-y-2 md:ml-auto">
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Integration with additional blockchains</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Support for multiple voting tokens</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Launch governance token for platform decisions</span>
                    </li>
                    <li className="flex items-start md:justify-end">
                      <span className="md:order-2 text-blue-500 mr-2 md:mr-0 md:ml-2">•</span>
                      <span>Create cross-campaign funding opportunities</span>
                    </li>
                  </ul>
                </div>
                
                <div className="hidden md:flex md:w-8 md:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">3</span>
                </div>
                
                <div className="md:w-1/2 md:pl-12 md:hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
                    <span className="text-white font-bold">3</span>
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
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm rounded-xl p-8 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <Waves className="h-7 w-7 text-blue-500 mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Our Vision</h2>
              </div>
              
              <p className="text-gray-800 mb-6 leading-relaxed text-lg font-medium">
                "Sovereign Seas democratizes project funding through community voting, creating a transparent 
                ecosystem where the best ideas rise to the top through collective decision-making."
              </p>
              
                              <p className="text-blue-700 leading-relaxed">
                Our vision is to create a global community of innovators and supporters, channeling resources directly to 
                impactful projects through the power of decentralized technology. By removing traditional 
                barriers to funding and enabling direct community participation, we're building a more equitable 
                future for project funding.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Team Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">The People</span>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">Our Team</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Passionate individuals dedicated to blockchain innovation and decentralized technologies.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 text-center border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-15 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500 shadow-lg">
                <span className="text-white font-bold text-2xl">OG</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Oliseh Genesis</h3>
              <p className="text-blue-600 mb-3">Designer & Founder</p>
              <p className="text-gray-600 mb-4 text-sm">
                Creative visionary behind Sovereign Seas with a passion for combining blockchain and community governance.
              </p>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 text-center border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-1">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-15 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500 shadow-lg">
                <span className="text-white font-bold text-2xl">ST</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Sam The Tutor</h3>
              <p className="text-blue-600 mb-3">Lead Developer</p>
              <p className="text-gray-600 mb-4 text-sm">
                Blockchain expert developing the secure, transparent infrastructure of Sovereign Seas.
              </p>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 text-center border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden animate-float-delay-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-15 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500 shadow-lg">
                <span className="text-white font-bold text-2xl">YU</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">You</h3>
              <p className="text-blue-600 mb-3">Community Member</p>
              <p className="text-gray-600 mb-4 text-sm">
                Become part of our vibrant ecosystem as a voter, project creator, or campaign admin.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Section - Simplified without socials */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-xl p-8 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-8 md:mb-0">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">Join Our Community</h2>
                <p className="text-gray-600 mb-6">
                  Be part of our mission to revolutionize project funding through decentralized community action.
                </p>
                
                <div className="flex items-center">
                  <Github className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-blue-600">GitHub repository coming soon</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl w-full md:w-auto shadow-md border border-blue-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Development Updates</h3>
                <div className="flex items-start mb-4">
                  <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-1" />
                  <p className="text-gray-600 text-sm">
                    This platform is in active development. 
                    Subscribe to receive updates about new features and launch details.
                  </p>
                </div>
                
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Your email address"
                    className="flex-grow px-4 py-2 rounded-l-lg bg-white border border-blue-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button className="px-4 py-2 rounded-r-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-blue-400/30 relative overflow-hidden group">
                    <span className="relative z-10">Subscribe</span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm rounded-xl p-8 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-15 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-6 md:mb-0 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">Ready to make an impact?</h2>
                  <p className="text-blue-600">Join Sovereign Seas today and help fund innovative projects through decentralized voting.</p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center md:justify-end">
                  <button 
                    onClick={navigateToCreateCampaign}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center shadow-sm border border-blue-400/30 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center">
                      Start a Campaign <Waves className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    </span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                  <button 
                    onClick={navigateToCampaigns}
                    className="px-6 py-3 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:bg-blue-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center">
                      Explore Campaigns <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      
    </div>
  );
}