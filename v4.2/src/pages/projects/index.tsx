'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search,
  Filter,
  Code,
  Users,
  Calendar,
  MapPin,
  Tag,
  Star,
  Eye,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  Github,
  Globe,
  FileText,
  Share2,
  Bookmark,
  Shield,
  Copy,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Award,
  Target,
  Lightbulb,
  Globe2,
  Send,
  BadgeCheck,
  User,
  Terminal,
  X,
  Video,
  Play,
  Edit,
  Crown,
  Timer,
  Vote,
  Coins,
  Heart,
  BarChart3,
  Gauge,
  Clock,
  Rocket,
  Camera,
  Lock,
  Unlock,
  Network,
  Database,
  ChevronRight,
  Bookmark as BookmarkFilled,
  Trophy
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

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

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Get projects data
  const { projects, isLoading, error } = useAllProjects(CONTRACT_ADDRESS);

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
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load Projects</h2>
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Projects</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Explore innovative projects and support their development through governance campaigns
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
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="defi">DeFi</option>
              <option value="nft">NFT</option>
              <option value="dao">DAO</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="social">Social</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="popular">Most Popular</option>
              <option value="campaigns">Most Campaigns</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Projects Grid */}
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
        ) : projects && projects.length > 0 ? (
          projects.map((project) => (
            <motion.div
              key={project.project.id.toString()}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
              variants={fadeInUp}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{project.project.name}</h3>
                  <p className="text-gray-600 line-clamp-2">{project.project.description}</p>
                </div>
                {project.project.verified && (
                  <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4" />
                    Verified
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{project.project.teamSize || 'Unknown'} Team Size</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    <span>{project.project.campaignIds.length} Campaigns</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{project.project.location || 'Remote'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Tag className="h-4 w-4 mr-2" />
                    <span>{project.project.category || 'Uncategorized'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/explorer/project/${project.project.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
                {project.project.githubRepo && (
                  <a
                    href={project.project.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div 
            className="col-span-full text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200"
            variants={fadeInUp}
          >
            <Code className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">No Projects Found</h3>
            <p className="text-gray-600 mb-8 text-lg">Be the first to create a project</p>
            <motion.button
              onClick={() => navigate('/app/project/start')}
              className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Project
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 