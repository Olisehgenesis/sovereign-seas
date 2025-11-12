// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockBroker
 * @dev Minimal mock broker for testing purposes
 */
contract MockBroker {
    function swapIn(address, bytes32, address, address, uint256, uint256) external pure returns (uint256) {
        revert("Mock broker - swap not implemented");
    }
    
    function getAmountOut(address, bytes32, address, address, uint256) external pure returns (uint256) {
        return 0;
    }
    
    function exchangeProviders(uint256) external pure returns (address) {
        return address(0);
    }
}

