'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Github,
  Globe,
  FileText,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Share2,
  Bookmark,
  Users,
  Trophy,
  Zap,
  Shield,
  Copy,
  Maximize,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Sparkles,
  Award,
  Target,
  Lightbulb,
  Building,
  ChevronDown,
  ChevronUp,
  Globe2,
  Send,
  BadgeCheck,
  User,
  Terminal,
  X,
  Star,
  Code,
  Video,
  Play,
  TrendingUp,
  Settings,
  Edit,
  DollarSign,
  Clock,
  Heart,
  Gift,
  BarChart
} from 'lucide-react';
import { useCampaignDetails } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { Campaign, CampaignType, CampaignStatus, CampaignVisibility } from '@/hooks/types';
import { CampaignDetails } from '@/hooks/useCampaignMethods';

export default function CampaignView() {
  const router = useRouter();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Campaign data state
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignMetadata, setCampaignMetadata] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // UI State
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    goals: false,
    technical: false
  });
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;
  
  // Convert string id to bigint
  const campaignId = id ? BigInt(id as string) : BigInt(0);
  
  // Use the proper hook to get campaign details
  const {
    campaignDetails,
    isLoading,
    error,
    refetch
  } = useCampaignDetails(contractAddress as Address, campaignId);
  
  useEffect(() => {
    setIsMounted(true);
    console.log('Campaign ID:', campaignId);
    console.log('Contract Address:', contractAddress);
  }, []);

  useEffect(() => {
    console.log('Campaign Details:', campaignDetails);
    console.log('Loading State:', isLoading);
    console.log('Error State:', error);
    
    if (campaignDetails) {
      console.log('Setting campaign data:', campaignDetails);
      
      // Transform contract data into our frontend Campaign type
      const transformedCampaign: Campaign = {
        id: campaignDetails.campaign.id.toString(),
        name: campaignDetails.campaign.name,
        tagline: campaignDetails.metadata?.mainInfo ? JSON.parse(campaignDetails.metadata.mainInfo).tagline || '' : '',
        description: campaignDetails.campaign.description,
        type: (campaignDetails.metadata?.mainInfo ? JSON.parse(campaignDetails.metadata.mainInfo).type : 'fundraising') as CampaignType,
        status: (campaignDetails.campaign.active ? 'active' : 'paused') as CampaignStatus,
        visibility: 'public' as CampaignVisibility,
        startDate: new Date(Number(campaignDetails.campaign.startTime) * 1000).toISOString(),
        endDate: new Date(Number(campaignDetails.campaign.endTime) * 1000).toISOString(),
        media: {
          banner: campaignDetails.metadata?.mainInfo ? JSON.parse(campaignDetails.metadata.mainInfo).bannerImage || '' : '',
          thumbnail: campaignDetails.metadata?.mainInfo ? JSON.parse(campaignDetails.metadata.mainInfo).logo || '' : '',
          gallery: [],
          video: ''
        },
        links: {
          website: '',
          socialMedia: {
            twitter: '',
            discord: '',
            telegram: '',
            linkedin: ''
          },
          documentation: '',
          resources: []
        },
        goals: campaignDetails.metadata?.mainInfo ? JSON.parse(campaignDetails.metadata.mainInfo).goals || [] : [],
        targetAmount: Number(formatEther(campaignDetails.campaign.totalFunds)),
        raisedAmount: 0, // This would need to be calculated from contract
        currency: 'CELO',
        milestones: [],
        projectId: '',
        projectName: '',
        teamMembers: [],
        contactEmail: '',
        tags: campaignDetails.metadata?.mainInfo ? JSON.parse(campaignDetails.metadata.mainInfo).tags || [] : [],
        location: '',
        requirements: [],
        benefits: [],
        risks: [],
        metrics: {
          views: 0,
          contributors: 0,
          engagement: 0,
          conversionRate: 0
        }
      };
      
      setCampaign(transformedCampaign);
      
      // Parse metadata if available
      try {
        if (campaignDetails.metadata.mainInfo) {
          const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
          setCampaignMetadata(mainInfo);
        }
      } catch (e) {
        console.warn('Failed to parse campaign metadata:', e);
      }
    }
  }, [campaignDetails, isLoading, error]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    console.log('Toggling section:', section);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderMetadataField = (label: string, value: any, icon = null) => {
    console.log('Rendering metadata field:', { label, value, icon });
    if (!value) return null;
    
    return (
      <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0" key={label}>
        {icon && <div className="text-blue-500 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <dt className="text-sm font-medium text-gray-600">{label}</dt>
          <dd className="text-gray-800 mt-1">
            {typeof value === 'string' && (value.startsWith('http') || value.startsWith('https')) ? (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span className="truncate">{value}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            ) : Array.isArray(value) ? (
              <div className="flex flex-wrap gap-1">
                {value.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <span>{value}</span>
            )}
          </dd>
        </div>
      </div>
    );
  };
  
  // Helper function to format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: campaign?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  if (!isMounted) {
    console.log('Component not mounted yet');
    return null;
  }
  
  // Loading state
  if (isLoading) {
    console.log('Loading campaign data...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
            <Sparkles className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-lg text-blue-600 font-medium">Loading campaign...</p>
        </div>
      </div>
    );
  }
  
  // Error state or campaign not found
  if (error || !campaign) {
    console.log('Error or campaign not found:', { error, campaign });
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error ? `Error loading campaign: ${error.message}` : 'The campaign you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Browse All Campaigns
          </button>
        </div>
      </div>
    );
  }
  
  console.log('Rendering campaign view with data:', {
    campaign,
    expandedSections,
    isBookmarked,
    showAllFeatures,
    showAllTeam,
    showShareModal
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-pulse blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-pulse blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-pulse blur-2xl"></div>
      </div>
      
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative">
          {/* Cover Image with gradient overlay */}
          {campaign.media?.banner && (
            <div className="h-80 md:h-96 relative overflow-hidden">
              <img
                src={campaign.media.banner}
                alt={`${campaign.name} cover`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-800/40 to-transparent"></div>
            </div>
          )}
          
          {/* Navigation */}
          <div className={`absolute top-6 left-6 z-20 ${!campaign.media?.banner ? 'relative bg-transparent pt-6' : ''}`}>
            <button
              onClick={() => router.push('/campaigns')}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-blue-700 hover:text-blue-800 rounded-full transition-all hover:bg-white shadow-lg hover:-translate-y-1 premium-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </button>
          </div>
          
          {/* Campaign Header */}
          <div className={`${campaign.media?.banner ? 'absolute bottom-0 left-0 right-0' : 'relative pt-4'} px-6 md:px-12 pb-8`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
                {/* Campaign Logo */}
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white shadow-xl overflow-hidden border-4 border-white/90 backdrop-blur-sm">
                    {campaign.media?.thumbnail ? (
                      <img
                        src={campaign.media.thumbnail}
                        alt={`${campaign.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Trophy className="h-8 w-8 md:h-12 md:w-12 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Campaign Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                      {campaign.type}
                    </span>
                    {campaign.tags?.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full border border-gray-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-3 ${campaign.media?.banner ? 'text-white' : 'text-gray-800'}`}>
                    {campaign.name}
                  </h1>
                  
                  {/* Campaign Meta Info */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className={`h-5 w-5 ${campaign.media?.banner ? 'text-white/80' : 'text-blue-500'}`} />
                      <span className={`${campaign.media?.banner ? 'text-white/80' : 'text-gray-600'}`}>
                        {campaign.startDate && new Date(campaign.startDate).toLocaleDateString()} - {campaign.endDate && new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className={`h-5 w-5 ${campaign.media?.banner ? 'text-white/80' : 'text-blue-500'}`} />
                      <span className={`${campaign.media?.banner ? 'text-white/80' : 'text-gray-600'}`}>
                        {campaign.targetAmount && formatCurrency(campaign.targetAmount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Users className={`h-5 w-5 ${campaign.media?.banner ? 'text-white/80' : 'text-blue-500'}`} />
                      <span className={`${campaign.media?.banner ? 'text-white/80' : 'text-gray-600'}`}>
                        {campaign.teamMembers?.length || 0} Team Members
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100 water-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileText className="h-6 w-6 text-blue-500 mr-3" />
                    About This Campaign
                  </h2>
                  <button
                    onClick={() => toggleSection('description')}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    {expandedSections.description ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className={`prose prose-blue max-w-none ${!expandedSections.description && 'line-clamp-3'}`}>
                  {campaign.description}
                </div>
              </div>
              
              {/* Goals */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100 water-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Target className="h-6 w-6 text-blue-500 mr-3" />
                    Campaign Goals
                  </h2>
                  <button
                    onClick={() => toggleSection('goals')}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    {expandedSections.goals ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="space-y-4">
                  {campaign.goals?.map((goal, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-gray-700">{goal}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Milestones */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100 water-card">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-6">
                  <Award className="h-6 w-6 text-blue-500 mr-3" />
                  Campaign Milestones
                </h2>
                
                <div className="space-y-6">
                  {campaign.milestones?.map((milestone, index) => (
                    <div key={index} className="relative pl-8 pb-8 last:pb-0">
                      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{index + 1}</span>
                      </div>
                      <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-blue-100 last:hidden"></div>
                      
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{milestone.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            milestone.status === 'delayed' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {milestone.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{milestone.description}</p>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </div>
                        
                        {milestone.deliverables && milestone.deliverables.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Deliverables:</h4>
                            <ul className="space-y-1">
                              {milestone.deliverables.map((deliverable, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-600">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                  {deliverable}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Campaign Info */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 water-card">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
                  Campaign Info
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-semibold ${
                      campaign.status === 'active' ? 'text-green-600' :
                      campaign.status === 'paused' ? 'text-orange-600' :
                      campaign.status === 'completed' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Target Amount</span>
                    <span className="font-semibold text-gray-800">
                      {campaign.targetAmount && formatCurrency(campaign.targetAmount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Raised Amount</span>
                    <span className="font-semibold text-green-600">
                      {campaign.raisedAmount && formatCurrency(campaign.raisedAmount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-800">
                      {Math.round((Number(campaign.raisedAmount) / Number(campaign.targetAmount)) * 100)}%
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((Number(campaign.raisedAmount) / Number(campaign.targetAmount)) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Quick Links */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 water-card">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Quick Links
                </h3>
                
                <div className="space-y-3">
                  {campaign.links?.website && (
                    <a
                      href={campaign.links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <Globe className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium">Website</span>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  )}
                  
                  {campaign.links?.documentation && (
                    <a
                      href={campaign.links.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <FileText className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium">Documentation</span>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  )}
                </div>
              </div>
              
              {/* Social Links */}
              {(campaign.links?.socialMedia?.twitter || campaign.links?.socialMedia?.discord || campaign.links?.socialMedia?.telegram || campaign.links?.socialMedia?.linkedin) && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 water-card">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Globe2 className="h-5 w-5 text-blue-500 mr-2" />
                    Community & Social
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {campaign.links?.socialMedia?.twitter && (
                      <a
                        href={campaign.links.socialMedia.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <Twitter className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">Twitter</span>
                      </a>
                    )}
                    
                    {campaign.links?.socialMedia?.linkedin && (
                      <a
                        href={campaign.links.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">LinkedIn</span>
                      </a>
                    )}
                    
                    {campaign.links?.socialMedia?.discord && (
                      <a
                        href={campaign.links.socialMedia.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <MessageCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">Discord</span>
                      </a>
                    )}
                    
                    {campaign.links?.socialMedia?.telegram && (
                      <a
                        href={campaign.links.socialMedia.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <Send className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">Telegram</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Team Members */}
              {campaign.teamMembers && campaign.teamMembers.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 water-card">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                    Team Members
                  </h3>
                  
                  <div className="space-y-4">
                    {campaign.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{member.name}</h4>
                          <p className="text-sm text-gray-600">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 