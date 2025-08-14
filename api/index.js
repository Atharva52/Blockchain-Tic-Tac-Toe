// index.js
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Your private keys and contract configurations
// ⚠️ WARNING: For development only. Never hardcode private keys in a production environment.
const privateKeys = [

    "5e8cc05dae710a2da5ea05d1122fe626c15e32ca5b647e4e6b1443275c118629", // Player 1

    "59c6995e998f97a5a0044966f0995389dc9e86dae88c7a8412f4603b6b78690d"  // Player 2

];

const wallets = privateKeys.map(key => new ethers.Wallet(key));

// Replace these with your actual deployed contract addresses and ABIs
const CONTRACT_ADDRESSES = {
    usdt: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    gameToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    tokenStore: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    playGame: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
};

const contractABI = [
    // PASTE YOUR PLAYGAME.JSON ABI HERE
];
const rpcUrl = "http://127.0.0.1:8545";

const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Automated Matchmaking Endpoint
app.post('/api/start-auto-game', async (req, res) => {
    console.log('API call received to start automated game.');
    try {
        const player1 = wallets[0];
        const player2 = wallets[1];
        const signer = player1.connect(provider);
        const gameContract = new ethers.Contract(CONTRACT_ADDRESSES.playGame, contractABI, signer);

        console.log(`Attempting to start game between Player 1 (${player1.address}) and Player 2 (${player2.address})...`);

        const transactionResponse = await gameContract.startNewGame(player2.address);
        await transactionResponse.wait();

        console.log(`Game started successfully! Transaction Hash: ${transactionResponse.hash}`);
        res.status(200).json({
            message: 'Game started successfully',
            transactionHash: transactionResponse.hash,
            player1: player1.address,
            player2: player2.address
        });
    } catch (error) {
        console.error('Failed to start automated game:', error);
        res.status(500).json({
            message: 'Failed to start game',
            error: error.message
        });
    }
});

// Buy GT Endpoint
app.post('/api/buy-gt', async (req, res) => {
    const { usdtAmount } = req.body;
    try {
        const player = wallets[0];
        const signer = player.connect(provider);

        const tokenStoreABI = [
            {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"buy","outputs":[],"stateMutability":"nonpayable","type":"function"}
        ];
        const tokenStoreContract = new ethers.Contract(CONTRACT_ADDRESSES.tokenStore, tokenStoreABI, signer);

        const usdtABI = [
            {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
        ];
        const usdtContract = new ethers.Contract(CONTRACT_ADDRESSES.usdt, usdtABI, signer);

        const amountWei = ethers.utils.parseEther(usdtAmount);
        console.log(`Approving TokenStore to spend ${usdtAmount} USDT...`);
        const approveTx = await usdtContract.approve(CONTRACT_ADDRESSES.tokenStore, amountWei);
        await approveTx.wait();

        console.log(`Buying ${usdtAmount} GT...`);
        const buyTx = await tokenStoreContract.buy(amountWei);
        await buyTx.wait();

        console.log("GT purchase successful!");
        res.status(200).json({ success: true, message: "GT purchase successful!" });
    } catch (error) {
        console.error("Failed to buy GT:", error);
        res.status(500).json({ success: false, message: "Failed to buy GT due to server error." });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});