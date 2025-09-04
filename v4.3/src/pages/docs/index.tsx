// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, Coins, TrendingUp, Shield, ArrowRight, CheckCircle, Clock, Target, 
  Calculator, DollarSign, Zap, PieChart, BookOpen, Users, Rocket, Settings,
  FileText, Award, Globe, Heart, Star, GitBranch, Calendar, Wallet,
  ChevronRight, ChevronLeft, Home, Search, Bookmark, Share2
} from 'lucide-react';

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

const floatingAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const colorMap = {
  blue: "from-blue-100 to-blue-200",
  purple: "from-purple-100 to-purple-200", 
  green: "from-green-100 to-green-200",
  orange: "from-orange-100 to-orange-200",
  pink: "from-pink-100 to-pink-200"
} as const;

type ColorType = keyof typeof colorMap;

interface Chapter {
  id: string;
  title: string;
  icon: any;
  color: ColorType;
  sections: Section[];
}

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function SovereignSeasGuide() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeChapter, setActiveChapter] = useState('about');
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [calculatorInput, setCalculatorInput] = useState(100);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const chapters: Chapter[] = [
    {
      id: 'about',
      title: 'About Sovereign Seas',
      icon: Globe,
      color: 'blue',
      sections: [
        {
          id: 'overview',
          title: 'Project Overview',
          content: (
            <div className="space-y-6">
              <motion.div 
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8"
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div 
                    className="p-4 bg-blue-500 rounded-2xl"
                    animate={floatingAnimation}
                  >
                    <Globe className="h-8 w-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">What is Sovereign Seas?</h3>
                    <p className="text-gray-600">A decentralized funding platform for community-driven projects</p>
                  </div>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Sovereign Seas is a revolutionary platform that empowers communities to fund and support projects 
                  through transparent, democratic voting mechanisms. Built on the CELO blockchain, it combines 
                  token-weighted voting with quadratic distribution to ensure fair and inclusive funding decisions.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Heart,
                    title: "Community-Driven",
                    description: "Projects are funded by the community, for the community",
                    color: "text-red-500"
                  },
                  {
                    icon: Shield,
                    title: "Transparent",
                    description: "All votes and distributions are recorded on-chain",
                    color: "text-green-500"
                  },
                  {
                    icon: Rocket,
                    title: "Innovative",
                    description: "Quadratic funding ensures fair distribution",
                    color: "text-purple-500"
                  }
                ].map((feature, index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <motion.div
                      key={index}
                      className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
                      variants={fadeInUp}
                      whileHover={{ y: -5 }}
                    >
                      <FeatureIcon className={`h-8 w-8 mb-4 ${feature.color}`} />
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h4>
                      <p className="text-gray-600">{feature.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        },
        {
          id: 'features',
          title: 'Key Features',
          content: (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[
                  {
                    icon: Vote,
                    title: "Token-Weighted Voting",
                    description: "Vote with CELO or supported stablecoins. Your voting power equals the value of tokens you contribute.",
                    features: ["1 CELO = 1 vote weight", "Support for cUSD and other tokens", "Multiple voting rounds", "Real-time vote tracking"]
                  },
                  {
                    icon: Calculator,
                    title: "Quadratic Distribution",
                    description: "Fair funding that amplifies smaller contributions and prevents whale dominance.",
                    features: ["Square-root vote weighting", "Encourages broad participation", "Prevents large holder dominance", "More unique voters = higher weight"]
                  },
                  {
                    icon: Shield,
                    title: "Smart Contract Security",
                    description: "Built with security-first principles and comprehensive safety measures.",
                    features: ["ReentrancyGuard protection", "SafeERC20 transfers", "Multi-signature admin controls", "Emergency recovery functions"]
                  },
                  {
                    icon: Users,
                    title: "Community Governance",
                    description: "Decentralized decision-making with transparent processes and community oversight.",
                    features: ["Campaign admin controls", "Project approval workflows", "Community voting periods", "Transparent fund distribution"]
                  }
                ].map((feature, index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <motion.div
                      key={index}
                      className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                      variants={fadeInUp}
                      whileHover={{ y: -5, rotateX: 5 }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <FeatureIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">{feature.title}</h4>
                      </div>
                      <p className="text-gray-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.features.map((item, itemIndex) => (
                          <motion.li 
                            key={itemIndex}
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.1 }}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'projects',
      title: 'Adding Projects',
      icon: Rocket,
      color: 'green',
      sections: [
        {
          id: 'project-setup',
          title: 'How to Add a Project',
          content: (
            <div className="space-y-8">
              <motion.div 
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8"
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div 
                    className="p-4 bg-green-500 rounded-2xl"
                    animate={floatingAnimation}
                  >
                    <Rocket className="h-8 w-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Getting Started with Projects</h3>
                    <p className="text-gray-600">Learn how to create and submit your project for community funding</p>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-6">
                {[
                  {
                    step: "01",
                    title: "Project Preparation",
                    description: "Before submitting your project, ensure you have all the necessary information ready.",
                    details: [
                      "Clear project description and goals",
                      "Detailed budget breakdown",
                      "Timeline and milestones",
                      "Team information and credentials",
                      "Expected impact and outcomes"
                    ]
                  },
                  {
                    step: "02",
                    title: "Create Project Profile",
                    description: "Navigate to the project creation page and fill out the required information.",
                    details: [
                      "Project name and tagline",
                      "Category and tags for discovery",
                      "High-quality project images",
                      "Social media links and website",
                      "Wallet address for receiving funds"
                    ]
                  },
                  {
                    step: "03",
                    title: "Submit for Review",
                    description: "Submit your project for community review and approval.",
                    details: [
                      "Review all information for accuracy",
                      "Submit to the platform",
                      "Wait for admin approval",
                      "Address any feedback or questions",
                      "Get notified of approval status"
                    ]
                  },
                  {
                    step: "04",
                    title: "Join Campaigns",
                    description: "Once approved, your project can participate in funding campaigns.",
                    details: [
                      "Browse active campaigns",
                      "Submit project to relevant campaigns",
                      "Set funding goals and milestones",
                      "Engage with the community",
                      "Promote your project to voters"
                    ]
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
                    variants={fadeInUp}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start gap-6">
                      <motion.div 
                        className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.3 }}
                      >
                        {step.step}
                      </motion.div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h4>
                        <p className="text-gray-600 mb-4">{step.description}</p>
                        <ul className="space-y-2">
                          {step.details.map((detail, detailIndex) => (
                            <motion.li 
                              key={detailIndex}
                              className="flex items-center gap-3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: detailIndex * 0.1 }}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-gray-700">{detail}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        },
        {
          id: 'project-requirements',
          title: 'Project Requirements',
          content: (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Important Requirements
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-semibold text-yellow-800 mb-3">Mandatory Information</h5>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Valid wallet address
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Clear project description
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Realistic funding goals
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Team member information
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-yellow-800 mb-3">Best Practices</h5>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        High-quality project images
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Detailed milestone breakdown
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Community engagement plan
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Regular progress updates
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'campaigns',
      title: 'Campaign Management',
      icon: Target,
      color: 'purple',
      sections: [
        {
          id: 'campaign-creation',
          title: 'Creating Campaigns',
          content: (
            <div className="space-y-8">
              <motion.div 
                className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8"
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div 
                    className="p-4 bg-purple-500 rounded-2xl"
                    animate={floatingAnimation}
                  >
                    <Target className="h-8 w-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Campaign Creation Guide</h3>
                    <p className="text-gray-600">Learn how to create and manage funding campaigns</p>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-xl font-bold text-gray-900">Campaign Setup Process</h4>
                  {[
                    {
                      title: "Define Campaign Scope",
                      description: "Set clear objectives, funding pool, and eligibility criteria",
                      icon: Settings
                    },
                    {
                      title: "Configure Parameters",
                      description: "Set voting period, minimum/maximum contributions, and payout tokens",
                      icon: Calculator
                    },
                    {
                      title: "Add Projects",
                      description: "Select and approve projects that meet campaign criteria",
                      icon: Rocket
                    },
                    {
                      title: "Launch Campaign",
                      description: "Activate voting and begin community participation",
                      icon: Zap
                    }
                  ].map((item, index) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={index}
                        className="bg-white rounded-xl p-4 border border-gray-200"
                        variants={fadeInUp}
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex items-center gap-3">
                          <ItemIcon className="h-5 w-5 text-purple-600" />
                          <div>
                            <h5 className="font-semibold text-gray-900">{item.title}</h5>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Campaign Parameters</h4>
                  <div className="space-y-4">
                    {[
                      { label: "Voting Period", value: "7-30 days", icon: Clock },
                      { label: "Funding Pool", value: "Configurable", icon: DollarSign },
                      { label: "Min Contribution", value: "0.1 CELO", icon: Coins },
                      { label: "Max Contribution", value: "No limit", icon: TrendingUp },
                      { label: "Payout Token", value: "CELO/cUSD", icon: Wallet }
                    ].map((param, index) => {
                      const ParamIcon = param.icon;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <ParamIcon className="h-5 w-5 text-purple-600" />
                            <span className="font-medium text-gray-900">{param.label}</span>
                          </div>
                          <span className="text-gray-600">{param.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'voting',
      title: 'Voting System',
      icon: Vote,
      color: 'orange',
      sections: [
        {
          id: 'voting-mechanics',
          title: 'How Voting Works',
          content: (
            <div className="space-y-8">
              <motion.div 
                className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8"
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div 
                    className="p-4 bg-orange-500 rounded-2xl"
                    animate={floatingAnimation}
                  >
                    <Vote className="h-8 w-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Voting Mechanics</h3>
                    <p className="text-gray-600">Understanding the token-weighted voting system with quadratic distribution</p>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-xl font-bold text-gray-900">Voting Process</h4>
                  {[
                    {
                      title: "Browse Active Campaigns",
                      description: "Explore live campaigns and discover projects you want to support",
                      icon: Target
                    },
                    {
                      title: "Choose Your Token",
                      description: "Vote with CELO or supported stablecoins like cUSD",
                      icon: Coins
                    },
                    {
                      title: "Cast Your Vote",
                      description: "Send tokens directly to your favorite projects",
                      icon: Vote
                    },
                    {
                      title: "Watch the Impact",
                      description: "See how your vote affects project rankings and funding distribution",
                      icon: TrendingUp
                    }
                  ].map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <motion.div
                        key={index}
                        className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
                        variants={fadeInUp}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-orange-100 rounded-xl">
                            <StepIcon className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">{step.title}</h5>
                            <p className="text-gray-600 text-sm">{step.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-6">Interactive Calculator</h4>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Vote Amount (CELO)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={calculatorInput}
                        onChange={(e) => setCalculatorInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="1"
                        max="10000"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Linear Weight:</span>
                      <span className="font-bold text-lg">{calculatorInput}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                      <span className="text-orange-800">Quadratic Weight:</span>
                      <motion.span 
                        className="font-bold text-lg text-orange-600"
                        key={calculatorInput}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {Math.sqrt(calculatorInput).toFixed(2)}
                      </motion.span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-orange-100 rounded-xl">
                    <h5 className="font-semibold text-orange-800 mb-2">Why Quadratic?</h5>
                    <p className="text-sm text-orange-700">
                      Square root function ensures smaller contributors have proportionally more influence, 
                      promoting fairness and preventing whale dominance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      ]
    }
  ];

  const currentChapter = chapters.find(ch => ch.id === activeChapter);
  const currentSection = currentChapter?.sections.find(sec => sec.id === activeSection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex">
        {/* Sidebar Navigation */}
        <motion.div 
          className={`bg-white/90 backdrop-blur-sm border-r border-gray-200 h-screen sticky top-0 overflow-y-auto ${
            sidebarOpen ? 'w-80' : 'w-20'
          } transition-all duration-300`}
          initial={{ x: -100 }}
          animate={{ x: 0 }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <motion.div 
                className="flex items-center gap-3"
                animate={floatingAnimation}
              >
                <BookOpen className="h-8 w-8 text-blue-600" />
                {sidebarOpen && (
                  <span className="text-xl font-bold text-gray-900">Sovereign Seas</span>
                )}
              </motion.div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            </div>

            <nav className="space-y-2">
              {chapters.map((chapter) => {
                const ChapterIcon = chapter.icon;
                const isActive = activeChapter === chapter.id;
                
                return (
                  <div key={chapter.id}>
                    <button
                      onClick={() => {
                        setActiveChapter(chapter.id);
                        setActiveSection(chapter.sections[0].id);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <ChapterIcon className={`h-5 w-5 flex-shrink-0 ${
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                      {sidebarOpen && (
                        <span className="font-medium">{chapter.title}</span>
                      )}
                    </button>
                    
                    {isActive && sidebarOpen && (
                      <motion.div 
                        className="ml-8 mt-2 space-y-1"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {chapter.sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full text-left p-2 rounded-lg transition-colors ${
                              activeSection === section.id
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            {section.title}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {/* Header */}
            <motion.div 
              className="mb-8"
              initial="initial"
              animate="animate"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-4 mb-4">
                <motion.div 
                  className="p-3 bg-blue-100 rounded-xl"
                  animate={floatingAnimation}
                >
                  {currentChapter && <currentChapter.icon className="h-6 w-6 text-blue-600" />}
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {currentChapter?.title}
                  </h1>
                  <p className="text-gray-600">
                    {currentSection?.title}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              key={`${activeChapter}-${activeSection}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {currentSection?.content}
            </motion.div>

            {/* Navigation Footer */}
            <motion.div 
              className="mt-12 pt-8 border-t border-gray-200"
              initial="initial"
              animate="animate"
              variants={fadeInUp}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <Share2 className="h-4 w-4" />
                    Share Guide
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <Bookmark className="h-4 w-4" />
                    Bookmark
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Sovereign Seas Documentation</span>
                  <span>•</span>
                  <span>v4.2</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}