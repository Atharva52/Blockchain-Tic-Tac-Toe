// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GameToken.sol";

/**
 * @title TokenStore
 * @dev Contract for purchasing GameTokens with USDT
 */
contract TokenStore is ReentrancyGuard, Ownable {
    IERC20 public usdt;
    GameToken public gameToken;
    uint256 public gtPerUsdt;
    
    event Purchase(address indexed buyer, uint256 usdtAmount, uint256 gtOut);
    
    /**
     * @dev Constructor that sets the USDT token, GameToken, and conversion rate
     * @param _usdt Address of the USDT token contract (6 decimals)
     * @param _gameToken Address of the GameToken contract (18 decimals)
     * @param _gtPerUsdt Conversion rate (e.g. 1e18 means 1 USDT -> 1 GT)
     */
    constructor(address _usdt, address _gameToken, uint256 _gtPerUsdt) Ownable() {
        usdt = IERC20(_usdt);
        gameToken = GameToken(_gameToken);
        gtPerUsdt = _gtPerUsdt;
    }
    
    /**
     * @dev Purchase GameTokens with USDT
     * @param usdtAmount Amount of USDT to spend (in USDT's 6 decimals)
     */
    function buy(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "Amount must be positive");
        
        // Calculate GT output (converting from USDT's 6 decimals to GT's 18 decimals)
        uint256 gtOut = (usdtAmount * gtPerUsdt) / 1e6;
        
        // Check-Effects-Interactions pattern:
        // 1. Checks (done above)
        // 2. Effects (nothing to update in state)
        // 3. Interactions
        
        // Transfer USDT from user to this contract
        bool success = usdt.transferFrom(msg.sender, address(this), usdtAmount);
        require(success, "USDT transfer failed");
        
        // Mint GT to the user
        gameToken.mint(msg.sender, gtOut);
        
        emit Purchase(msg.sender, usdtAmount, gtOut);
    }
    
    /**
     * @dev Withdraw USDT from contract (owner only)
     * @param to Address to receive the USDT
     * @param amount Amount of USDT to withdraw
     */
    function withdrawUSDT(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Cannot withdraw to zero address");
        require(amount > 0, "Amount must be positive");
        require(amount <= usdt.balanceOf(address(this)), "Insufficient USDT balance");
        
        bool success = usdt.transfer(to, amount);
        require(success, "USDT transfer failed");
    }
}