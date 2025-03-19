//0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b



// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockCELO
 * @dev A simple ERC20 token that mimics CELO for testing purposes
 */
contract MockCELO is ERC20, Ownable(msg.sender) {
    /**
     * @dev Constructor that gives the msg.sender all existing tokens
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Initial supply is 0
    }

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * @return A boolean that indicates if the operation was successful
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        _mint(to, amount);
        return true;
    }
}
