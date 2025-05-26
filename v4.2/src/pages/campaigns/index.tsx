import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search,

  Trophy,

  Users,
  Coins,

  Award,
  Eye,
  Vote,
  Calendar,
 
  AlertTriangle
} from 'lucide-react';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Get campaigns data
  const { campaigns, isLoading, error } = useAllCampaigns(CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div 
          className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load Campaigns</h2>
            <p className="text-gray-600 mb-6">{error.message || 'Something went wrong'}</p>
            <motion.button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <motion.div 
        className="text-center mb-12"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Campaigns</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Discover and participate in governance campaigns to support innovative projects
        </p>
      </motion.div>

      {/* Search and Filter Section */}
      <motion.div 
        className="mb-8"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="funds">Most Funded</option>
              <option value="participants">Most Participants</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Campaigns Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded-lg"></div>
                <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
              </div>
            </div>
          ))
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <motion.div
              key={campaign.campaign.id.toString()}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
              variants={fadeInUp}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.campaign.name}</h3>
                  <p className="text-gray-600 line-clamp-2">{campaign.campaign.description}</p>
                </div>
                <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  {campaign.campaign.active ? 'Active' : 'Ended'}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Coins className="h-4 w-4 mr-2" />
                    <span>{formatEther(campaign.campaign.totalFunds)} CELO</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{Number(campaign.campaign.maxWinners)} Winners</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Ends {new Date(Number(campaign.campaign.endTime) * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Award className="h-4 w-4 mr-2" />
                    <span>{Number(campaign.campaign.adminFeePercentage)}% Fee</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/explorer/campaign/${campaign.campaign.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
                {campaign.campaign.active && (
                  <button
                    onClick={() => navigate(`/explorer/campaign/${campaign.campaign.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Vote className="h-4 w-4" />
                    Vote Now
                  </button>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div 
            className="col-span-full text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200"
            variants={fadeInUp}
          >
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">No Campaigns Found</h3>
            <p className="text-gray-600 mb-8 text-lg">Be the first to start a funding campaign</p>
            <motion.button
              onClick={() => navigate('/app/campaign/start')}
              className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Campaign
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 