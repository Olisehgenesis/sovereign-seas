'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search,
  BookOpen,
  FileText,
  Code,
  Terminal,
  Settings,
  Users,
  Shield,
  Award,
  Globe,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Github,
  ExternalLink,
  Bookmark,
  Star,
  Eye,
  Plus,
  TrendingUp,
  Activity,
  Lock,
  Unlock,
  Network,
  Database,
  Bookmark as BookmarkFilled
} from 'lucide-react';

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

const docsSections = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of Sovereign Seas and how to get started',
    icon: BookOpen,
    items: [
      { title: 'Introduction', href: '/docs/introduction' },
      { title: 'Quick Start Guide', href: '/docs/quickstart' },
      { title: 'Installation', href: '/docs/installation' },
      { title: 'Basic Concepts', href: '/docs/concepts' }
    ]
  },
  {
    title: 'Core Features',
    description: 'Explore the main features and capabilities of the platform',
    icon: Code,
    items: [
      { title: 'Campaigns', href: '/docs/campaigns' },
      { title: 'Projects', href: '/docs/projects' },
      { title: 'Voting System', href: '/docs/voting' },
      { title: 'Token Integration', href: '/docs/tokens' }
    ]
  },
  {
    title: 'Technical Guide',
    description: 'Deep dive into the technical aspects and implementation details',
    icon: Terminal,
    items: [
      { title: 'Smart Contracts', href: '/docs/contracts' },
      { title: 'API Reference', href: '/docs/api' },
      { title: 'Security', href: '/docs/security' },
      { title: 'Best Practices', href: '/docs/best-practices' }
    ]
  },
  {
    title: 'Governance',
    description: 'Learn about the governance system and how to participate',
    icon: Users,
    items: [
      { title: 'Governance Overview', href: '/docs/governance' },
      { title: 'Voting Power', href: '/docs/voting-power' },
      { title: 'Proposals', href: '/docs/proposals' },
      { title: 'Delegation', href: '/docs/delegation' }
    ]
  }
];

export default function DocsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Documentation</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Comprehensive guides and documentation to help you build on Sovereign Seas
        </p>
      </motion.div>

      {/* Search Section */}
      <motion.div 
        className="mb-12"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </motion.div>

      {/* Documentation Sections */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {docsSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <motion.div
              key={section.title}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
              variants={fadeInUp}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <SectionIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-gray-600">{section.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      <span className="text-gray-700 group-hover:text-blue-600 transition-colors">{item.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </a>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Additional Resources */}
      <motion.div 
        className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="https://github.com/sovereign-seas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all group"
          >
            <Github className="h-6 w-6 text-gray-900" />
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">GitHub Repository</h3>
              <p className="text-sm text-gray-600">View source code and contribute</p>
            </div>
          </a>
          <a
            href="https://discord.gg/sovereign-seas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all group"
          >
            <Globe className="h-6 w-6 text-gray-900" />
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Community</h3>
              <p className="text-sm text-gray-600">Join our Discord community</p>
            </div>
          </a>
          <a
            href="https://blog.sovereign-seas.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all group"
          >
            <FileText className="h-6 w-6 text-gray-900" />
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Blog</h3>
              <p className="text-sm text-gray-600">Read our latest updates</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
} 