const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  try {
    // Deploy MockUSDT for testing
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    console.log("Deploying MockUSDT...");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    console.log("MockUSDT deployed to:", mockUSDT.target);

    // Deploy GameToken
    const GameToken = await ethers.getContractFactory("GameToken");
    console.log("Deploying GameToken...");
    const gameToken = await GameToken.deploy();
    await gameToken.waitForDeployment();
    console.log("GameToken deployed to:", gameToken.target);

    // Deploy TokenStore with conversion rate of 1:1 (1e18 means 1 USDT -> 1 GT)
    const gtPerUsdt = ethers.parseEther("1");
    const TokenStore = await ethers.getContractFactory("TokenStore");
    console.log("Deploying TokenStore...");
    const tokenStore = await TokenStore.deploy(mockUSDT.target, gameToken.target, gtPerUsdt);
    await tokenStore.waitForDeployment();
    console.log("TokenStore deployed to:", tokenStore.target);

    // Set TokenStore in GameToken
    console.log("Setting TokenStore in GameToken...");
    await gameToken.setTokenStore(tokenStore.target);
    console.log("TokenStore set in GameToken");

    // Deploy PlayGame
    const PlayGame = await ethers.getContractFactory("PlayGame");
    console.log("Deploying PlayGame...");
    const playGame = await PlayGame.deploy(gameToken.target);
    await playGame.waitForDeployment();
    console.log("PlayGame deployed to:", playGame.target);

    // For testing: Approve TokenStore to spend USDT
    console.log("Approving TokenStore to spend USDT...");
    const approvalAmount = ethers.parseUnits("1000", 6); // 1000 USDT
    await mockUSDT.approve(tokenStore.target, approvalAmount);
    console.log("Approved TokenStore to spend USDT");

    console.log("Deployment complete!");
    
    // Return contract addresses for easy reference
    return {
      usdt: mockUSDT.target,
      gameToken: gameToken.target,
      tokenStore: tokenStore.target,
      playGame: playGame.target
    };
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then((addresses) => {
    console.log("Contract addresses:", addresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });