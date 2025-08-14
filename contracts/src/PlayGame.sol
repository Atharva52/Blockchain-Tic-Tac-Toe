// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PlayGame
 * @dev Contract for managing game matches, stakes, and payouts
 */
contract PlayGame is ReentrancyGuard, Ownable {
    IERC20 public gameToken;
    address public operator;
    uint256 public matchTimeout = 24 hours;
    
    enum MatchStatus { CREATED, STAKED, SETTLED, REFUNDED }
    
    struct Match {
        address player1;
        address player2;
        uint256 stake;
        MatchStatus status;
        uint256 startTime;
        bool player1Staked;
        bool player2Staked;
    }
    
    mapping(bytes32 => Match) public matches;
    
    event MatchCreated(bytes32 indexed matchId, address player1, address player2, uint256 stake);
    event Staked(bytes32 indexed matchId, address player, uint256 amount);
    event Settled(bytes32 indexed matchId, address winner, uint256 payout);
    event Refunded(bytes32 indexed matchId, address player1, address player2, uint256 amount);
    
    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Caller is not operator or owner");
        _;
    }
    
    /**
     * @dev Constructor that sets the GameToken address
     * @param _gameToken Address of the GameToken contract
     */
    constructor(address _gameToken) Ownable() {
        gameToken = IERC20(_gameToken);
        operator = msg.sender;
    }
    
    /**
     * @dev Set the operator address (only callable by owner)
     * @param _operator Address of the new operator
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Operator cannot be zero address");
        operator = _operator;
    }
    
    /**
     * @dev Set the match timeout period (only callable by owner)
     * @param _timeout New timeout in seconds
     */
    function setMatchTimeout(uint256 _timeout) external onlyOwner {
        matchTimeout = _timeout;
    }
    
    /**
     * @dev Create a new match (only callable by operator or owner)
     * @param matchId Unique identifier for the match
     * @param p1 Address of player 1
     * @param p2 Address of player 2
     * @param stake Amount of GT to be staked by each player
     */
    function createMatch(bytes32 matchId, address p1, address p2, uint256 stake) external onlyOperator {
        require(p1 != address(0) && p2 != address(0), "Players cannot be zero address");
        require(p1 != p2, "Players must be different");
        require(stake > 0, "Stake must be positive");
        require(matches[matchId].status == MatchStatus.CREATED, "Match already exists");
        
        matches[matchId] = Match({
            player1: p1,
            player2: p2,
            stake: stake,
            status: MatchStatus.CREATED,
            startTime: 0,
            player1Staked: false,
            player2Staked: false
        });
        
        emit MatchCreated(matchId, p1, p2, stake);
    }
    
    /**
     * @dev Players stake their tokens for a match
     * @param matchId ID of the match to stake for
     */
    function stake(bytes32 matchId) external nonReentrant {
        Match storage game = matches[matchId];
        
        require(game.status == MatchStatus.CREATED, "Match not in CREATED state");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player in this match");
        
        if (msg.sender == game.player1) {
            require(!game.player1Staked, "Player 1 already staked");
            game.player1Staked = true;
        } else {
            require(!game.player2Staked, "Player 2 already staked");
            game.player2Staked = true;
        }
        
        // Transfer tokens from player to contract
        bool success = gameToken.transferFrom(msg.sender, address(this), game.stake);
        require(success, "Token transfer failed");
        
        emit Staked(matchId, msg.sender, game.stake);
        
        // If both players have staked, update match status to STAKED
        if (game.player1Staked && game.player2Staked) {
            game.status = MatchStatus.STAKED;
            game.startTime = block.timestamp;
        }
    }
    
    /**
     * @dev Commit the result of a match (only callable by operator)
     * @param matchId ID of the match
     * @param winner Address of the winning player
     */
    function commitResult(bytes32 matchId, address winner) external onlyOperator nonReentrant {
        Match storage game = matches[matchId];
        
        require(game.status == MatchStatus.STAKED, "Match not in STAKED state");
        require(winner == game.player1 || winner == game.player2, "Winner must be a player");
        
        // Calculate payout (2 * stake)
        uint256 payout = game.stake * 2;
        
        // Update match status
        game.status = MatchStatus.SETTLED;
        
        // Transfer payout to winner
        bool success = gameToken.transfer(winner, payout);
        require(success, "Token transfer failed");
        
        emit Settled(matchId, winner, payout);
    }
    
    /**
     * @dev Refund stakes if match times out without a result
     * @param matchId ID of the match to refund
     */
    function refund(bytes32 matchId) external nonReentrant {
        Match storage game = matches[matchId];
        
        require(game.status == MatchStatus.STAKED, "Match not in STAKED state");
        require(block.timestamp > game.startTime + matchTimeout, "Match timeout not reached");
        
        // Update match status
        game.status = MatchStatus.REFUNDED;
        
        // Refund stakes to players
        if (game.player1Staked) {
            bool success1 = gameToken.transfer(game.player1, game.stake);
            require(success1, "Player 1 refund failed");
        }
        
        if (game.player2Staked) {
            bool success2 = gameToken.transfer(game.player2, game.stake);
            require(success2, "Player 2 refund failed");
        }
        
        emit Refunded(matchId, game.player1, game.player2, game.stake);
    }
}