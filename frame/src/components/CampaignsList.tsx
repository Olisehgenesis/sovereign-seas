"use client";

import { useState } from "react";
import { useAllCampaigns } from "../hooks/useCampaignMethods";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { Button } from "./ui/Button";
import { CampaignDetails } from "../hooks/types";
import { formatIpfsUrl } from "../hooks/utils";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Users, 
  Clock, 
  Vote, 
  Flame,
  Pause,
  StopCircle,
  ChevronRight,
  Heart,
  Bookmark
} from "lucide-react";

interface CampaignsListProps {
  contractAddress: `0x${string}`;
  onCampaignSelect?: (campaignId: number) => void;
  viewMode?: 'list';
}

// Helper function to safely parse JSON
const safeJsonParse = (jsonString: string, fallback = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return fallback;
  }
};

// Helper function to parse campaign metadata
const parseCampaignMetadata = (campaignDetails: CampaignDetails) => {
  const { campaign, metadata } = campaignDetails;
  
  // Parse the metadata JSON strings
  const mainInfo = safeJsonParse(metadata.mainInfo);
  const additionalInfo = safeJsonParse(metadata.additionalInfo);
  
  // Combine all parsed metadata
  const parsedMetadata = {
    type: mainInfo.type || '',
    category: mainInfo.category || '',
    tags: mainInfo.tags || [],
    logo: mainInfo.logo || additionalInfo.logo || '',
    website: mainInfo.website || '',
    socialLinks: mainInfo.socialLinks || {},
    description: mainInfo.description || campaign.description || '',
    goals: mainInfo.goals || [],
    rewards: mainInfo.rewards || [],
    requirements: mainInfo.requirements || []
  };

  return {
    ...campaignDetails,
    metadata: parsedMetadata
  };
};

export default function CampaignsList({ contractAddress, onCampaignSelect, viewMode = 'list' }: CampaignsListProps) {
  const { campaigns, isLoading, error } = useAllCampaigns(contractAddress);

  console.log("Campaigns", campaigns);
  const [likedCampaigns, setLikedCampaigns] = useState<Set<number>>(new Set());
  const [bookmarkedCampaigns, setBookmarkedCampaigns] = useState<Set<number>>(new Set());

  const getCampaignStatus = (campaignDetails: CampaignDetails) => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(campaignDetails.campaign.startTime);
    const endTime = Number(campaignDetails.campaign.endTime);
    const isActive = campaignDetails.campaign.active;

    if (now >= endTime) return 'ended';
    if (!isActive) return 'paused';
    if (now < startTime) return 'upcoming';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Flame className="h-4 w-4 text-green-500" />;
      case 'upcoming':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'ended':
        return <StopCircle className="h-4 w-4 text-gray-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleLike = (campaignId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const handleBookmark = (campaignId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const handleShare = (campaign: Record<string, unknown>, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/campaign/${campaign.id}`;
    navigator.clipboard.writeText(url);
    // You could add a toast notification here
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading campaigns</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌊</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Campaigns Found</h3>
        <p className="text-blue-600">Be the first to create a campaign!</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {campaigns.map((campaignDetails, index) => {
          const enhancedCampaign = parseCampaignMetadata(campaignDetails);
          const { metadata } = enhancedCampaign;
          const status = getCampaignStatus(campaignDetails);
          
          console.log("Campaign Metadata", metadata);
          console.log("Campaign Logo URL", metadata.logo);
          
          return (
            <motion.div
              key={Number(enhancedCampaign.campaign.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => onCampaignSelect?.(Number(enhancedCampaign.campaign.id))}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/30 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-white/15 group"
            >
              <div className="flex items-center space-x-6">
                {/* Campaign Logo */}
                <div className="relative flex-shrink-0">
                  {metadata.logo ? (
                    <img 
                      src={formatIpfsUrl(metadata.logo)} 
                      alt={`${enhancedCampaign.campaign.name} logo`}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold border-2 border-white/30 ${metadata.logo ? 'hidden' : 'flex'}`}>
                    {enhancedCampaign.campaign.name?.charAt(0) || '🚀'}
                  </div>
                </div>

                {/* Campaign Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                        {enhancedCampaign.campaign.name || 'Untitled Campaign'}
                      </h3>
                      <p className="text-blue-600 text-sm line-clamp-2 mt-1">
                        {metadata.description || enhancedCampaign.campaign.description || 'No description available'}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)} ml-4`}>
                      {getStatusIcon(status)}
                      <span className="capitalize">{status}</span>
                    </div>
                  </div>

                  {/* Campaign Stats */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Coins className="h-4 w-4" />
                      <span>{parseFloat(formatEther(enhancedCampaign.campaign.totalFunds)).toFixed(1)} CELO</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{Number(enhancedCampaign.campaign.maxWinners)} Max Winners</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Target className="h-4 w-4" />
                      <span>{enhancedCampaign.campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleLike(Number(enhancedCampaign.campaign.id), e)}
                    className={`p-2 rounded-lg transition-colors ${
                      likedCampaigns.has(Number(enhancedCampaign.campaign.id))
                        ? 'text-red-500 bg-red-500/20'
                        : 'text-gray-600 hover:text-red-500 hover:bg-red-500/20'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedCampaigns.has(Number(enhancedCampaign.campaign.id)) ? 'fill-current' : ''}`} />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleBookmark(Number(enhancedCampaign.campaign.id), e)}
                    className={`p-2 rounded-lg transition-colors ${
                      bookmarkedCampaigns.has(Number(enhancedCampaign.campaign.id))
                        ? 'text-yellow-500 bg-yellow-500/20'
                        : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/20'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${bookmarkedCampaigns.has(Number(enhancedCampaign.campaign.id)) ? 'fill-current' : ''}`} />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleShare(enhancedCampaign.campaign, e)}
                    className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-500/20 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Grid View
  return (
    <div className="space-y-4">
      {campaigns.map((campaignDetails, index) => {
        const enhancedCampaign = parseCampaignMetadata(campaignDetails);
        const { metadata } = enhancedCampaign;
        const status = getCampaignStatus(campaignDetails);
        
        console.log("Campaign Metadata", metadata);
        console.log("Campaign Logo URL", metadata.logo);
        
        return (
          <motion.div
            key={Number(enhancedCampaign.campaign.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => onCampaignSelect?.(Number(enhancedCampaign.campaign.id))}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/30 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-white/15 group"
          >
            <div className="flex items-center space-x-6">
              {/* Campaign Logo */}
              <div className="relative flex-shrink-0">
                {metadata.logo ? (
                  <img 
                    src={formatIpfsUrl(metadata.logo)} 
                    alt={`${enhancedCampaign.campaign.name} logo`}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold border-2 border-white/30 ${metadata.logo ? 'hidden' : 'flex'}`}>
                  {enhancedCampaign.campaign.name?.charAt(0) || '🚀'}
                </div>
              </div>

              {/* Campaign Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {enhancedCampaign.campaign.name || 'Untitled Campaign'}
                    </h3>
                    <p className="text-blue-600 text-sm line-clamp-2 mt-1">
                      {metadata.description || enhancedCampaign.campaign.description || 'No description available'}
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)} ml-4`}>
                    {getStatusIcon(status)}
                    <span className="capitalize">{status}</span>
                  </div>
                </div>

                {/* Campaign Stats */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Coins className="h-4 w-4" />
                    <span>{parseFloat(formatEther(enhancedCampaign.campaign.totalFunds)).toFixed(1)} CELO</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{Number(enhancedCampaign.campaign.maxWinners)} Max Winners</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Target className="h-4 w-4" />
                    <span>{enhancedCampaign.campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleLike(Number(enhancedCampaign.campaign.id), e)}
                  className={`p-2 rounded-lg transition-colors ${
                    likedCampaigns.has(Number(enhancedCampaign.campaign.id))
                      ? 'text-red-500 bg-red-500/20'
                      : 'text-gray-600 hover:text-red-500 hover:bg-red-500/20'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${likedCampaigns.has(Number(enhancedCampaign.campaign.id)) ? 'fill-current' : ''}`} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleBookmark(Number(enhancedCampaign.campaign.id), e)}
                  className={`p-2 rounded-lg transition-colors ${
                    bookmarkedCampaigns.has(Number(enhancedCampaign.campaign.id))
                      ? 'text-yellow-500 bg-yellow-500/20'
                      : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/20'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${bookmarkedCampaigns.has(Number(enhancedCampaign.campaign.id)) ? 'fill-current' : ''}`} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleShare(enhancedCampaign.campaign, e)}
                  className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-500/20 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
} 