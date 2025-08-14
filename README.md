# 🎮 Blockchain Tic-Tac-Toe

### A Decentralized Gaming Platform with On-Chain Token Integration

---

## 📸 Screenshots

<p align="center">
  <img src="assets/screenShot.png" alt="Successful Payout Screenshot" width="500"/>
</p>

---

## ✨ Key Features

-   **On-Chain Staking:** Players stake Game Tokens (GT) before a match to start the game.
-   **Automated Matchmaking:** The system automatically pairs players and starts the game.
-   **On-Chain Payouts:** The winner automatically receives a payout of 2x the staked GT, recorded on the blockchain.
-   **Token Integration:** The platform features a two-token economy with GT and MockUSDT for purchasing game tokens.
-   **Transaction Proof:** A successful payout provides a transaction hash and a link to a block explorer for on-chain verification.

---

## 🛠️ Tech Stack & Architecture

This project is a full-stack decentralized application (dApp) built on a robust architecture that separates the frontend, backend, and on-chain logic.

### Smart Contracts
-   **Solidity:** The core logic is implemented in Solidity for the Ethereum Virtual Machine (EVM).
-   **Hardhat:** Used for local development, testing, and deployment of smart contracts.

### Backend API
-   **Node.js & Express:** Provides a secure API gateway for the frontend.
-   **Ethers.js:** The primary library for interacting with the blockchain, including server-side signing and transaction management.

### Frontend
-   **HTML5, CSS3, JavaScript:** The core technologies for the game's user interface.
-   **Ethers.js:** Used to connect to MetaMask and display real-time wallet information.

---

## 🎯 Matchmaking Logic (Demonstration)

For this submission, the matchmaking process is simulated to provide a seamless end-to-end demonstration.
- Upon connecting a wallet, the frontend immediately simulates a successful matchmaking event.
- It automatically assigns a hardcoded opponent's address and starts the game.
- This allows for a complete walkthrough of the game, staking, and payout flow without requiring two live players.

---

## 🚀 How to Run the Game Locally

Follow these steps to get the project running on your local machine.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Atharva52/Blockchain-Tic-Tac-Toe.git](https://github.com/Atharva52/Blockchain-Tic-Tac-Toe.git)
    cd Blockchain-Tic-Tac-Toe
    ```

2.  **Start the Local Blockchain (Hardhat Node):**
    Open **Terminal 1**, navigate to the `contracts` directory, and run:
    ```bash
    npx hardhat node
    ```

3.  **Start the Backend API Server:**
    Open **Terminal 2**, navigate to the `api` directory, and run:
    ```bash
    npm run dev
    ```

4.  **Serve the Frontend Webpage:**
    Open **Terminal 3**, navigate to the `web` directory, and run:
    ```bash
    npx serve
    ```
    This will provide a local URL (e.g., `http://localhost:5000`) to access the game.

5.  **Play the Game:**
    Open the provided URL in your web browser, connect your MetaMask wallet, and the game will start automatically. Enjoy!

---