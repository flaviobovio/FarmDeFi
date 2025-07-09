import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

// Importar ABI de los contratos
import LPTokenJsonABI from "../artifacts/contracts/LPToken.sol/LPToken.json";
import DAppTokenJsonABI from "../artifacts/contracts/DAppToken.sol/DAppToken.json";
import TokenFarmJsonABI from "../artifacts/contracts/TokenFarm.sol/TokenFarm.json";

async function main() {
  const [deployer, user1] = await ethers.getSigners();

  // Obtener chainId correctamente
  const chainIdHex = await network.provider.send("eth_chainId");
  const chainId = parseInt(chainIdHex, 16);

  // Leer direcciones desde archivo Ignition
  const deployPath = path.join(
    __dirname,
    `../ignition/deployments/chain-${chainId}/deployed_addresses.json`
  );

  console.log("Reading deployed addresses from:", deployPath);
  console.log("User1:", user1.address);

  const addresses = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  const dappTokenAddr = addresses["TokenFarmModule#DAppToken"];
  const lpTokenAddr = addresses["TokenFarmModule#LPToken"];
  const tokenFarmAddr = addresses["TokenFarmModule#TokenFarm"];
  console.log("DAppToken Address:", dappTokenAddr);
  console.log("LPToken Address:", lpTokenAddr);
  console.log("TokenFarm Address:", tokenFarmAddr);

  // Instanciar contratos
  const dappToken = new ethers.Contract(dappTokenAddr, DAppTokenJsonABI.abi, user1) as any;
  const lpToken = new ethers.Contract(lpTokenAddr, LPTokenJsonABI.abi, user1) as any;
  const tokenFarm = new ethers.Contract(tokenFarmAddr, TokenFarmJsonABI.abi, user1) as any;
  const tokenFarmAsOwner = tokenFarm.connect(deployer);

  const amountToStake = ethers.parseUnits("100", 18);
  console.log("Amount to stake:", amountToStake);

  console.log('Current block', (await ethers.provider.getBlockNumber()).toString());
  
  // Mint LP tokens para user1
  console.log("Minting LP tokens to user1...");
  await lpToken.connect(deployer).mint(user1.address, amountToStake);

  console.log("user1", user1.address);
  const balance = await lpToken.balanceOf(user1.address);
  console.log("LP Token balance after mint:", ethers.formatUnits(balance, 18));





  // Aprobar al contrato TokenFarm para mover LP
  console.log("Approving TokenFarm to spend LP...");
  await lpToken.connect(user1).approve(tokenFarmAddr, amountToStake);
  
  const allowance = await lpToken.allowance(user1.address, tokenFarmAddr);
  console.log("Allowance before deposit:", ethers.formatUnits(allowance, 18));

  // Staking
  console.log("Depositing LP tokens...");
  await tokenFarm.connect(user1).deposit(amountToStake);

  
  // Simular paso del tiempo (minar bloques)
  console.log('Current block', (await ethers.provider.getBlockNumber()).toString());
  console.log("Mining 5 blocks...");
  for (let i = 0; i < 5; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  console.log('Current block', (await ethers.provider.getBlockNumber()).toString());


  
  // Distribuir recompensas
  console.log("Distributing rewards...");
  await tokenFarmAsOwner.distributeRewardsAll();

  // Verificar recompensas pendientes before claiming
  const pendingBefore = await tokenFarm.pendingRewards();
  console.log(`Pending rewards before claim:`, ethers.formatUnits(pendingBefore, 18));
  
  // Reclamar recompensas
  console.log("Claiming rewards...");
  await tokenFarm.connect(user1).claimRewards();

  const dappBalance = await dappToken.balanceOf(user1.address);
  console.log("DAPP balance:", ethers.formatUnits(dappBalance, 18));


  // Verificar recompensas pendientes after claiming
  const pendingAfter = await tokenFarm.pendingRewards();
  console.log(`Pending rewards after claim:`, ethers.formatUnits(pendingAfter, 18));
  

  let lpBalance = await lpToken.balanceOf(user1.address);
  console.log("LP balance :", ethers.formatUnits(lpBalance, 18));

  // Retirar LP tokens
  console.log("Withdrawing LP...");
  await tokenFarm.connect(user1).withdraw();

  lpBalance = await lpToken.balanceOf(user1.address);
  console.log("LP balance after withdraw:", ethers.formatUnits(lpBalance, 18));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});



