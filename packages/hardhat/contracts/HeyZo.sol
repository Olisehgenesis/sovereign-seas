// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract HeyZo {
    address public admin;
    uint256 public cooldown = 15 minutes;
    uint256 public dayLength = 1 days;

    struct Pool {
        uint256 total;     // total allocated for distribution
        uint256 maxSend;   // base max per claim
        bool isNative;     // true if this pool is for CELO/ETH
    }

    struct UserInfo {
        uint256 lastClaim;
        uint256 lastDay;
        uint256 streak;
    }

    // token => pool (use address(0) for CELO/ETH native pool)
    mapping(address => Pool) public pools;
    // user => token => info
    mapping(address => mapping(address => UserInfo)) public userInfo;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Allow contract to receive CELO/ETH
    receive() external payable {}

    // Admin sets a pool
    function setPool(address token, uint256 total, uint256 maxSend, bool isNative) external onlyAdmin {
        if (isNative) {
            require(address(this).balance >= total, "Not enough native balance");
        } else {
            require(IERC20(token).balanceOf(address(this)) >= total, "Not enough tokens");
        }
        pools[token] = Pool(total, maxSend, isNative);
    }

    // ✅ New: Fund a pool (admin or users can donate)
    function fundPool(address token, uint256 amount) external payable {
        Pool storage pool = pools[token];
        require(pool.maxSend > 0, "Pool not set");

        if (pool.isNative) {
            require(msg.value > 0, "Send CELO/ETH to fund");
            pool.total += msg.value;
        } else {
            require(amount > 0, "Invalid token amount");
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Token transfer failed");
            pool.total += amount;
        }
    }

    // Users claim (ERC20 or Native)
    function claim(address token) external {
        UserInfo storage u = userInfo[msg.sender][token];
        Pool storage pool = pools[token];

        require(pool.total > 0, "No pool available");
        require(block.timestamp >= u.lastClaim + cooldown, "Claim too soon");

        // streak tracking
        uint256 currentDay = block.timestamp / dayLength;
        if (u.lastDay == 0 || currentDay > u.lastDay) {
            if (u.lastDay + 1 == currentDay) {
                u.streak += 1;
            } else {
                u.streak = 1;
            }
            u.lastDay = currentDay;
        }

        // streak boost: +10% per 10 days
        uint256 boost = (u.streak / 10) * 10; 
        uint256 effectiveMaxSend = pool.maxSend + (pool.maxSend * boost / 100);

        uint256 rand = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, pool.total))
        ) % effectiveMaxSend + 1;

        if (rand > pool.total) {
            rand = pool.total;
        }

        pool.total -= rand;
        u.lastClaim = block.timestamp;

        if (pool.isNative) {
            payable(msg.sender).transfer(rand);
        } else {
            IERC20(token).transfer(msg.sender, rand);
        }
    }

    // Admin send directly
    function adminSend(address token, address to, uint256 amount) external onlyAdmin {
        Pool storage pool = pools[token];
        require(pool.total >= amount, "Not enough in pool");

        pool.total -= amount;
        if (pool.isNative) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).transfer(to, amount);
        }
    }

    // Admin withdraw leftover
    function withdraw(address token, uint256 amount) external onlyAdmin {
        Pool storage pool = pools[token];
        if (pool.isNative) {
            payable(admin).transfer(amount);
        } else {
            IERC20(token).transfer(admin, amount);
        }
    }

    // View user info
    function getUserInfo(address user, address token) external view returns (
        uint256 streak,
        uint256 effectiveMaxSend,
        uint256 lastClaim
    ) {
        UserInfo storage u = userInfo[user][token];
        Pool storage pool = pools[token];

        uint256 boost = (u.streak / 10) * 10; 
        uint256 effective = pool.maxSend + (pool.maxSend * boost / 100);

        return (u.streak, effective, u.lastClaim);
    }
}
