import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

// Globales
let deployer: any;
let userCurrent: any;
let user1: any;
let user2: any;
let user3: any;
let lpToken: any;
let dappToken: any;
let tokenFarm: any;
let tokenFarmAsOwner: any;

let tokenFarmAddr: string;
let dappTokenAddr: any;
let lpTokenAddr: any;

let DAppTokenJsonABI: any;
let LPTokenJsonABI: any;
let TokenFarmJsonABI: any;

let amountToStake: bigint;

const rl = readline.createInterface({ input, output });

// Inicializar
async function initialize() {
  [deployer, user1, user2, user3] = await ethers.getSigners();
  userCurrent = user1;

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const deployPath = path.join(
    __dirname,
    `../ignition/deployments/chain-${chainId}/deployed_addresses.json`
  );

  const addresses = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  dappTokenAddr = addresses["TokenFarmModule#DAppToken"];
  lpTokenAddr = addresses["TokenFarmModule#LPToken"];
  tokenFarmAddr = addresses["TokenFarmModule#TokenFarm"];

  DAppTokenJsonABI = (await import("../artifacts/contracts/DAppToken.sol/DAppToken.json")).default;
  LPTokenJsonABI = (await import("../artifacts/contracts/LPToken.sol/LPToken.json")).default;
  TokenFarmJsonABI = (await import("../artifacts/contracts/TokenFarm.sol/TokenFarm.json")).default;

  updateUserContracts();
  tokenFarmAsOwner = tokenFarm.connect(deployer);
  amountToStake = ethers.parseUnits("5", 18);
}

function updateUserContracts() {
  dappToken = new ethers.Contract(dappTokenAddr, DAppTokenJsonABI.abi, userCurrent);
  lpToken = new ethers.Contract(lpTokenAddr, LPTokenJsonABI.abi, userCurrent);
  tokenFarm = new ethers.Contract(tokenFarmAddr, TokenFarmJsonABI.abi, userCurrent);
}

async function changeUser() {
  const answer = await rl.question("Select user (1, 2, 3): ");
  switch (answer.trim()) {
    case "1":
      userCurrent = user1;
      break;
    case "2":
      userCurrent = user2;
      break;
    case "3":
      userCurrent = user3;
      break;
    default:
      console.log("Invalid user.");
      return;
  }
  updateUserContracts();
  console.log(`Current user: ${userCurrent.address}`);
}

async function setAmountToStake() {
  const answer = await rl.question("Enter amount to stake (whole tokens): ");
  const parsed = parseFloat(answer);
  if (isNaN(parsed) || parsed <= 0) {
    console.log("Invalid number.");
    return;
  }
  amountToStake = ethers.parseUnits(answer, 18);
  console.log(`Amount to stake set to: ${ethers.formatUnits(amountToStake, 18)} LP tokens`);
}

async function mintLPTokens() {
  await lpToken.connect(deployer).mint(userCurrent.address, amountToStake);
  const balance = await lpToken.balanceOf(userCurrent.address);
  console.log("LP Token balance after mint:", ethers.formatUnits(balance, 18));
}

async function approveTokenFarm() {
  await lpToken.connect(userCurrent).approve(tokenFarmAddr, amountToStake);
  const allowance = await lpToken.allowance(userCurrent.address, tokenFarmAddr);
  console.log("Allowance before deposit:", ethers.formatUnits(allowance, 18));
}

async function stakeTokens() {
  await tokenFarm.connect(userCurrent).deposit(amountToStake);
  console.log("Staked tokens.");
}

async function mineBlocks() {
  const answer = await rl.question("Enter number of blocks to mine (1 -10): ");
  const parsed = parseFloat(answer);
  if (isNaN(parsed) || parsed <= 0 || parsed > 10) {
    console.log("Invalid number.");
    return;
  }

  for (let i = 0; i < parsed; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  console.log(`Mined ${parsed} blocks.`);
}

async function distributeRewards() {
  await tokenFarmAsOwner.distributeRewardsAll();
  console.log("Rewards distributed.");
}

async function pendingRewards() {
  const pending = await tokenFarm.pendingRewards();
  console.log("Pending rewards:", ethers.formatUnits(pending, 18));
}

async function claimRewards() {
  await tokenFarm.connect(userCurrent).claimRewards();
  const balance = await dappToken.balanceOf(userCurrent.address);
  console.log("DAPP Token balance:", ethers.formatUnits(balance, 18));  
}

async function withdrawLP() {
  await tokenFarm.connect(userCurrent).withdraw();
  const balance = await lpToken.balanceOf(userCurrent.address);
  console.log("LP Token balance after withdraw:", ethers.formatUnits(balance, 18));
}

const actions: Record<string, () => Promise<void>> = {
  "1": changeUser,
  "2": setAmountToStake,
  "3": mintLPTokens,
  "4": approveTokenFarm,
  "5": stakeTokens,
  "6": mineBlocks,
  "7": distributeRewards,
  "8": claimRewards,
  "9": withdrawLP,
};

async function mainMenu() {
  while (true) {
    console.log("\n=== TokenFarm Contract ===");
    console.log('Mint & Stake Amount:', ethers.formatUnits(amountToStake, 18));
    console.log('Current block:', (await ethers.provider.getBlockNumber()).toString());    
    console.log('Total Staking Balance:', ethers.formatUnits(await tokenFarm.totalStakingBalance(), 18))
    console.log("=== User ===");
    console.log(`Current user: ${userCurrent.address}`);
    console.log("Staking balance:", ethers.formatUnits(await tokenFarm.stakingBalance(), 18));
    console.log("LP Token balance:", ethers.formatUnits(await lpToken.balanceOf(userCurrent.address), 18));
    console.log("DAPP Token balance:", ethers.formatUnits(await dappToken.balanceOf(userCurrent.address), 18));
    console.log("Pending rewards:", ethers.formatUnits(await tokenFarm.pendingRewards(), 18)); 

    console.log("\n=== Menu ===");
    console.log(`1. Change current user
2. Set amount to stake
3. Mint LP tokens
4. Approve TokenFarm
5. Stake tokens
6. Mine blocks
7. Distribute rewards
8. Claim rewards
9. Withdraw LP tokens
0. Exit\n`);

    const answer = await rl.question("Select option: ");
    console.log('')
    if (answer.trim() === "0") break;

    const action = actions[answer.trim()];
    if (action) await action();
    else console.log("Invalid option.");
  }

  rl.close();
  console.log("Goodbye!");
}

initialize()
  .then(mainMenu)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
