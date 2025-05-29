import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote,

  Coins,
  TrendingUp,

  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  Target,
  Calculator,
  DollarSign,
  Zap,
  PieChart
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
  green: "from-green-100 to-green-200"
} as const;

type ColorType = keyof typeof colorMap;

export default function VotingDocsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [calculatorInput, setCalculatorInput] = useState(100);

  useEffect(() => {
    setIsMounted(true);
    // Auto-cycle through steps
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!isMounted) {
    return null;
  }

  const votingSteps = [
    {
      title: "Browse Active Campaigns",
      description: "Explore live campaigns and discover projects you want to support",
      icon: Target,
      detail: "Each campaign has a specific time window for voting. Projects must be approved by campaign admins before they can receive votes."
    },
    {
      title: "Choose Your Token",
      description: "Vote with CELO or supported stablecoins like cUSD",
      icon: Coins,
      detail: "All tokens are converted to CELO equivalent for fair comparison. You can mix different tokens in your votes."
    },
    {
      title: "Cast Your Vote",
      description: "Send tokens directly to your favorite projects",
      icon: Vote,
      detail: "Your tokens become your vote weight. The more you contribute, the stronger your voice in the community."
    },
    {
      title: "Watch the Impact",
      description: "See how your vote affects project rankings and funding distribution",
      icon: TrendingUp,
      detail: "Projects are ranked by total vote weight. Winners are determined when the campaign ends."
    }
  ];

  const votingMechanics = [
    {
      title: "Token-Weighted Voting",
      description: "Your voting power equals the value of tokens you contribute",
      icon: Coins,
      color: "blue" as ColorType,
      features: [
        "1 CELO = 1 vote weight",
        "Other tokens converted to CELO equivalent",
        "Vote multiple times with different tokens",
        "All contributions count toward project ranking"
      ]
    },
    {
      title: "Quadratic Distribution",
      description: "Fair funding that amplifies smaller contributions",
      icon: Calculator,
      color: "purple" as ColorType,
      features: [
        "Vote amounts are square-rooted before distribution",
        "Prevents large holders from dominating",
        "Encourages broader community participation",
        "More unique voters = higher project weight"
      ]
    },
    {
      title: "Transparent Process",
      description: "All votes and distributions happen on-chain",
      icon: Shield,
      color: "green" as ColorType,
      features: [
        "Every vote is publicly recorded",
        "Smart contracts handle fund distribution",
        "No middlemen or centralized control",
        "Automatic payout to project owners"
      ]
    }
  ];

  // Calculate quadratic weights for demonstration
  const calculateQuadratic = (votes: number) => Math.sqrt(votes);
  const sampleVotes = [
    { name: "Project Alpha", votes: 100, color: "bg-blue-500" },
    { name: "Project Beta", votes: 64, color: "bg-purple-500" },
    { name: "Project Gamma", votes: 36, color: "bg-green-500" },
    { name: "Project Delta", votes: 16, color: "bg-orange-500" }
  ];

  const totalLinear = sampleVotes.reduce((sum, p) => sum + p.votes, 0);
  const totalQuadratic = sampleVotes.reduce((sum, p) => sum + calculateQuadratic(p.votes), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <motion.div 
            className="inline-flex items-center gap-3 bg-blue-100 text-blue-700 px-6 py-3 rounded-full mb-6"
            animate={floatingAnimation}
          >
            <Vote className="h-5 w-5" />
            <span className="font-semibold">Community Voting Guide</span>
          </motion.div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            How Community Voting Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Sovereign Seas uses a token-weighted voting system where your contributions directly support projects and determine funding distribution through quadratic mathematics.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {[
            { label: "Active Campaigns", value: "Live", icon: Clock, color: "text-blue-600" },
            { label: "Community Projects", value: "Many", icon: Target, color: "text-purple-600" },
            { label: "Voting Tokens", value: "CELO + More", icon: Coins, color: "text-green-600" },
            { label: "Distribution", value: "Quadratic", icon: Calculator, color: "text-orange-600" }
          ].map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-gray-200 hover:shadow-lg transition-all duration-300"
                variants={fadeInUp}
                whileHover={{ y: -5, scale: 1.02 }}
                animate={{ 
                  boxShadow: index === activeStep % 4 ? "0 20px 25px -5px rgba(0, 0, 0, 0.1)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)" 
                }}
              >
                <motion.div
                  animate={{ 
                    rotate: index === activeStep % 4 ? 360 : 0,
                    scale: index === activeStep % 4 ? 1.1 : 1
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <StatIcon className={`h-8 w-8 mx-auto mb-3 ${stat.color}`} />
                </motion.div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* How It Works - Step by Step */}
        <motion.div 
          className="mb-16"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How to Vote in 4 Simple Steps
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {votingSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = activeStep === index;
              return (
                <motion.div
                  key={index}
                  className={`bg-white/70 backdrop-blur-sm rounded-2xl p-8 border-2 cursor-pointer transition-all duration-300 ${
                    isActive 
                      ? 'border-blue-500 shadow-xl' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                  }`}
                  onClick={() => setActiveStep(index)}
                  whileHover={{ y: -2 }}
                  animate={{ 
                    scale: isActive ? 1.02 : 1,
                    rotateY: isActive ? [0, 5, 0] : 0
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className={`p-4 rounded-2xl flex-shrink-0 ${
                        isActive ? 'bg-blue-500' : 'bg-blue-100'
                      }`}
                      animate={{ 
                        rotate: isActive ? [0, 360] : 0,
                        scale: isActive ? [1, 1.1, 1] : 1
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      <StepIcon className={`h-6 w-6 ${
                        isActive ? 'text-white' : 'text-blue-600'
                      }`} />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <motion.span 
                          className="text-2xl font-bold text-blue-600"
                          animate={{ scale: isActive ? [1, 1.2, 1] : 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          {(index + 1).toString().padStart(2, '0')}
                        </motion.span>
                        <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            className="text-sm text-gray-700 bg-blue-50 p-4 rounded-xl"
                          >
                            {step.detail}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Voting Mechanics */}
        <motion.div 
          className="mb-16"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Voting Mechanics & Distribution
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {votingMechanics.map((mechanic, index) => {
              const MechanicIcon = mechanic.icon;
              return (
                <motion.div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300"
                  variants={fadeInUp}
                  whileHover={{ y: -5, rotateX: 5 }}
                >
                  <motion.div 
                    className={`p-4 bg-gradient-to-br ${colorMap[mechanic.color]} rounded-2xl w-fit mb-6`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <MechanicIcon className={`h-8 w-8 text-${mechanic.color}-600`} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{mechanic.title}</h3>
                  <p className="text-gray-600 mb-6">{mechanic.description}</p>
                  <ul className="space-y-3">
                    {mechanic.features.map((feature, featureIndex) => (
                      <motion.li 
                        key={featureIndex} 
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: featureIndex * 0.1 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, delay: featureIndex * 0.2, repeat: Infinity, repeatDelay: 5 }}
                        >
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <span className="text-gray-700">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Interactive Quadratic Calculator */}
        <motion.div 
          className="mb-16"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 border border-purple-200">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8 flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Calculator className="h-8 w-8 text-purple-600" />
              </motion.div>
              Interactive Quadratic Calculator
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calculator Input */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Test Quadratic Distribution
                </h3>
                
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                    <span className="text-purple-800">Quadratic Weight:</span>
                    <motion.span 
                      className="font-bold text-lg text-purple-600"
                      key={calculatorInput}
                      initial={{ scale: 1.2, color: "#7c3aed" }}
                      animate={{ scale: 1, color: "#9333ea" }}
                      transition={{ duration: 0.3 }}
                    >
                      {Math.sqrt(calculatorInput).toFixed(2)}
                    </motion.span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-100 rounded-xl">
                  <h4 className="font-semibold text-purple-800 mb-2">Why Quadratic?</h4>
                  <p className="text-sm text-purple-700">
                    Square root function ensures smaller contributors have proportionally more influence, promoting fairness and preventing whale dominance.
                  </p>
                </div>
              </div>

              {/* Visual Comparison */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <PieChart className="h-6 w-6 text-purple-600" />
                  Distribution Comparison
                </h3>
                
                <div className="space-y-6">
                  {sampleVotes.map((project, index) => {
                    const linearShare = (project.votes / totalLinear) * 100;
                    const quadraticWeight = calculateQuadratic(project.votes);
                    const quadraticShare = (quadraticWeight / totalQuadratic) * 100;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{project.name}</span>
                          <span className="text-sm text-gray-600">{project.votes} votes</span>
                        </div>
                        
                        {/* Linear Distribution Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Linear: {linearShare.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full ${project.color} opacity-60`}
                              initial={{ width: 0 }}
                              animate={{ width: `${linearShare}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                        
                        {/* Quadratic Distribution Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-purple-600">
                            <span>Quadratic: {quadraticShare.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full ${project.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${quadraticShare}%` }}
                              transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700">
                    Notice how quadratic distribution creates more balanced funding, giving smaller projects a better chance while still rewarding popular ones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* How Distribution Works */}
        <motion.div 
          className="mb-16"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              How Fund Distribution Works
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Distribution Steps */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Distribution Process</h3>
                <div className="space-y-4">
                  {[
                    {
                      step: "1",
                      title: "Campaign Ends",
                      description: "Voting period closes and final tallies are calculated",
                      icon: Clock
                    },
                    {
                      step: "2", 
                      title: "Token Conversion",
                      description: "All voted tokens are converted to the campaign's payout token",
                      icon: Coins
                    },
                    {
                      step: "3",
                      title: "Fee Deduction",
                      description: "Platform fee (15%) and admin fee are deducted from total",
                      icon: DollarSign
                    },
                    {
                      step: "4",
                      title: "Quadratic Calculation",
                      description: "Vote amounts are square-rooted: √votes = distribution weight",
                      icon: Calculator
                    },
                    {
                      step: "5",
                      title: "Automatic Payout",
                      description: "Winners receive funds directly via smart contract",
                      icon: Zap
                    }
                  ].map((item, index) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div 
                        key={index} 
                        className="flex gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <motion.div 
                          className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 360 }}
                          transition={{ duration: 0.3 }}
                        >
                          {item.step}
                        </motion.div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <ItemIcon className="h-4 w-4 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                          </div>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Smart Contract Features */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Smart Contract Features</h3>
                <div className="bg-blue-50 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Built-in Protections
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>ReentrancyGuard prevents double-spending</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>SafeERC20 for secure token transfers</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Admin controls with multi-signature support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Emergency recovery functions</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-white rounded-xl">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Quadratic Formula in Code:
                    </h5>
                    <code className="text-xs text-gray-700 bg-gray-100 p-2 rounded block">
                      function sqrt(uint256 x) returns (uint256 y) {'{'}
                      <br />
                      &nbsp;&nbsp;// Babylonian method implementation
                      <br />
                      &nbsp;&nbsp;uint256 z = (x + 1) / 2;
                      <br />
                      &nbsp;&nbsp;y = x;
                      <br />
                      &nbsp;&nbsp;while (z {'<'} y) {'{ y = z; z = (x/z + z)/2; }'}
                      <br />
                      {'}'}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div 
          className="text-center"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"
              animate={{ 
                background: [
                  "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))",
                  "linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(59, 130, 246, 0.2))",
                  "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative z-10">
              <motion.h2 
                className="text-3xl font-bold mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Ready to Vote?
              </motion.h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join the community and support your favorite projects. Every vote counts and directly impacts funding through quadratic distribution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button 
                  className="bg-white text-blue-600 font-bold py-4 px-8 rounded-2xl hover:shadow-lg transition-all duration-300 flex items-center gap-3"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Vote className="h-5 w-5" />
                  Start Voting Now
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </motion.button>
                <motion.button 
                  className="border-2 border-white text-white font-bold py-4 px-8 rounded-2xl hover:bg-white hover:text-blue-600 transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View All Campaigns
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}