require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

// Since we don't have the compiled artifacts yet, let's use minimal ABIs
const PlayGameABI = [
  "function createMatch(bytes32 matchId, address p1, address p2, uint256 stake) external",
  "function matches(bytes32) view returns (address, address, uint256, uint8, uint256, bool, bool)",
  "event MatchCreated(bytes32 indexed matchId, address player1, address player2, uint256 stake)",
  "event Staked(bytes32 indexed matchId, address player, uint256 amount)",
  "event Settled(bytes32 indexed matchId, address winner, uint256 payout)",
  "event Refunded(bytes32 indexed matchId, address player1, address player2, uint256 amount)"
];
const GameTokenABI = [
  "function balanceOf(address owner) view returns (uint256)"
];
const TokenStoreABI = [
  "event Purchase(address indexed buyer, uint256 usdtAmount, uint256 gtOut)"
];

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory data structures instead of SQLite
const players = new Map(); // address => { wins, totalGtWon, matchesPlayed }
const matches = new Map(); // matchId => { player1, player2, stake, winner, status, timestamp }

// Setup ethers provider
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");

// Contract instances
const playGameContract = new ethers.Contract(
  process.env.PLAY_GAME_CONTRACT || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  PlayGameABI,
  provider
);

const gameTokenContract = new ethers.Contract(
  process.env.GAME_TOKEN_CONTRACT || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  GameTokenABI,
  provider
);

const tokenStoreContract = new ethers.Contract(
  process.env.TOKEN_STORE_CONTRACT || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  TokenStoreABI,
  provider
);

// Event Listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Listen for Purchase events
  tokenStoreContract.on('Purchase', async (buyer, usdtAmount, gtOut, event) => {
    console.log(`New Purchase: ${buyer} bought ${ethers.utils.formatEther(gtOut)} GT with ${ethers.utils.formatUnits(usdtAmount, 6)} USDT`);
    
    // Ensure player exists in the memory store
    if (!players.has(buyer)) {
      players.set(buyer, { wins: 0, totalGtWon: '0', matchesPlayed: 0 });
    }
  });
  
  // Listen for Staked events
  playGameContract.on('Staked', async (matchId, player, amount, event) => {
    console.log(`New Stake: ${player} staked ${ethers.utils.formatEther(amount)} GT for match ${matchId}`);
    
    // Ensure player exists in the memory store
    if (!players.has(player)) {
      players.set(player, { wins: 0, totalGtWon: '0', matchesPlayed: 0 });
    }
    
    // Update match in memory
    if (matches.has(matchId)) {
      const match = matches.get(matchId);
      if (player === match.player1) {
        match.player1Staked = true;
      } else if (player === match.player2) {
        match.player2Staked = true;
      }
      
      if (match.player1Staked && match.player2Staked) {
        match.status = 1; // STAKED
        match.startTime = Math.floor(Date.now() / 1000);
      }
    }
  });
  
  // Listen for Settled events
  playGameContract.on('Settled', async (matchId, winner, payout, event) => {
    console.log(`Match Settled: ${winner} won ${ethers.utils.formatEther(payout)} GT in match ${matchId}`);
    
    // Update match in memory
    if (matches.has(matchId)) {
      const match = matches.get(matchId);
      match.status = 2; // SETTLED
      match.winner = winner;
    }
    
    // Update winner stats
    if (!players.has(winner)) {
      players.set(winner, { wins: 1, totalGtWon: ethers.utils.formatEther(payout), matchesPlayed: 1 });
    } else {
      const player = players.get(winner);
      player.wins += 1;
      player.totalGtWon = (parseFloat(player.totalGtWon) + parseFloat(ethers.utils.formatEther(payout))).toString();
      player.matchesPlayed += 1;
    }
    
    // Update players' matches played
    if (matches.has(matchId)) {
      const match = matches.get(matchId);
      if (match.player1 !== winner && players.has(match.player1)) {
        const player = players.get(match.player1);
        player.matchesPlayed += 1;
      }
      if (match.player2 !== winner && players.has(match.player2)) {
        const player = players.get(match.player2);
        player.matchesPlayed += 1;
      }
    }
  });
  
  // Listen for Refunded events
  playGameContract.on('Refunded', async (matchId, player1, player2, amount, event) => {
    console.log(`Match Refunded: ${player1} and ${player2} were refunded ${ethers.utils.formatEther(amount)} GT each for match ${matchId}`);
    
    // Update match in memory
    if (matches.has(matchId)) {
      const match = matches.get(matchId);
      match.status = 3; // REFUNDED
    }
    
    // Update players' matches played
    if (players.has(player1)) {
      const player = players.get(player1);
      player.matchesPlayed += 1;
    }
    if (players.has(player2)) {
      const player = players.get(player2);
      player.matchesPlayed += 1;
    }
  });
  
  // Listen for MatchCreated events
  playGameContract.on('MatchCreated', async (matchId, player1, player2, stake, event) => {
    console.log(`Match Created: ${player1} vs ${player2} with stake ${ethers.utils.formatEther(stake)} GT (ID: ${matchId})`);
    
    // Ensure players exist in memory
    if (!players.has(player1)) {
      players.set(player1, { wins: 0, totalGtWon: '0', matchesPlayed: 0 });
    }
    if (!players.has(player2)) {
      players.set(player2, { wins: 0, totalGtWon: '0', matchesPlayed: 0 });
    }
    
    // Add match to memory
    matches.set(matchId, {
      player1,
      player2,
      stake: ethers.utils.formatEther(stake),
      status: 0, // CREATED
      timestamp: Math.floor(Date.now() / 1000),
      player1Staked: false,
      player2Staked: false,
      winner: null
    });
  });
  
  console.log('Event listeners setup complete');
}

// API Endpoints
app.get('/leaderboard', (req, res) => {
  // Convert map to array, sort by total GT won
  const leaderboardArray = Array.from(players.entries())
    .map(([address, data]) => ({
      address,
      ...data
    }))
    .sort((a, b) => parseFloat(b.totalGtWon) - parseFloat(a.totalGtWon))
    .slice(0, 10);
  
  res.json({
    success: true,
    leaderboard: leaderboardArray
  });
});

app.get('/player/:address', (req, res) => {
  const { address } = req.params;
  
  if (!players.has(address)) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  res.json({
    success: true,
    player: {
      address,
      ...players.get(address)
    }
  });
});

app.get('/matches', (req, res) => {
  // Convert map to array, sort by timestamp
  const matchesArray = Array.from(matches.entries())
    .map(([matchId, data]) => ({
      match_id: matchId,
      ...data
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);
  
  res.json({
    success: true,
    matches: matchesArray
  });
});

// Start the server and listeners
const PORT = process.env.LEADERBOARD_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Leaderboard server running on port ${PORT}`);
  setupEventListeners();
});
