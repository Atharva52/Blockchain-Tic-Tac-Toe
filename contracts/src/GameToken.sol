// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameToken
 * @dev ERC20 token for the gaming platform with controlled minting
 */
contract GameToken is ERC20, Ownable {
    address public tokenStore;
    
    event Minted(address indexed to, uint256 amount);
    
    constructor() ERC20("GameToken", "GT") Ownable() {}
    
    /**
     * @dev Sets the address of the TokenStore contract that is allowed to mint tokens
     * @param _tokenStore Address of the TokenStore contract
     */
    function setTokenStore(address _tokenStore) external onlyOwner {
        tokenStore = _tokenStore;
    }
    
    /**
     * @dev Mints new tokens, only callable by the TokenStore contract
     * @param to Address to receive the newly minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == tokenStore, "Only TokenStore can mint");
        _mint(to, amount);
        emit Minted(to, amount);
    }
}