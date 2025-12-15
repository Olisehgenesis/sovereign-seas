// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title QuizeloV2
 * @notice A comprehensive quiz game contract where users pay a fee to take quizzes and can earn rewards based on their score
 * @dev Uses ERC20 tokens for payments/rewards, Ownable for access control, and ReentrancyGuard for security
 * @dev Supports leaderboards, user statistics, streaks, and comprehensive analytics
 */
contract QuizeloV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    
    /// @notice Fee required to start a quiz (in token units, e.g., 100 * 10^18 for 100 tokens with 18 decimals)
    uint256 public constant QUIZ_FEE = 100 * 1e18; // 100 tokens (adjust decimals as needed)
    
    /// @notice Duration of a quiz session in seconds
    uint256 public constant QUIZ_DURATION = 900; // 15 minutes
    
    /// @notice Cooldown period between quizzes in seconds
    uint256 public constant COOLDOWN_PERIOD = 3600; // 1 hour
    
    /// @notice Maximum number of quizzes a user can take per day
    uint256 public constant MAX_DAILY_QUIZZES = 3;
    
    /// @notice Minimum contract balance required to operate quizzes
    uint256 public constant MIN_CONTRACT_BALANCE = 1000 * 1e18; // 1000 tokens
    
    /// @notice Maximum leaderboard entries to track
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    // ============ Structs ============
    
    /// @notice Represents an active quiz session
    struct QuizSession {
        address user;           // User who started the quiz
        address paymentToken;  // Token used for payment and reward
        uint256 startTime;      // Timestamp when quiz started
        uint256 expiryTime;     // Timestamp when quiz expires
        bool active;            // Whether the quiz is still active
        bool claimed;           // Whether the reward has been claimed
        uint256 score;          // Score achieved (0-100)
        uint256 reward;         // Reward claimed
    }

    /// @notice User information for daily quiz tracking
    struct UserInfo {
        uint256 dailyCount;     // Number of quizzes taken today
        uint256 lastQuiz;       // Timestamp of last quiz
        uint256 nextQuizTime;   // Timestamp when user can take next quiz
        bool wonToday;          // Whether user won today
        bool canQuiz;           // Whether user can take a quiz now
    }

    /// @notice Comprehensive user statistics
    struct UserStats {
        uint256 totalQuizzes;       // Total quizzes taken
        uint256 totalEarnings;      // Total tokens earned
        uint256 bestScore;          // Best score achieved
        uint256 averageScore;       // Average score
        uint256 currentStreak;      // Current win streak
        uint256 longestStreak;      // Longest win streak
        uint256 totalWins;          // Total number of wins (score >= 60)
        uint256 lastActivity;       // Last quiz timestamp
    }

    /// @notice Leaderboard entry
    struct LeaderboardEntry {
        address user;           // User address
        uint256 score;          // Score or earnings depending on leaderboard type
        uint256 timestamp;      // When this entry was recorded
    }

    /// @notice Quiz history entry
    struct QuizHistory {
        bytes32 sessionId;      // Session ID
        uint256 score;          // Score achieved
        uint256 reward;         // Reward earned
        uint256 timestamp;      // When quiz was completed
    }

    // ============ State Variables ============
    
    /// @notice Mapping of supported payment tokens
    mapping(address => bool) public supportedTokens;
    
    /// @notice Array of all supported token addresses
    address[] public tokenList;
    
    /// @notice Mapping from token address to contract balance
    mapping(address => uint256) public tokenBalances;
    
    /// @notice Mapping from sessionId to QuizSession
    mapping(bytes32 => QuizSession) public activeQuizzes;
    
    /// @notice Array of current active quiz session IDs
    bytes32[] public currentQuizTakers;
    
    /// @notice Mapping from user address to daily quiz count
    mapping(address => uint256) public dailyQuizCount;
    
    /// @notice Mapping from user address to last quiz timestamp
    mapping(address => uint256) public lastQuizTime;
    
    /// @notice Mapping from user address to last reset day (for daily count reset)
    mapping(address => uint256) public lastResetDay;
    
    /// @notice Mapping from user address to whether they won today
    mapping(address => bool) public hasWonToday;
    
    /// @notice Nonce for generating unique session IDs
    mapping(address => uint256) public userNonces;
    
    /// @notice Mapping from user address to UserStats
    mapping(address => UserStats) public userStats;
    
    /// @notice Mapping from user address to quiz history
    mapping(address => QuizHistory[]) public userQuizHistory;
    
    /// @notice Leaderboard for top scores (all-time)
    LeaderboardEntry[] public topScoresLeaderboard;
    
    /// @notice Leaderboard for top earners (all-time)
    LeaderboardEntry[] public topEarnersLeaderboard;
    
    /// @notice Leaderboard for current streaks
    LeaderboardEntry[] public topStreaksLeaderboard;
    
    /// @notice Mapping to track if user is in leaderboard (for efficient updates)
    mapping(address => bool) public inTopScores;
    mapping(address => bool) public inTopEarners;
    mapping(address => bool) public inTopStreaks;
    
    /// @notice Total quizzes completed across all users
    uint256 public totalQuizzesCompleted;
    
    /// @notice Total tokens distributed as rewards
    uint256 public totalRewardsDistributed;
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;

    // ============ Events ============
    
    /// @notice Emitted when a quiz is started
    event QuizStarted(
        bytes32 indexed sessionId,
        address indexed user,
        uint256 startTime
    );
    
    /// @notice Emitted when a quiz is completed and reward is claimed
    event QuizCompleted(
        bytes32 indexed sessionId,
        address indexed user,
        uint256 score,
        uint256 reward
    );
    
    /// @notice Emitted when contract is topped up
    event ContractToppedUp(uint256 amount);
    
    /// @notice Emitted when a token is added to supported tokens
    event TokenAdded(address indexed token);
    
    /// @notice Emitted when a token is removed from supported tokens
    event TokenRemoved(address indexed token);
    
    /// @notice Emitted when user stats are updated
    event UserStatsUpdated(
        address indexed user,
        uint256 totalQuizzes,
        uint256 totalEarnings,
        uint256 bestScore,
        uint256 currentStreak
    );
    
    /// @notice Emitted when leaderboard is updated
    event LeaderboardUpdated(string leaderboardType, address indexed user, uint256 value);

    // ============ Constructor ============
    
    /// @param _tokens Array of ERC20 token addresses to support for payments and rewards
    constructor(address[] memory _tokens) Ownable(msg.sender) {
        require(_tokens.length > 0, "Quizelo: At least one token required");
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(_tokens[i] != address(0), "Quizelo: Invalid token address");
            require(!supportedTokens[_tokens[i]], "Quizelo: Duplicate token");
            supportedTokens[_tokens[i]] = true;
            tokenList.push(_tokens[i]);
            emit TokenAdded(_tokens[i]);
        }
    }

    // ============ Main Functions ============
    
    /**
     * @notice Start a new quiz session
     * @param token Address of the ERC20 token to use for payment and reward
     * @dev Requires payment of QUIZ_FEE in ERC20 tokens, checks daily limits and cooldown
     * @dev User must approve this contract to spend QUIZ_FEE tokens before calling
     */
    function startQuiz(address token) external nonReentrant {
        require(supportedTokens[token], "Quizelo: Token not supported");
        require(canOperateQuizzes(token), "Quizelo: Contract balance too low for this token");
        
        address user = msg.sender;
        IERC20 paymentToken = IERC20(token);
        
        // Transfer quiz fee from user
        paymentToken.safeTransferFrom(user, address(this), QUIZ_FEE);
        tokenBalances[token] += QUIZ_FEE;
        totalFeesCollected += QUIZ_FEE;
        
        // Reset daily count if it's a new day
        _resetDailyCountIfNeeded(user);
        
        // Check if user can take quiz
        UserInfo memory userInfo = getUserInfo(user);
        require(userInfo.canQuiz, "Quizelo: Cannot take quiz now");
        
        // Generate unique session ID
        bytes32 sessionId = keccak256(
            abi.encodePacked(user, userNonces[user]++, block.timestamp, block.prevrandao, token)
        );
        
        // Create quiz session
        uint256 startTime = block.timestamp;
        uint256 expiryTime = startTime + QUIZ_DURATION;
        
        activeQuizzes[sessionId] = QuizSession({
            user: user,
            paymentToken: token,
            startTime: startTime,
            expiryTime: expiryTime,
            active: true,
            claimed: false,
            score: 0,
            reward: 0
        });
        
        // Add to current quiz takers
        currentQuizTakers.push(sessionId);
        
        // Update user state
        dailyQuizCount[user]++;
        lastQuizTime[user] = startTime;
        
        emit QuizStarted(sessionId, user, startTime);
    }
    
    /**
     * @notice Claim reward for completing a quiz
     * @param sessionId The session ID of the quiz
     * @param score The score achieved (0-100)
     */
    function claimReward(bytes32 sessionId, uint256 score) external nonReentrant {
        QuizSession storage session = activeQuizzes[sessionId];
        
        require(session.active, "Quizelo: Session not active");
        require(!session.claimed, "Quizelo: Already claimed");
        require(session.user == msg.sender, "Quizelo: Not your session");
        require(block.timestamp <= session.expiryTime, "Quizelo: Session expired");
        require(score <= 100, "Quizelo: Invalid score");
        
        address user = msg.sender;
        
        // Get payment token from session
        address token = session.paymentToken;
        IERC20 paymentToken = IERC20(token);
        
        // Calculate reward (only if score >= 60%)
        uint256 reward = 0;
        bool won = false;
        if (score >= 60) {
            reward = calculatePotentialReward(score);
            require(tokenBalances[token] >= reward, "Quizelo: Insufficient contract balance for this token");
            
            // Mark as won today
            hasWonToday[user] = true;
            won = true;
            
            // Transfer reward
            paymentToken.safeTransfer(user, reward);
            tokenBalances[token] -= reward;
            totalRewardsDistributed += reward;
        }
        
        // Update session
        session.claimed = true;
        session.active = false;
        session.score = score;
        session.reward = reward;
        
        // Update user statistics
        _updateUserStats(user, score, reward, won);
        
        // Add to quiz history
        userQuizHistory[user].push(QuizHistory({
            sessionId: sessionId,
            score: score,
            reward: reward,
            timestamp: block.timestamp
        }));
        
        // Update leaderboards
        _updateLeaderboards(user, score, reward);
        
        // Remove from current quiz takers
        _removeFromCurrentTakers(sessionId);
        
        totalQuizzesCompleted++;
        
        emit QuizCompleted(sessionId, user, score, reward);
    }
    
    /**
     * @notice Clean up an expired quiz session
     * @param sessionId The session ID to clean up
     */
    function cleanupExpiredQuiz(bytes32 sessionId) external nonReentrant {
        QuizSession storage session = activeQuizzes[sessionId];
        
        require(session.active, "Quizelo: Session not active");
        require(block.timestamp > session.expiryTime, "Quizelo: Session not expired");
        
        // Mark as inactive
        session.active = false;
        
        // Remove from current quiz takers
        _removeFromCurrentTakers(sessionId);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get user information
     * @param user The user address
     * @return UserInfo struct with user's quiz status
     */
    function getUserInfo(address user) public view returns (UserInfo memory) {
        uint256 currentTime = block.timestamp;
        uint256 lastQuiz = lastQuizTime[user];
        uint256 dailyCount = dailyQuizCount[user];
        
        // Reset daily count if needed (for view function)
        if (_isNewDay(user)) {
            dailyCount = 0;
        }
        
        // Calculate next quiz time
        uint256 nextQuizTime = 0;
        if (lastQuiz > 0) {
            nextQuizTime = lastQuiz + COOLDOWN_PERIOD;
        }
        
        // Check if user can quiz
        bool canQuiz = dailyCount < MAX_DAILY_QUIZZES && 
                      (lastQuiz == 0 || currentTime >= nextQuizTime);
        
        return UserInfo({
            dailyCount: dailyCount,
            lastQuiz: lastQuiz,
            nextQuizTime: nextQuizTime,
            wonToday: hasWonToday[user],
            canQuiz: canQuiz
        });
    }
    
    /**
     * @notice Get contract statistics for a specific token
     * @param token Token address to get stats for
     * @return balance Current contract balance for this token
     * @return activeQuizCount Number of active quizzes
     * @return minBalance Minimum required balance
     * @return operational Whether contract can operate with this token
     * @return totalQuizzes Total quizzes completed
     * @return totalRewards Total rewards distributed
     * @return totalFees Total fees collected
     */
    function getContractStats(address token) external view returns (
        uint256 balance,
        uint256 activeQuizCount,
        uint256 minBalance,
        bool operational,
        uint256 totalQuizzes,
        uint256 totalRewards,
        uint256 totalFees
    ) {
        balance = tokenBalances[token];
        activeQuizCount = currentQuizTakers.length;
        minBalance = MIN_CONTRACT_BALANCE;
        operational = canOperateQuizzes(token);
        totalQuizzes = totalQuizzesCompleted;
        totalRewards = totalRewardsDistributed;
        totalFees = totalFeesCollected;
    }
    
    /**
     * @notice Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return tokenList;
    }
    
    /**
     * @notice Check if a token is supported
     * @param token Token address to check
     * @return true if token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }
    
    /**
     * @notice Get quiz session details
     * @param sessionId The session ID
     * @return user User address
     * @return paymentToken Token address used for payment
     * @return startTime Start timestamp
     * @return expiryTime Expiry timestamp
     * @return active Whether session is active
     * @return claimed Whether reward was claimed
     * @return score Score achieved (0 if not claimed)
     * @return reward Reward earned (0 if not claimed or failed)
     * @return timeRemaining Time remaining in seconds
     */
    function getQuizSession(bytes32 sessionId) external view returns (
        address user,
        address paymentToken,
        uint256 startTime,
        uint256 expiryTime,
        bool active,
        bool claimed,
        uint256 score,
        uint256 reward,
        uint256 timeRemaining
    ) {
        QuizSession memory session = activeQuizzes[sessionId];
        user = session.user;
        paymentToken = session.paymentToken;
        startTime = session.startTime;
        expiryTime = session.expiryTime;
        active = session.active;
        claimed = session.claimed;
        score = session.score;
        reward = session.reward;
        
        if (active && block.timestamp < expiryTime) {
            timeRemaining = expiryTime - block.timestamp;
        } else {
            timeRemaining = 0;
        }
    }
    
    /**
     * @notice Get all current quiz takers' session IDs
     * @return Array of session IDs
     */
    function getCurrentQuizTakers() external view returns (bytes32[] memory) {
        return currentQuizTakers;
    }
    
    /**
     * @notice Calculate potential reward for a score
     * @param score The score (0-100)
     * @return reward The reward amount in token units
     */
    function calculatePotentialReward(uint256 score) public pure returns (uint256) {
        if (score < 60) {
            return 0;
        }
        
        // Base reward is 5x the quiz fee for passing (60%+)
        uint256 baseReward = QUIZ_FEE * 5;
        
        // Bonus for higher scores
        if (score >= 90) {
            return baseReward * 2; // 10x for 90%+
        } else if (score >= 80) {
            return baseReward * 3 / 2; // 7.5x for 80%+
        } else if (score >= 70) {
            return baseReward * 6 / 5; // 6x for 70%+
        }
        
        return baseReward; // 5x for 60%+
    }
    
    /**
     * @notice Check if contract can operate quizzes with a specific token
     * @param token Token address to check
     * @return true if balance is above minimum
     */
    function canOperateQuizzes(address token) public view returns (bool) {
        return supportedTokens[token] && tokenBalances[token] >= MIN_CONTRACT_BALANCE;
    }
    
    /**
     * @notice Get user statistics
     * @param user The user address
     * @return stats UserStats struct with comprehensive statistics
     */
    function getUserStats(address user) external view returns (UserStats memory stats) {
        return userStats[user];
    }
    
    /**
     * @notice Get user quiz history
     * @param user The user address
     * @param limit Maximum number of entries to return (0 = all)
     * @return history Array of QuizHistory entries
     */
    function getUserQuizHistory(address user, uint256 limit) external view returns (QuizHistory[] memory history) {
        QuizHistory[] storage fullHistory = userQuizHistory[user];
        uint256 length = fullHistory.length;
        
        if (limit == 0 || limit >= length) {
            return fullHistory;
        }
        
        // Return most recent entries
        history = new QuizHistory[](limit);
        uint256 start = length - limit;
        for (uint256 i = 0; i < limit; i++) {
            history[i] = fullHistory[start + i];
        }
    }
    
    /**
     * @notice Get top scores leaderboard
     * @param limit Maximum number of entries to return (0 = all)
     * @return entries Array of LeaderboardEntry sorted by score (highest first)
     */
    function getTopScoresLeaderboard(uint256 limit) external view returns (LeaderboardEntry[] memory entries) {
        uint256 length = topScoresLeaderboard.length;
        if (length == 0) return entries;
        
        uint256 returnLength = limit == 0 || limit > length ? length : limit;
        entries = new LeaderboardEntry[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            entries[i] = topScoresLeaderboard[i];
        }
    }
    
    /**
     * @notice Get top earners leaderboard
     * @param limit Maximum number of entries to return (0 = all)
     * @return entries Array of LeaderboardEntry sorted by earnings (highest first)
     */
    function getTopEarnersLeaderboard(uint256 limit) external view returns (LeaderboardEntry[] memory entries) {
        uint256 length = topEarnersLeaderboard.length;
        if (length == 0) return entries;
        
        uint256 returnLength = limit == 0 || limit > length ? length : limit;
        entries = new LeaderboardEntry[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            entries[i] = topEarnersLeaderboard[i];
        }
    }
    
    /**
     * @notice Get top streaks leaderboard
     * @param limit Maximum number of entries to return (0 = all)
     * @return entries Array of LeaderboardEntry sorted by streak (highest first)
     */
    function getTopStreaksLeaderboard(uint256 limit) external view returns (LeaderboardEntry[] memory entries) {
        uint256 length = topStreaksLeaderboard.length;
        if (length == 0) return entries;
        
        uint256 returnLength = limit == 0 || limit > length ? length : limit;
        entries = new LeaderboardEntry[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            entries[i] = topStreaksLeaderboard[i];
        }
    }
    
    /**
     * @notice Get user's rank in top scores leaderboard
     * @param user The user address
     * @return rank User's rank (0 if not in leaderboard, 1-indexed)
     */
    function getUserScoreRank(address user) external view returns (uint256 rank) {
        for (uint256 i = 0; i < topScoresLeaderboard.length; i++) {
            if (topScoresLeaderboard[i].user == user) {
                return i + 1;
            }
        }
        return 0;
    }
    
    /**
     * @notice Get user's rank in top earners leaderboard
     * @param user The user address
     * @return rank User's rank (0 if not in leaderboard, 1-indexed)
     */
    function getUserEarnerRank(address user) external view returns (uint256 rank) {
        for (uint256 i = 0; i < topEarnersLeaderboard.length; i++) {
            if (topEarnersLeaderboard[i].user == user) {
                return i + 1;
            }
        }
        return 0;
    }
    
    /**
     * @notice Get user's rank in streaks leaderboard
     * @param user The user address
     * @return rank User's rank (0 if not in leaderboard, 1-indexed)
     */
    function getUserStreakRank(address user) external view returns (uint256 rank) {
        for (uint256 i = 0; i < topStreaksLeaderboard.length; i++) {
            if (topStreaksLeaderboard[i].user == user) {
                return i + 1;
            }
        }
        return 0;
    }
    
    /**
     * @notice Compare two users' statistics
     * @param user1 First user address
     * @param user2 Second user address
     * @return stats1 First user's stats
     * @return stats2 Second user's stats
     */
    function compareUsers(address user1, address user2) external view returns (
        UserStats memory stats1,
        UserStats memory stats2
    ) {
        return (userStats[user1], userStats[user2]);
    }
    
    /**
     * @notice Get global statistics
     * @return totalUsers Total unique users
     * @return totalQuizzes Total quizzes completed
     * @return totalRewards Total rewards distributed
     * @return totalFees Total fees collected
     * @return averageScore Average score across all quizzes
     */
    function getGlobalStats() external view returns (
        uint256 totalUsers,
        uint256 totalQuizzes,
        uint256 totalRewards,
        uint256 totalFees,
        uint256 averageScore
    ) {
        totalQuizzes = totalQuizzesCompleted;
        totalRewards = totalRewardsDistributed;
        totalFees = totalFeesCollected;
        
        // Calculate average score (simplified - would need to track sum of all scores)
        // For now, return 0 as this would require additional state tracking
        averageScore = 0;
        
        // Count unique users (approximate from leaderboards)
        // In production, you might want to track this separately
        totalUsers = topScoresLeaderboard.length;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Top up contract balance with ERC20 tokens
     * @dev Anyone can top up, but typically called by owner
     * @param token Token address to top up
     * @param amount Amount of tokens to transfer (must approve first)
     */
    function topUpContract(address token, uint256 amount) external nonReentrant {
        require(supportedTokens[token], "Quizelo: Token not supported");
        require(amount > 0, "Quizelo: Must send tokens");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalances[token] += amount;
        emit ContractToppedUp(amount);
    }
    
    /**
     * @notice Add a new supported token (owner only)
     * @param token Address of ERC20 token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Quizelo: Invalid token address");
        require(!supportedTokens[token], "Quizelo: Token already supported");
        supportedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }
    
    /**
     * @notice Remove a supported token (owner only)
     * @dev Can only remove if contract has no balance for that token
     * @param token Address of ERC20 token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Quizelo: Token not supported");
        require(tokenBalances[token] == 0, "Quizelo: Token has balance, drain first");
        
        supportedTokens[token] = false;
        
        // Remove from tokenList array
        uint256 length = tokenList.length;
        for (uint256 i = 0; i < length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[length - 1];
                tokenList.pop();
                break;
            }
        }
        
        emit TokenRemoved(token);
    }
    
    /**
     * @notice Admin function to cleanup all expired quizzes
     */
    function adminCleanupExpired() external onlyOwner nonReentrant {
        uint256 length = currentQuizTakers.length;
        for (uint256 i = 0; i < length; ) {
            bytes32 sessionId = currentQuizTakers[i];
            QuizSession storage session = activeQuizzes[sessionId];
            
            if (session.active && block.timestamp > session.expiryTime) {
                session.active = false;
                _removeFromCurrentTakers(sessionId);
                length--;
            } else {
                i++;
            }
        }
    }
    
    /**
     * @notice Emergency drain function (owner only)
     * @dev Drains all contract token balance for a specific token to owner
     * @param token Token address to drain
     */
    function adminEmergencyDrain(address token) external onlyOwner nonReentrant {
        require(supportedTokens[token], "Quizelo: Token not supported");
        uint256 balance = tokenBalances[token];
        require(balance > 0, "Quizelo: No balance to drain for this token");
        
        tokenBalances[token] = 0;
        IERC20(token).safeTransfer(owner(), balance);
    }
    
    /**
     * @notice Get balance for a specific token
     * @param token Token address
     * @return balance Current balance for this token
     */
    function getTokenBalance(address token) external view returns (uint256 balance) {
        return tokenBalances[token];
    }
    
    /**
     * @notice Admin function to reset leaderboards (owner only)
     * @dev Use with caution - this clears all leaderboard data
     */
    function adminResetLeaderboards() external onlyOwner {
        delete topScoresLeaderboard;
        delete topEarnersLeaderboard;
        delete topStreaksLeaderboard;
    }

    // ============ Internal Functions ============
    
    /**
     * @notice Reset daily count if it's a new day
     */
    function _resetDailyCountIfNeeded(address user) internal {
        if (_isNewDay(user)) {
            dailyQuizCount[user] = 0;
            hasWonToday[user] = false;
            lastResetDay[user] = block.timestamp / 1 days;
            
            // Reset streak if user didn't win yesterday
            if (userStats[user].currentStreak > 0 && !hasWonToday[user]) {
                userStats[user].currentStreak = 0;
            }
        }
    }
    
    /**
     * @notice Check if it's a new day for the user
     */
    function _isNewDay(address user) internal view returns (bool) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastDay = lastResetDay[user];
        return currentDay > lastDay;
    }
    
    /**
     * @notice Remove session ID from current quiz takers array
     */
    function _removeFromCurrentTakers(bytes32 sessionId) internal {
        uint256 length = currentQuizTakers.length;
        for (uint256 i = 0; i < length; i++) {
            if (currentQuizTakers[i] == sessionId) {
                currentQuizTakers[i] = currentQuizTakers[length - 1];
                currentQuizTakers.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Update user statistics after quiz completion
     */
    function _updateUserStats(address user, uint256 score, uint256 reward, bool won) internal {
        UserStats storage stats = userStats[user];
        
        stats.totalQuizzes++;
        stats.totalEarnings += reward;
        stats.lastActivity = block.timestamp;
        
        // Update best score
        if (score > stats.bestScore) {
            stats.bestScore = score;
        }
        
        // Update average score (simplified calculation)
        // In production, you might want more precise tracking
        if (stats.totalQuizzes == 1) {
            stats.averageScore = score;
        } else {
            // Approximate average (for exact, would need to track sum)
            stats.averageScore = (stats.averageScore * (stats.totalQuizzes - 1) + score) / stats.totalQuizzes;
        }
        
        // Update streak
        if (won) {
            stats.totalWins++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 0;
        }
        
        emit UserStatsUpdated(user, stats.totalQuizzes, stats.totalEarnings, stats.bestScore, stats.currentStreak);
    }
    
    /**
     * @notice Update leaderboards after quiz completion
     */
    function _updateLeaderboards(address user, uint256 score, uint256 reward) internal {
        // Update top scores leaderboard
        _updateTopScores(user, score);
        
        // Update top earners leaderboard
        if (reward > 0) {
            _updateTopEarners(user, reward);
        }
        
        // Update top streaks leaderboard
        _updateTopStreaks(user, userStats[user].currentStreak);
    }
    
    /**
     * @notice Update top scores leaderboard
     */
    function _updateTopScores(address user, uint256 score) internal {
        // Check if user already in leaderboard
        bool found = false;
        uint256 insertIndex = topScoresLeaderboard.length;
        
        for (uint256 i = 0; i < topScoresLeaderboard.length; i++) {
            if (topScoresLeaderboard[i].user == user) {
                // Update existing entry if new score is higher
                if (score > topScoresLeaderboard[i].score) {
                    topScoresLeaderboard[i].score = score;
                    topScoresLeaderboard[i].timestamp = block.timestamp;
                    // Re-sort if needed
                    _sortTopScores();
                }
                found = true;
                break;
            }
            // Find insertion point (scores sorted descending)
            if (!found && score > topScoresLeaderboard[i].score) {
                insertIndex = i;
                break;
            }
        }
        
        // Add new entry if not found and score qualifies
        if (!found && (topScoresLeaderboard.length < MAX_LEADERBOARD_SIZE || score > topScoresLeaderboard[topScoresLeaderboard.length - 1].score)) {
            if (topScoresLeaderboard.length >= MAX_LEADERBOARD_SIZE) {
                // Remove last entry
                topScoresLeaderboard.pop();
            }
            
            // Insert at appropriate position
            topScoresLeaderboard.push();
            for (uint256 i = topScoresLeaderboard.length - 1; i > insertIndex; i--) {
                topScoresLeaderboard[i] = topScoresLeaderboard[i - 1];
            }
            topScoresLeaderboard[insertIndex] = LeaderboardEntry({
                user: user,
                score: score,
                timestamp: block.timestamp
            });
            
            inTopScores[user] = true;
            emit LeaderboardUpdated("topScores", user, score);
        }
    }
    
    /**
     * @notice Update top earners leaderboard
     */
    function _updateTopEarners(address user, uint256 /* reward */) internal {
        UserStats storage stats = userStats[user];
        uint256 totalEarnings = stats.totalEarnings;
        
        // Check if user already in leaderboard
        bool found = false;
        uint256 insertIndex = topEarnersLeaderboard.length;
        
        for (uint256 i = 0; i < topEarnersLeaderboard.length; i++) {
            if (topEarnersLeaderboard[i].user == user) {
                // Update existing entry
                topEarnersLeaderboard[i].score = totalEarnings;
                topEarnersLeaderboard[i].timestamp = block.timestamp;
                // Re-sort if needed
                _sortTopEarners();
                found = true;
                break;
            }
            // Find insertion point (earnings sorted descending)
            if (!found && totalEarnings > topEarnersLeaderboard[i].score) {
                insertIndex = i;
                break;
            }
        }
        
        // Add new entry if not found and earnings qualify
        if (!found && (topEarnersLeaderboard.length < MAX_LEADERBOARD_SIZE || totalEarnings > topEarnersLeaderboard[topEarnersLeaderboard.length - 1].score)) {
            if (topEarnersLeaderboard.length >= MAX_LEADERBOARD_SIZE) {
                // Remove last entry
                inTopEarners[topEarnersLeaderboard[topEarnersLeaderboard.length - 1].user] = false;
                topEarnersLeaderboard.pop();
            }
            
            // Insert at appropriate position
            topEarnersLeaderboard.push();
            for (uint256 i = topEarnersLeaderboard.length - 1; i > insertIndex; i--) {
                topEarnersLeaderboard[i] = topEarnersLeaderboard[i - 1];
            }
            topEarnersLeaderboard[insertIndex] = LeaderboardEntry({
                user: user,
                score: totalEarnings,
                timestamp: block.timestamp
            });
            
            inTopEarners[user] = true;
            emit LeaderboardUpdated("topEarners", user, totalEarnings);
        }
    }
    
    /**
     * @notice Update top streaks leaderboard
     */
    function _updateTopStreaks(address user, uint256 streak) internal {
        // Only update if streak is significant
        if (streak == 0) return;
        
        // Check if user already in leaderboard
        bool found = false;
        uint256 insertIndex = topStreaksLeaderboard.length;
        
        for (uint256 i = 0; i < topStreaksLeaderboard.length; i++) {
            if (topStreaksLeaderboard[i].user == user) {
                // Update existing entry if new streak is higher
                if (streak > topStreaksLeaderboard[i].score) {
                    topStreaksLeaderboard[i].score = streak;
                    topStreaksLeaderboard[i].timestamp = block.timestamp;
                    // Re-sort if needed
                    _sortTopStreaks();
                }
                found = true;
                break;
            }
            // Find insertion point (streaks sorted descending)
            if (!found && streak > topStreaksLeaderboard[i].score) {
                insertIndex = i;
                break;
            }
        }
        
        // Add new entry if not found and streak qualifies
        if (!found && (topStreaksLeaderboard.length < MAX_LEADERBOARD_SIZE || streak > topStreaksLeaderboard[topStreaksLeaderboard.length - 1].score)) {
            if (topStreaksLeaderboard.length >= MAX_LEADERBOARD_SIZE) {
                // Remove last entry
                inTopStreaks[topStreaksLeaderboard[topStreaksLeaderboard.length - 1].user] = false;
                topStreaksLeaderboard.pop();
            }
            
            // Insert at appropriate position
            topStreaksLeaderboard.push();
            for (uint256 i = topStreaksLeaderboard.length - 1; i > insertIndex; i--) {
                topStreaksLeaderboard[i] = topStreaksLeaderboard[i - 1];
            }
            topStreaksLeaderboard[insertIndex] = LeaderboardEntry({
                user: user,
                score: streak,
                timestamp: block.timestamp
            });
            
            inTopStreaks[user] = true;
            emit LeaderboardUpdated("topStreaks", user, streak);
        }
    }
    
    /**
     * @notice Sort top scores leaderboard (bubble sort for small arrays)
     */
    function _sortTopScores() internal {
        uint256 n = topScoresLeaderboard.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (topScoresLeaderboard[j].score < topScoresLeaderboard[j + 1].score) {
                    LeaderboardEntry memory temp = topScoresLeaderboard[j];
                    topScoresLeaderboard[j] = topScoresLeaderboard[j + 1];
                    topScoresLeaderboard[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @notice Sort top earners leaderboard
     */
    function _sortTopEarners() internal {
        uint256 n = topEarnersLeaderboard.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (topEarnersLeaderboard[j].score < topEarnersLeaderboard[j + 1].score) {
                    LeaderboardEntry memory temp = topEarnersLeaderboard[j];
                    topEarnersLeaderboard[j] = topEarnersLeaderboard[j + 1];
                    topEarnersLeaderboard[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @notice Sort top streaks leaderboard
     */
    function _sortTopStreaks() internal {
        uint256 n = topStreaksLeaderboard.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (topStreaksLeaderboard[j].score < topStreaksLeaderboard[j + 1].score) {
                    LeaderboardEntry memory temp = topStreaksLeaderboard[j];
                    topStreaksLeaderboard[j] = topStreaksLeaderboard[j + 1];
                    topStreaksLeaderboard[j + 1] = temp;
                }
            }
        }
    }
}

