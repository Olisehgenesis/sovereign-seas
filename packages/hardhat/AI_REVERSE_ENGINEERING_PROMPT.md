# 🤖 AI Reverse Engineering Prompt: SovereignSeas V5 Architecture

## 🎯 **Objective**
Design and create the complete SovereignSeas V5 modular architecture based on the V4 system. The AI should create its own V5 modules, proxy system, and deployment patterns.

## 📋 **Context & Artifacts**

### **V4 System Information**
*[V4 system details will be provided separately]*

### **V5 Deployment Configuration**
```json
{
  "network": "alfajores",
  "deployer": "0x53eaF4CD171842d8144e45211308e5D90B4b0088",
  "timestamp": "2025-09-01T06:07:36.665Z",
  "contracts": {
    "projectsModule": "",
    "campaignsModule": "",
    "votingModule": "",
    "treasuryModule": "",
    "poolsModule": "",
    "migrationModule": "",
    "sovereignSeasV5": ""
  }
}
```

### **Core Architecture Components**

#### **1. SovereignSeasV5 Proxy Contract**
- **Purpose**: Main proxy contract that delegates calls to specialized modules
- **Key Features**: 
  - UUPS upgradeable proxy pattern
  - Role-based access control (ADMIN_ROLE, MANAGER_ROLE, OPERATOR_ROLE, EMERGENCY_ROLE)
  - Circuit breaker functionality
  - Method routing system for gas optimization
  - Fallback function for automatic delegation

#### **2. Module System Architecture**
- **Interface**: All modules implement `IModule` interface
- **Registration**: Dynamic module registration with dependency management
- **Communication**: Inter-module communication via `callModule()` and `delegateToModule()`
- **Upgradeability**: Individual module upgrades without affecting others

## 🎯 **System Overview & Context**

### **What is SovereignSeas?**
SovereignSeas is a decentralized funding platform where communities can create campaigns to fund projects. Think of it as a "Kickstarter meets DAO governance" system on blockchain.

### **Core Concepts**

#### **Campaigns**
- **What they are**: Funding rounds where communities vote on which projects should receive funding
- **How they work**: 
  - Admins create campaigns with specific funding goals and rules
  - Campaigns have start/end dates, funding targets, and voting mechanisms
  - Users vote for projects using various tokens (CELO, ERC20, stablecoins)
  - At the end, funds are distributed to winning projects based on voting results
- **Examples**: "Developer Projects", "local miss tourism , Community Projects", "Tech Innovation Grants"

- **Campaign Types**:
  - **CELO-based campaigns**: Traditional campaigns using CELO token
  - **Token-based campaigns**: Campaigns using specific ERC20 tokens as voting currency
  - **Multi-token campaigns**: Campaigns accepting multiple token types for voting
  - **Stablecoin campaigns**: Campaigns using stablecoins like USDC, cUSD

- **Campaign Economics**:
  - **Fee tokens**: Campaigns can set specific tokens for fee collection
  - **Fee amounts**: Fixed amounts or percentages calculated at campaign creation
  - **Project addition fees**: Cost to add projects to campaigns (in campaign token or CELO)
  - **Voting fees**: Fees charged per vote or per voting session
  - **Admin funding**: Campaigns can receive direct funding from admins

#### **Projects**
- **What they are**: Proposals submitted by users seeking funding
- **How they work**:
  - Users submit project proposals with descriptions, goals, and team info
  - Projects can be added to campaigns for voting
  - Projects have statuses (pending, verified, flagged, etc.)
  - Winning projects receive funding based on voting results
- **Examples**: "Solar Panel Installation", "Community Garden", "Educational App"

#### **Voting System**
- **Token-based voting**: Users vote using various tokens (CELO, USDC, custom ERC20)
- **Vote weighting**: Different tokens have different voting power multipliers
- **Quadratic voting**: Voting power increases with square root of token amount (prevents whale dominance)
- **Reputation system**: Users build reputation through consistent participation
- **Voter diversity**: Bonus rewards for diverse voter participation

- **Voting Mechanics**:
  - **Token weight multipliers**: Each token has a weight (1000 = 1.0x, 1500 = 1.5x voting power)
  - **Quadratic calculation**: Voting power = sqrt(token_amount) * token_weight
  - **Voter diversity bonus**: Projects with more unique voters get bonus funding
  - **Voting sessions**: Campaigns can have multiple voting rounds
  - **Vote locking**: Tokens are locked during voting period
  - **Vote verification**: System verifies token ownership and voting eligibility

- **Campaign-Specific Voting**:
  - **Campaign token voting**: Users must use the campaign's designated token
  - **Multi-token voting**: Users can choose from allowed tokens
  - **Token conversion**: Automatic conversion of other tokens to campaign token
  - **Voting power calculation**: Based on campaign token or converted equivalent

#### **Distribution Methods**
- **Equal distribution**: All projects get equal funding 
- **Proportional distribution**: Funding based on vote percentages
- **Quadratic distribution**: Rewards projects with diverse voter support
- **Custom distribution**: Admin-defined allocation rules

- **Distribution Mechanics**:
  - **Campaign token distribution**: Funds distributed in campaign's designated token
  - **Multi-token distribution**: Funds distributed in multiple tokens based on voting
  - **Conversion distribution**: Other tokens converted to campaign token for distribution
  - **Team member claims**: Project team members can claim their allocated percentages
  - **Unclaimed fund handling**: Unclaimed funds can be recalled or redistributed

### **V4 System (Monolithic Architecture)**
The original V4 system was a single large contract that handled everything:
- **All functionality in one contract**: Projects, campaigns, voting, treasury, pools all mixed together
- **Complex interactions**: Hard to maintain and upgrade
- **Gas inefficiency**: Large contract size and complex logic
- **Limited flexibility**: Hard to add new features or modify existing ones
- **Security risks**: Single point of failure
- **Scaling issues**: Difficult to handle growing complexity

### **Why V5 (Modular Architecture)?**
V5 breaks the monolithic system into specialized modules:
- **Separation of concerns**: Each module handles one specific area
- **Easier maintenance**: Smaller, focused contracts
- **Independent upgrades**: Update modules without affecting others
- **Better gas efficiency**: Optimized for specific functions
- **Enhanced security**: Isolated modules reduce attack surface
- **Scalability**: Easy to add new modules or modify existing ones
- **Developer experience**: Clearer code organization and testing

### **System Flow**
1. **Project Creation**: Users submit projects to ProjectsModule
2. **Campaign Setup**: Admins create campaigns in CampaignsModule
3. **Project Addition**: Projects are added to campaigns for voting
4. **Voting Period**: Users vote using VotingModule with various tokens
5. **Pool Management**: PoolsModule manages funding allocation
6. **Fund Distribution**: TreasuryModule handles final fund distribution
7. **Migration**: MigrationModule transfers V4 data to V5

## 🔍 **Design Tasks**

### **Task 1: V4 Analysis & V5 Design**
Analyze the V4 system and design the V5 modular architecture:

**What to do:**
- Study the V4 system structure and functionality
- Identify problems and limitations in V4
- Design modular V5 architecture to solve V4 problems
- Create separation of concerns across modules
- Plan data structures and interfaces

### **Task 2: Method Routing System Analysis**
The proxy uses a sophisticated call routing system:

**What the routing system does:**
- Maps function calls to the correct module
- Provides fallback routing when direct mapping fails
- Optimizes gas usage by efficient routing
- Handles different types of function calls
- Ensures calls reach the right destination

**Questions to Answer:**
- How does the system know which module to call?
- What happens when a function isn't directly mapped?
- How is the routing optimized for efficiency?
- What are the routing strategies used?

### **Task 3: Module Functionality Mapping**

#### **ProjectsModule**
- **Purpose**: Manages projects submitted by users
- **What it does**: 
  - Allows users to create and submit projects
  - Stores project information (name, description, owner, metadata)
  - Manages project status (pending, verified, flagged, suspended, archived)
  - Handles project ownership transfers
  - Tracks project metadata and updates
  - Provides project discovery and search functionality

- **Key Features**:
  - Project creation and submission system
  - Official status verification system
  - Project metadata management
  - Ownership transfer capabilities
  - Project search and discovery
  - Status management (pending, verified, flagged, suspended, archived)
  - Project categorization and tagging
  - Project update tracking

- **Core Methods to Implement**:
  - `createProject()` - Create new project with metadata
  - `updateProject()` - Update project information
  - `transferProjectOwnership()` - Transfer project to new owner
  - `getProject()` - Retrieve project data by ID
  - `getProjectMetadata()` - Get project metadata
  - `editProjectName()` - Update project name
  - `editProjectDescription()` - Update project description
  - `updateProjectMetadata()` - Update project metadata fields
  - `setProjectStatus()` - Change project status (admin only)
  - `getProjectsByOwner()` - Get all projects by owner
  - `searchProjects()` - Search projects by criteria
  - `getProjectCount()` - Get total number of projects

#### **CampaignsModule**
- **Purpose**: Manages funding campaigns for projects
- **What it does**:
  - Allows admins to create funding campaigns
  - Sets campaign parameters (start/end dates, funding goals, rules)
  - Manages campaign status and lifecycle
  - Handles campaign admin permissions and management
  - Configures voting tokens and fee structures
  - Tracks campaign performance and metrics
  - Manages campaign metadata and branding

- **Key Features**:
  - Campaign creation and configuration
  - Multi-admin campaign management
  - Campaign lifecycle management (draft, active, completed, cancelled)
  - ERC20 token campaign support
  - Custom voting token configuration
  - Campaign fee structure management
  - Campaign performance analytics
  - Campaign metadata and branding
  - Project addition fee system
  - Campaign admin role management

- **Core Methods to Implement**:
  - `createCampaign()` - Create new funding campaign
  - `updateCampaign()` - Update campaign parameters
  - `getCampaign()` - Retrieve campaign data by ID
  - `getCampaignMetadata()` - Get campaign metadata
  - `setCampaignStatus()` - Change campaign status
  - `addCampaignAdmin()` - Add admin to campaign
  - `removeCampaignAdmin()` - Remove admin from campaign
  - `setVotingTokens()` - Configure allowed voting tokens
  - `setTokenWeights()` - Set voting power for tokens
  - `setCampaignFees()` - Configure campaign fee structure
  - `getCampaignProjects()` - Get projects in campaign
  - `addProjectToCampaign()` - Add project to campaign
  - `removeProjectFromCampaign()` - Remove project from campaign
  - `getCampaignPerformance()` - Get campaign analytics
  - `setCampaignMetadata()` - Update campaign metadata
  - `setCampaignToken()` - Set primary campaign token
  - `setProjectAdditionFee()` - Set fee for adding projects
  - `setVotingFee()` - Set fee for voting
  - `addAdminFunding()` - Add direct funding from admin
  - `getCampaignTokenBalance()` - Get campaign token balance
  - `setFeeToken()` - Set token used for fee collection
  - `calculateCampaignFees()` - Calculate total fees for campaign

#### **VotingModule**
- **Purpose**: Handles voting and project participation in campaigns
- **What it does**:
  - Allows users to vote for projects using various tokens
  - Calculates voting power and reputation scores
  - Manages quadratic voting and custom voting schemes
  - Tracks user participation and voting history
  - Handles project approval and rejection processes
  - Manages voting token weights and multipliers
  - Provides voting analytics and statistics

- **Key Features**:
  - Multi-token voting system
  - Quadratic voting implementation
  - Custom voting schemes support
  - Voter reputation system
  - Voting power calculation
  - Project participation tracking
  - Voting history and analytics
  - Token weight management
  - Project approval/rejection workflow
  - Voter diversity tracking
  - Real-time voting statistics

- **Core Methods to Implement**:
  - `vote()` - Cast vote for project using tokens
  - `getVote()` - Get user's vote for specific project
  - `getUserVotes()` - Get all user votes in campaign
  - `getProjectVotes()` - Get all votes for specific project
  - `calculateVotingPower()` - Calculate user's voting power
  - `getVoterReputation()` - Get user's reputation score
  - `updateVoterReputation()` - Update user reputation
  - `getVotingHistory()` - Get user's voting history
  - `approveProject()` - Approve project for funding (admin)
  - `rejectProject()` - Reject project from funding (admin)
  - `getVotingStatistics()` - Get campaign voting analytics
  - `getVoterDiversity()` - Calculate voter diversity metrics
  - `setVotingScheme()` - Configure voting scheme (quadratic, etc.)
  - `getVotingResults()` - Get final voting results
  - `lockVotingTokens()` - Lock tokens during voting period
  - `unlockVotingTokens()` - Unlock tokens after voting
  - `convertTokenForVoting()` - Convert other tokens to campaign token
  - `calculateQuadraticVoting()` - Calculate quadratic voting power
  - `verifyVotingEligibility()` - Check if user can vote
  - `getVotingSession()` - Get current voting session info
  - `setVotingSession()` - Configure voting session parameters

#### **TreasuryModule**
- **Purpose**: Manages funds, fees, and token operations
- **What it does**:
  - Collects and manages platform fees
  - Handles multiple token types (CELO, ERC20, stablecoins)
  - Manages token exchanges and conversions
  - Processes fee distributions and withdrawals
  - Handles emergency fund management
  - Tracks treasury balances and transactions
  - Manages fee structures and pricing

- **Key Features**:
  - Multi-token treasury management
  - Fee collection and distribution system
  - Token exchange and conversion
  - Emergency fund management
  - Fee structure configuration
  - Treasury balance tracking
  - Transaction history and analytics
  - Fee update request system
  - Emergency withdrawal system
  - Token exchange provider management
  - Fee type categorization

- **Core Methods to Implement**:
  - `collectFee()` - Collect fees from users
  - `getTokenBalance()` - Get treasury balance for token
  - `distributeFees()` - Distribute collected fees
  - `exchangeToken()` - Exchange one token for another
  - `addSupportedToken()` - Add new token to treasury
  - `removeSupportedToken()` - Remove token from treasury
  - `setFeeStructure()` - Configure fee rates and types
  - `getFeeStructure()` - Get current fee configuration
  - `emergencyWithdraw()` - Emergency fund withdrawal
  - `getTransactionHistory()` - Get treasury transaction history
  - `setExchangeProvider()` - Configure token exchange provider
  - `getTreasuryAnalytics()` - Get treasury performance analytics
  - `requestFeeUpdate()` - Request fee structure change
  - `approveFeeUpdate()` - Approve fee update request
  - `collectCampaignFee()` - Collect campaign-specific fees
  - `convertTokenForCampaign()` - Convert tokens for campaign use
  - `getTokenExchangeRate()` - Get current exchange rate between tokens
  - `setTokenExchangeProvider()` - Set exchange provider for specific tokens
  - `calculateFeeInToken()` - Calculate fee amount in specific token

#### **PoolsModule**
- **Purpose**: Manages funding pools and distribution
- **What it does**:
  - Creates and manages campaign funding pools
  - Handles project funding allocation and distribution
  - Manages team member claims and percentages
  - Processes fund transfers and withdrawals
  - Tracks pool balances and funding sources
  - Manages distribution methods (equal, proportional, custom)
  - Handles unclaimed funds and recalls

- **Key Features**:
  - Campaign pool creation and management
  - Project pool management
  - Fund distribution algorithms
  - Team member claim system
  - Multi-token pool support
  - Distribution method configuration
  - Pool balance tracking
  - Fund source management (votes, donations, admin funding)
  - Unclaimed fund handling
  - Team percentage management
  - Pool analytics and reporting

- **Core Methods to Implement**:
  - `createCampaignPool()` - Create funding pool for campaign
  - `createProjectPool()` - Create funding pool for project
  - `addFundsToPool()` - Add funds to pool from various sources
  - `distributeFunds()` - Distribute funds to projects
  - `getPoolBalance()` - Get current pool balance
  - `setDistributionMethod()` - Configure distribution algorithm
  - `addTeamMember()` - Add team member to project
  - `setTeamPercentages()` - Set team member claim percentages
  - `claimFunds()` - Allow team member to claim funds
  - `recallUnclaimedFunds()` - Recall unclaimed funds
  - `getPoolAnalytics()` - Get pool performance analytics
  - `setPoolSettings()` - Configure pool parameters
  - `getTeamMembers()` - Get project team members
  - `calculateDistribution()` - Calculate fund distribution
  - `distributeInCampaignToken()` - Distribute funds in campaign token
  - `distributeInMultipleTokens()` - Distribute funds in multiple tokens
  - `convertForDistribution()` - Convert tokens for distribution
  - `setTeamClaimPercentages()` - Set team member claim percentages
  - `getUnclaimedFunds()` - Get amount of unclaimed funds
  - `redistributeUnclaimedFunds()` - Redistribute unclaimed funds

#### **MigrationModule**
- **Purpose**: Migrates data from old system to new system
- **What it does**:
  - Transfers projects from old system to new system
  - Migrates campaign data and settings
  - Transfers user data and balances
  - Handles voting history and participation data
  - Manages treasury balances and fee structures
  - Provides migration progress tracking
  - Handles rollback and emergency recovery

- **Key Features**:
  - Batch data migration system
  - Migration progress tracking
  - Data integrity verification
  - Rollback and recovery mechanisms
  - Emergency migration procedures
  - Migration validation and testing
  - Data transformation and mapping
  - Migration status monitoring
  - Error handling and recovery
  - Migration completion verification

- **Core Methods to Implement**:
  - `startMigration()` - Begin migration process
  - `migrateProjects()` - Migrate project data
  - `migrateCampaigns()` - Migrate campaign data
  - `migrateVotingData()` - Migrate voting history
  - `migrateTreasuryData()` - Migrate treasury balances
  - `getMigrationProgress()` - Get migration status
  - `validateMigration()` - Verify migration integrity
  - `rollbackMigration()` - Rollback to previous state
  - `pauseMigration()` - Pause migration process
  - `resumeMigration()` - Resume paused migration
  - `getMigrationErrors()` - Get migration error log
  - `completeMigration()` - Mark migration as complete
  - `setV4Contract()` - Set V4 contract address
  - `getMigrationAnalytics()` - Get migration statistics

### **Task 4: Proxy Delegation Pattern Analysis**
Analyze how the main contract routes calls to the right modules:

**What the proxy does:**
- Receives all function calls from users
- Determines which module should handle each call
- Routes the call to the appropriate module
- Returns the module's response back to the user
- Handles errors and edge cases

**Questions to Answer:**
- How does the proxy decide which module to call?
- What happens when a call fails or module is unavailable?
- How does the proxy handle different types of calls?
- What are the security considerations for this routing system?

### **Task 5: Access Control and Security Analysis**
Analyze the permission and security system:

**What the access control system does:**
- Defines different user roles (Admin, Manager, Operator, Emergency)
- Controls who can perform different actions
- Manages permissions across all modules
- Handles emergency situations and circuit breakers
- Provides security and access management

**Questions to Answer:**
- What can each role do in the system?
- How are permissions managed across modules?
- What happens during emergency situations?
- What security measures are in place?

### **Task 6: V4 to V5 Migration Analysis**
Analyze how data and functionality migrates from V4 to V5:

**What the migration system does:**
- Transfers all V4 data to V5 modules
- Maintains data integrity during migration
- Handles complex data transformations
- Provides migration progress tracking
- Enables rollback to V4 if needed

**Questions to Answer:**
- How is V4 data mapped to V5 module structures?
- What data transformations are needed?
- How is migration progress tracked and verified?
- What happens if migration fails or needs to be rolled back?
- How is backward compatibility maintained during migration?

## 🎯 **Expected Output**

### **1. Architecture Documentation**
- Complete system architecture diagram
- Module interaction flowcharts
- Data flow diagrams
- Security model documentation

### **2. Technical Specifications**
- Module API specifications
- Method routing tables
- Role permission matrices
- Upgrade procedures

### **3. Security Analysis**
- Attack vector analysis
- Access control review
- Circuit breaker effectiveness
- Emergency procedures

### **4. Performance Analysis**
- Gas optimization strategies
- Method routing efficiency
- Module communication overhead
- Upgrade impact assessment

### **5. V4 to V5 Evolution Analysis**
- V4 system architecture and limitations
- V5 improvements and new features
- Data structure evolution and mapping
- Migration strategies and procedures

## 🔧 **Tools and Techniques**

### **Code Analysis**
- Static analysis of contract interactions
- Method signature analysis
- Gas usage optimization review
- Security pattern identification

### **Deployment Analysis**
- Deployment order optimization
- Dependency injection patterns
- Configuration management
- Environment-specific adaptations

### **Testing Strategy**
- Module isolation testing
- Integration testing scenarios
- Upgrade testing procedures
- Security testing protocols

## 📊 **Success Metrics**

### **Completeness**
- All modules documented
- All interactions mapped
- All security considerations identified
- All upgrade paths documented

### **Accuracy**
- Correct method routing logic
- Accurate dependency mapping
- Proper security analysis
- Valid upgrade procedures

### **Usability**
- Clear documentation structure
- Practical implementation guidance
- Troubleshooting procedures
- Best practices recommendations

## 🚀 **Next Steps**

1. **Deep Dive Analysis**: Analyze each module's internal logic
2. **Interaction Mapping**: Document all cross-module communications
3. **Security Review**: Identify potential vulnerabilities and mitigations
4. **Performance Optimization**: Suggest improvements for gas efficiency
5. **Testing Framework**: Design comprehensive testing strategies
6. **Documentation**: Create developer-friendly documentation

---

**Note**: This reverse engineering should focus on understanding the complete system architecture, identifying potential improvements, and creating comprehensive documentation for future development and maintenance.
