// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @dev A mock USDT token with 6 decimals for testing
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**6); // Mint 1,000,000 USDT to deployer
    }
    
    function decimals() public view virtual override returns (uint8) {
        return 6; // USDT has 6 decimals
    }
}