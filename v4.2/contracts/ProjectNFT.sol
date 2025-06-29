// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ProjectNFT
 * @dev NFT contract for Sovereign Seas project owners to mint NFTs representing their projects
 * @author Sovereign Seas Team
 */
contract ProjectNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Events
    event ProjectNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed projectId,
        address indexed owner,
        string tokenURI
    );
    
    event ProjectNFTBurned(
        uint256 indexed tokenId,
        uint256 indexed projectId,
        address indexed owner
    );

    // State variables
    Counters.Counter private _tokenIds;
    
    // Mapping from project ID to token ID
    mapping(uint256 => uint256) public projectToTokenId;
    
    // Mapping from token ID to project ID
    mapping(uint256 => uint256) public tokenIdToProject;
    
    // Mapping to track if a project already has an NFT
    mapping(uint256 => bool) public projectHasNFT;
    
    // Sovereign Seas main contract address
    address public sovereignSeasContract;
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Maximum supply (optional limit)
    uint256 public maxSupply;
    
    // Minting fee in wei
    uint256 public mintingFee;
    
    // Fee recipient
    address public feeRecipient;

    // Modifiers
    modifier onlyProjectOwner(uint256 projectId) {
        require(
            _isProjectOwner(projectId, msg.sender),
            "ProjectNFT: Only project owner can mint"
        );
        _;
    }
    
    modifier projectExists(uint256 projectId) {
        require(
            _projectExists(projectId),
            "ProjectNFT: Project does not exist"
        );
        _;
    }
    
    modifier projectNotAlreadyMinted(uint256 projectId) {
        require(
            !projectHasNFT[projectId],
            "ProjectNFT: Project already has an NFT"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param name NFT collection name
     * @param symbol NFT collection symbol
     * @param _sovereignSeas Address of the Sovereign Seas main contract
     * @param _maxSupply Maximum supply of NFTs (0 for unlimited)
     * @param _mintingFee Fee to mint an NFT in wei
     * @param _feeRecipient Address to receive minting fees
     */
    constructor(
        string memory name,
        string memory symbol,
        address _sovereignSeas,
        uint256 _maxSupply,
        uint256 _mintingFee,
        address _feeRecipient
    ) ERC721(name, symbol) Ownable(msg.sender) {
        sovereignSeasContract = _sovereignSeas;
        maxSupply = _maxSupply;
        mintingFee = _mintingFee;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Mint an NFT for a project
     * @param projectId The ID of the project in Sovereign Seas
     * @param tokenURI The URI containing the NFT metadata
     */
    function mintProjectNFT(
        uint256 projectId,
        string memory tokenURI
    ) 
        external 
        payable 
        projectExists(projectId)
        onlyProjectOwner(projectId)
        projectNotAlreadyMinted(projectId)
    {
        require(
            maxSupply == 0 || _tokenIds.current() < maxSupply,
            "ProjectNFT: Max supply reached"
        );
        
        require(
            msg.value >= mintingFee,
            "ProjectNFT: Insufficient minting fee"
        );

        // Transfer fee to recipient
        if (mintingFee > 0 && feeRecipient != address(0)) {
            (bool success, ) = feeRecipient.call{value: mintingFee}("");
            require(success, "ProjectNFT: Fee transfer failed");
        }

        // Refund excess payment
        if (msg.value > mintingFee) {
            (bool success, ) = msg.sender.call{value: msg.value - mintingFee}("");
            require(success, "ProjectNFT: Refund failed");
        }

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        // Mint the NFT
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        // Update mappings
        projectToTokenId[projectId] = newTokenId;
        tokenIdToProject[newTokenId] = projectId;
        projectHasNFT[projectId] = true;

        emit ProjectNFTMinted(newTokenId, projectId, msg.sender, tokenURI);
    }

    /**
     * @dev Burn an NFT (only by token owner or project owner)
     * @param tokenId The ID of the token to burn
     */
    function burnNFT(uint256 tokenId) external {
        require(
            _exists(tokenId),
            "ProjectNFT: Token does not exist"
        );
        
        uint256 projectId = tokenIdToProject[tokenId];
        require(
            msg.sender == ownerOf(tokenId) || 
            _isProjectOwner(projectId, msg.sender),
            "ProjectNFT: Not authorized to burn"
        );

        address tokenOwner = ownerOf(tokenId);
        
        // Clear mappings
        delete projectToTokenId[projectId];
        delete tokenIdToProject[tokenId];
        projectHasNFT[projectId] = false;

        // Burn the token
        _burn(tokenId);

        emit ProjectNFTBurned(tokenId, projectId, tokenOwner);
    }

    /**
     * @dev Get the token ID for a project
     * @param projectId The project ID
     * @return The token ID (0 if no NFT exists)
     */
    function getTokenIdForProject(uint256 projectId) external view returns (uint256) {
        return projectToTokenId[projectId];
    }

    /**
     * @dev Get the project ID for a token
     * @param tokenId The token ID
     * @return The project ID
     */
    function getProjectForToken(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "ProjectNFT: Token does not exist");
        return tokenIdToProject[tokenId];
    }

    /**
     * @dev Check if a project has an NFT
     * @param projectId The project ID
     * @return True if the project has an NFT
     */
    function hasProjectNFT(uint256 projectId) external view returns (bool) {
        return projectHasNFT[projectId];
    }

    /**
     * @dev Get total supply
     * @return Total number of NFTs minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @dev Get all tokens owned by an address
     * @param owner The address to query
     * @return Array of token IDs
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= _tokenIds.current(); i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokens[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return tokens;
    }

    /**
     * @dev Get all projects that have NFTs
     * @return Array of project IDs
     */
    function getProjectsWithNFTs() external view returns (uint256[] memory) {
        uint256 count = 0;
        uint256 maxProjectId = 10000; // Reasonable upper limit
        
        // Count projects with NFTs
        for (uint256 i = 1; i <= maxProjectId; i++) {
            if (projectHasNFT[i]) {
                count++;
            }
        }
        
        uint256[] memory projects = new uint256[](count);
        uint256 currentIndex = 0;
        
        // Fill array with project IDs
        for (uint256 i = 1; i <= maxProjectId; i++) {
            if (projectHasNFT[i]) {
                projects[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return projects;
    }

    // Admin functions
    /**
     * @dev Update the Sovereign Seas contract address (only owner)
     * @param newContract The new contract address
     */
    function updateSovereignSeasContract(address newContract) external onlyOwner {
        require(newContract != address(0), "ProjectNFT: Invalid address");
        sovereignSeasContract = newContract;
    }

    /**
     * @dev Update minting fee (only owner)
     * @param newFee The new fee in wei
     */
    function updateMintingFee(uint256 newFee) external onlyOwner {
        mintingFee = newFee;
    }

    /**
     * @dev Update fee recipient (only owner)
     * @param newRecipient The new fee recipient address
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    /**
     * @dev Update max supply (only owner)
     * @param newMaxSupply The new maximum supply
     */
    function updateMaxSupply(uint256 newMaxSupply) external onlyOwner {
        maxSupply = newMaxSupply;
    }

    /**
     * @dev Set base URI for token metadata (only owner)
     * @param baseURI The new base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Emergency function to recover stuck tokens (only owner)
     * @param token The token address
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function emergencyRecoverTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "ProjectNFT: Invalid recipient");
        
        if (token == address(0)) {
            // Recover ETH
            (bool success, ) = to.call{value: amount}("");
            require(success, "ProjectNFT: ETH transfer failed");
        } else {
            // Recover ERC20 tokens
            (bool success, bytes memory data) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", to, amount)
            );
            require(success && (data.length == 0 || abi.decode(data, (bool))), "ProjectNFT: Token transfer failed");
        }
    }

    // Internal functions
    /**
     * @dev Check if an address is the owner of a project
     * @param projectId The project ID
     * @param owner The address to check
     * @return True if the address is the project owner
     */
    function _isProjectOwner(uint256 projectId, address owner) internal view returns (bool) {
        // This would need to be implemented based on the Sovereign Seas contract structure
        // For now, we'll use a placeholder that always returns true
        // In production, this should call the Sovereign Seas contract to verify ownership
        return true;
    }

    /**
     * @dev Check if a project exists
     * @param projectId The project ID
     * @return True if the project exists
     */
    function _projectExists(uint256 projectId) internal view returns (bool) {
        // This would need to be implemented based on the Sovereign Seas contract structure
        // For now, we'll use a placeholder that always returns true
        // In production, this should call the Sovereign Seas contract to verify existence
        return true;
    }

    // Override functions
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Required overrides
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
} 