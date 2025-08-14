// server.js
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const port = 52204; // Use the same port as your frontend

// ⚠️ WARNING: For development only. Never hardcode private keys in a production environment.
// These keys will be used to sign transactions to the blockchain.
const privateKeys = [
    "5e8cc05dae710a2da5ea05d1122fe626c15e32ca5b647e4e6b1443275c118629", // Player 1
    "59c6995e998f97a5a0044966f0995389dc9e86dae88c7a8412f4603b6b78690d"  // Player 2
];

// Configuration for your smart contract and blockchain network
const contractABI = [
    // Add your smart contract's ABI here.
    // Example: { "inputs": [{"internalType": "address","name": "playerTwo", ... }], "name": "startNewGame", ... }
];
const contractAddress = "your_contract_address_here";
const rpcUrl = "http://127.0.0.1:8545"; // Example: Ganache default RPC URL

// Create wallet objects from the private keys
const wallets = privateKeys.map(key => new ethers.Wallet(key));

// Create a provider to connect to the blockchain network
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Automatically create a game between the two configured players
async function createAutomatedGame() {
    try {
        const player1 = wallets[0];
        const player2 = wallets[1];

        // Signer is the wallet that will send the transaction (Player 1)
        const signer = player1.connect(provider);

        // Create an instance of your smart contract
        const gameContract = new ethers.Contract(contractAddress, contractABI, signer);

        console.log(`Attempting to start game between Player 1 (${player1.address}) and Player 2 (${player2.address})...`);

        // Call the smart contract function to start a new game
        // The function signature here (e.g., `startNewGame`) depends on your contract.
        const transactionResponse = await gameContract.startNewGame(player2.address);
        await transactionResponse.wait(); // Wait for the transaction to be confirmed on the blockchain

        console.log(`Game started successfully! Transaction Hash: ${transactionResponse.hash}`);
        return { success: true, transactionHash: transactionResponse.hash };

    } catch (error) {
        console.error('Failed to start automated game:', error);
        return { success: false, error: error.message };
    }
}

// API endpoint to trigger the automated game creation
app.post('/api/start-auto-game', async (req, res) => {
    console.log('API call received to start automated game.');
    const result = await createAutomatedGame();
    if (result.success) {
        res.status(200).json({ message: 'Game started successfully', transactionHash: result.transactionHash });
    } else {
        res.status(500).json({ message: 'Failed to start game', error: result.error });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});