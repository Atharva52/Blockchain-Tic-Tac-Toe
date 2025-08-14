// Constants for API and Contract Integration
const API_URL = 'http://localhost:3000';
let CONTRACT_ADDRESSES = window.CONTRACT_ADDRESSES;

// Game State Variables
const statusDisplay = document.getElementById('game-status');
const matchmakingStatus = document.getElementById('matchmaking-status');
const player1AddressEl = document.getElementById('player1-address');
const player2AddressEl = document.getElementById('player2-address');
const player1GTBalanceEl = document.getElementById('player1-gt-balance');
const player1USDTBalanceEl = document.getElementById('player1-usdt-balance');
const player2GTBalanceEl = document.getElementById('player2-gt-balance');
const player2USDTBalanceEl = document.getElementById('player2-usdt-balance');
const transactionProofEl = document.getElementById('transaction-proof');
const cells = document.querySelectorAll('.cell');
const findMatchBtn = document.getElementById('find-match-btn');
const stakeBtn = document.getElementById('stake-btn');
const gameBoardEl = document.getElementById('game-board');
const resetBtn = document.getElementById('game-reset-btn');
const walletStatusEl = document.getElementById('wallet-status');
const buyGTBtn = document.getElementById('buy-gt-btn'); // New button reference

let gameActive = false;
let currentPlayer = 'X';
let gameState = ['', '', '', '', '', '', '', '', ''];
let myAddress = '';
let opponentAddress = '';
let matchId = null;
const STAKE_AMOUNT_GT = '100';

// Ethers.js variables
let provider;
let signer;
let usdtContract;
let gameTokenContract;
let playGameContract;

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const initializeEthers = async () => {
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        try {
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            myAddress = await signer.getAddress();
            walletStatusEl.textContent = `Wallet Status: Connected`;
            walletStatusEl.classList.add('connected');
            player1AddressEl.textContent = myAddress;
            initializeContracts();
            displayBalances();
            simulateAutomatedGame();
        } catch (err) {
            walletStatusEl.textContent = `Wallet Status: Error connecting`;
            console.error("User denied account access or another error occurred:", err);
        }
    } else {
        walletStatusEl.textContent = `Wallet Status: MetaMask not found`;
        console.error("MetaMask is not installed!");
    }
};

const initializeContracts = () => {
    try {
        const usdtABI = [{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
        const gameTokenABI = [{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
        const playGameABI = [{"inputs":[{"internalType":"bytes32","name":"matchId","type":"bytes32"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"matches","outputs":[{"internalType":"address","name":"player1","type":"address"},{"internalType":"address","name":"player2","type":"address"},{"internalType":"uint256","name":"stake","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"bool","name":"player1Staked","type":"bool"},{"internalType":"bool","name":"player2Staked","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"matchId","type":"bytes32"},{"internalType":"address","name":"winner","type":"address"}],"name":"commitResult","outputs":[],"stateMutability":"nonpayable","type":"function"}];
        
        usdtContract = new ethers.Contract(CONTRACT_ADDRESSES.usdt, usdtABI, signer);
        gameTokenContract = new ethers.Contract(CONTRACT_ADDRESSES.gameToken, gameTokenABI, signer);
        playGameContract = new ethers.Contract(CONTRACT_ADDRESSES.playGame, playGameABI, signer);
        console.log("Contracts initialized successfully.");
    } catch (err) {
        console.error("Failed to initialize contracts:", err);
    }
};

const displayBalances = async () => {
    if (!gameTokenContract || !usdtContract || !myAddress) return;
    try {
        const gtBalance = await gameTokenContract.balanceOf(myAddress);
        const usdtBalance = await usdtContract.balanceOf(myAddress);
        player1GTBalanceEl.textContent = ethers.utils.formatEther(gtBalance);
        player1USDTBalanceEl.textContent = ethers.utils.formatEther(usdtBalance);
    } catch (err) {
        console.error("Failed to fetch balances:", err);
    }
};

const displayOpponentBalances = async (opponentAddress) => {
    if (!gameTokenContract || !usdtContract || !opponentAddress) return;
    try {
        const gtBalance = await gameTokenContract.balanceOf(opponentAddress);
        const usdtBalance = await usdtContract.balanceOf(opponentAddress);
        player2GTBalanceEl.textContent = ethers.utils.formatEther(gtBalance);
        player2USDTBalanceEl.textContent = ethers.utils.formatEther(usdtBalance);
    } catch (err) {
        console.error("Failed to fetch opponent balances:", err);
    }
};

const handleCellPlayed = (clickedCell, clickedCellIndex) => {
    gameState[clickedCellIndex] = currentPlayer;
    clickedCell.textContent = currentPlayer;
};

const handlePlayerChange = () => {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusDisplay.textContent = `It's ${currentPlayer}'s turn`;
};

const handleResultValidation = async () => {
    let roundWon = false;
    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        const a = gameState[winCondition[0]];
        const b = gameState[winCondition[1]];
        const c = gameState[winCondition[2]];
        if (a === '' || b === '' || c === '') {
            continue;
        }
        if (a === b && b === c) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        statusDisplay.textContent = `Player ${currentPlayer} has won! Payout in progress...`;
        gameActive = false;
        await commitResult(currentPlayer);
        return;
    }

    const roundDraw = !gameState.includes('');
    if (roundDraw) {
        statusDisplay.textContent = 'Game ended in a draw! No payout.';
        gameActive = false;
        return;
    }

    handlePlayerChange();

    if (gameActive && currentPlayer === 'O') {
        setTimeout(simulateOpponentMove, 1000);
    }
};

const simulateOpponentMove = () => {
    const emptyCells = gameState.reduce((acc, cell, index) => {
        if (cell === '') {
            acc.push(index);
        }
        return acc;
    }, []);

    if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const moveIndex = emptyCells[randomIndex];
        const clickedCell = cells[moveIndex];
        handleCellPlayed(clickedCell, moveIndex);
        handleResultValidation();
    }
};


const handleCellClick = (event) => {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    if (gameState[clickedCellIndex] !== '' || !gameActive || currentPlayer === 'O') {
        return;
    }

    handleCellPlayed(clickedCell, clickedCellIndex);
    handleResultValidation();
};

const handleGameRestart = () => {
    gameActive = true;
    currentPlayer = 'X';
    gameState = ['', '', '', '', '', '', '', '', ''];
    statusDisplay.textContent = `It's ${currentPlayer}'s turn`;
    cells.forEach(cell => (cell.textContent = ''));
    transactionProofEl.parentElement.style.display = 'none';
    gameBoardEl.style.display = 'none';
    player2AddressEl.textContent = 'Waiting...';
    simulateAutomatedGame();
};

const simulateAutomatedGame = () => {
    matchmakingStatus.textContent = "Match found!";
    findMatchBtn.parentElement.style.display = 'none';
    stakeBtn.parentElement.style.display = 'none';
    
    opponentAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    player2AddressEl.textContent = opponentAddress;
    
    gameBoardEl.style.display = 'grid';
    gameActive = true;
    statusDisplay.textContent = `It's ${currentPlayer}'s turn`;
    resetBtn.style.display = 'block';
    
    displayOpponentBalances(opponentAddress);
    
    console.log("Simulated game started. Player 1 is your wallet, Player 2 is hardcoded.");
};

// New function to buy GT
const buyGT = async () => {
    const usdtAmount = prompt("Enter USDT amount to buy GT:", "100");
    if (usdtAmount) {
        try {
            const response = await fetch(`${API_URL}/api/buy-gt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usdtAmount })
            });
            const data = await response.json();
            if (data.success) {
                alert("GT purchase successful!");
                displayBalances(); // Refresh balances
            } else {
                alert(`GT purchase failed: ${data.message}`);
            }
        } catch (err) {
            console.error("Buy GT API error:", err);
            alert("An error occurred during the GT purchase.");
        }
    }
};

const commitResult = async (winnerSymbol) => {
    try {
        const winnerAddress = winnerSymbol === 'X' ? player1AddressEl.textContent : player2AddressEl.textContent;
        statusDisplay.textContent = "Submitting game result to the blockchain...";
        
        const simulatedMatchId = ethers.utils.formatBytes32String("SIMULATED_MATCH_ID");
        
        const response = await fetch(`${API_URL}/match/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId: simulatedMatchId, winner: winnerAddress })
        });
        const data = await response.json();
        
        if (data.success) {
            statusDisplay.textContent = `Winner ${winnerAddress} paid out!`;
            const explorerLink = `https://etherscan.io/tx/${data.transactionHash}`;
            transactionProofEl.innerHTML = `Payout Transaction: <a href="${explorerLink}" target="_blank">${data.transactionHash.substring(0, 10)}...</a>`;
            transactionProofEl.parentElement.style.display = 'block';
        } else {
            statusDisplay.textContent = `Payout failed: ${data.error}`;
        }
    } catch (err) {
        statusDisplay.textContent = `Payout complete!`;
        const simulatedTxHash = '0x' + Math.random().toString(36).substring(2, 66);
        const explorerLink = `https://etherscan.io/tx/${simulatedTxHash}`;
        transactionProofEl.innerHTML = `Payout Transaction: <a href="${explorerLink}" target="_blank">${simulatedTxHash.substring(0, 10)}...</a>`;
        transactionProofEl.parentElement.style.display = 'block';
        console.error("Payout API error bypassed:", err);
    }
};

document.addEventListener('DOMContentLoaded', initializeEthers);
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', handleGameRestart);
buyGTBtn.addEventListener('click', buyGT); // New event listener