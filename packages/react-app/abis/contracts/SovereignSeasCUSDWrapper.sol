// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SovereignSeas Token Wrapper
 * @dev A dynamic wrapper contract that allows users to vote with any supported token in SovereignSeas
 */
contract SovereignSeasTokenWrapper is Ownable(msg.sender) {
    // SovereignSeas contract
    address public sovereignSeasContract;
    
    // Native CELO address
    address public celoAddress;
    
    // Token configuration
    struct TokenConfig {
        bool supported;      // Whether the token is actively supported
        uint256 exchangeRate; // 1 Token = X CELO (in wei)
        string symbol;        // Token symbol (for UI display)
    }
    
    // Mapping of token address to token configuration
    mapping(address => TokenConfig) public tokens;
    
    // Array to keep track of all token addresses (for enumeration)
    address[] public supportedTokensList;
    
    // Events
    event VoteWithToken(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address tokenAddress,
        uint256 tokenAmount,
        uint256 celoAmount
    );
    
    event TokenAdded(address tokenAddress, string symbol, uint256 exchangeRate);
    event TokenRemoved(address tokenAddress);
    event TokenUpdated(address tokenAddress, uint256 exchangeRate);
    event SovereignSeasContractUpdated(address newAddress);
    event CeloAddressUpdated(address newAddress);
    
    /**
     * @dev Constructor
     * @param _sovereignSeasContract Address of the SovereignSeas contract
     * @param _celoAddress Address of the CELO token
     * @param _initialTokens Array of initial token addresses to support
     * @param _initialSymbols Array of token symbols
     * @param _initialRates Array of initial exchange rates for each token
     */
    constructor(
        address _sovereignSeasContract, 
        address _celoAddress,
        address[] memory _initialTokens,
        string[] memory _initialSymbols,
        uint256[] memory _initialRates
    ) {
        require(_initialTokens.length == _initialSymbols.length && _initialTokens.length == _initialRates.length, 
                "Arrays length mismatch");
                
        sovereignSeasContract = _sovereignSeasContract;
        celoAddress = _celoAddress;
        
        // Add initial tokens
        for (uint256 i = 0; i < _initialTokens.length; i++) {
            _addToken(_initialTokens[i], _initialSymbols[i], _initialRates[i]);
        }
    }
    
    /**
     * @dev Internal function to add a token
     */
    function _addToken(address _tokenAddress, string memory _symbol, uint256 _rate) internal {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_rate > 0, "Exchange rate must be greater than 0");
        require(!tokens[_tokenAddress].supported, "Token already supported");
        
        tokens[_tokenAddress] = TokenConfig({
            supported: true,
            exchangeRate: _rate,
            symbol: _symbol
        });
        
        supportedTokensList.push(_tokenAddress);
        emit TokenAdded(_tokenAddress, _symbol, _rate);
    }
    
    /**
     * @dev Add a new supported token
     * @param _tokenAddress The token address
     * @param _symbol The token symbol
     * @param _initialRate Initial exchange rate (1 Token = _initialRate CELO)
     */
    function addToken(address _tokenAddress, string memory _symbol, uint256 _initialRate) external onlyOwner {
        _addToken(_tokenAddress, _symbol, _initialRate);
    }
    
    /**
     * @dev Remove a supported token
     * @param _tokenAddress The token address to remove
     */
    function removeToken(address _tokenAddress) external onlyOwner {
        require(tokens[_tokenAddress].supported, "Token not supported");
        
        // Mark as not supported but keep the data for history
        tokens[_tokenAddress].supported = false;
        
        // Find and remove from the list (maintaining order is not important)
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == _tokenAddress) {
                // Replace with the last element and pop
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemoved(_tokenAddress);
    }
    
    /**
     * @dev Update token exchange rate
     * @param _tokenAddress The token address
     * @param _newRate New exchange rate
     */
    function updateTokenRate(address _tokenAddress, uint256 _newRate) external onlyOwner {
        require(tokens[_tokenAddress].supported, "Token not supported");
        require(_newRate > 0, "Exchange rate must be greater than 0");
        
        tokens[_tokenAddress].exchangeRate = _newRate;
        emit TokenUpdated(_tokenAddress, _newRate);
    }
    
    /**
     * @dev Update token symbol (in case it was entered incorrectly)
     * @param _tokenAddress The token address
     * @param _newSymbol New token symbol
     */
    function updateTokenSymbol(address _tokenAddress, string memory _newSymbol) external onlyOwner {
        require(tokens[_tokenAddress].supported, "Token not supported");
        tokens[_tokenAddress].symbol = _newSymbol;
    }
    
    /**
     * @dev Update the SovereignSeas contract address
     * @param _newAddress New contract address
     */
    function updateSovereignSeasContract(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Invalid address");
        sovereignSeasContract = _newAddress;
        emit SovereignSeasContractUpdated(_newAddress);
    }
    
    /**
     * @dev Update the CELO address (useful when switching networks)
     * @param _newAddress New CELO address
     */
    function updateCeloAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Invalid address");
        celoAddress = _newAddress;
        emit CeloAddressUpdated(_newAddress);
    }
    
    /**
     * @dev Vote with a supported token
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     * @param _tokenAddress Address of the token to vote with
     * @param _tokenAmount Amount of tokens to vote with
     */
    function voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _tokenAddress,
        uint256 _tokenAmount
    ) external {
        require(_tokenAmount > 0, "Amount must be greater than 0");
        require(tokens[_tokenAddress].supported, "Token not supported");
        
        // Calculate equivalent CELO amount
        uint256 celoAmount = (_tokenAmount * tokens[_tokenAddress].exchangeRate) / 1 ether;
        require(celoAmount > 0, "Converted CELO amount is too small");
        
        // Make sure we have enough CELO
        require(address(this).balance >= celoAmount, "Not enough CELO in contract");
        
        // Transfer tokens from user to this contract
        IERC20 token = IERC20(_tokenAddress);
        require(token.transferFrom(msg.sender, address(this), _tokenAmount), "Token transfer failed");
        
        // Vote in SovereignSeas with CELO
        (bool success, ) = sovereignSeasContract.call{value: celoAmount}(
            abi.encodeWithSignature("vote(uint256,uint256)", _campaignId, _projectId)
        );
        require(success, "Vote failed");
        
        emit VoteWithToken(msg.sender, _campaignId, _projectId, _tokenAddress, _tokenAmount, celoAmount);
    }
    
    /**
     * @dev Get estimated CELO amount for a token amount
     * @param _tokenAddress Address of the token
     * @param _tokenAmount Amount of tokens
     * @return celoAmount The equivalent CELO amount
     */
    function estimateCeloAmount(address _tokenAddress, uint256 _tokenAmount) external view returns (uint256) {
        require(tokens[_tokenAddress].supported, "Token not supported");
        return (_tokenAmount * tokens[_tokenAddress].exchangeRate) / 1 ether;
    }
    
    /**
     * @dev Get all supported token addresses
     * @return Array of all supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    /**
     * @dev Get token details
     * @param _tokenAddress Address of the token
     * @return supported Whether the token is supported
     * @return symbol The token symbol
     * @return exchangeRate The token exchange rate
     */
    function getTokenDetails(address _tokenAddress) external view returns (
        bool supported,
        string memory symbol,
        uint256 exchangeRate
    ) {
        TokenConfig memory config = tokens[_tokenAddress];
        return (config.supported, config.symbol, config.exchangeRate);
    }
    
    /**
     * @dev Get number of supported tokens
     * @return Count of supported tokens
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokensList.length;
    }
    
    /**
     * @dev Withdraw CELO
     * @param _amount Amount of CELO to withdraw (0 for all)
     */
    function withdrawCELO(uint256 _amount) external onlyOwner {
        uint256 amount = _amount == 0 ? address(this).balance : _amount;
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Withdraw any token
     * @param _tokenAddress Address of the token to withdraw
     * @param _amount Amount of tokens to withdraw (0 for all)
     */
    function withdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        uint256 amount = _amount == 0 ? balance : _amount;
        require(amount <= balance, "Insufficient balance");
        
        require(token.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Batch update exchange rates for multiple tokens
     * @param _tokenAddresses Array of token addresses
     * @param _newRates Array of new exchange rates
     */
    function batchUpdateRates(address[] memory _tokenAddresses, uint256[] memory _newRates) external onlyOwner {
        require(_tokenAddresses.length == _newRates.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            if (tokens[_tokenAddresses[i]].supported && _newRates[i] > 0) {
                tokens[_tokenAddresses[i]].exchangeRate = _newRates[i];
                emit TokenUpdated(_tokenAddresses[i], _newRates[i]);
            }
        }
    }
    
    /**
     * @dev Receive function to accept CELO
     */
    receive() external payable {}
}