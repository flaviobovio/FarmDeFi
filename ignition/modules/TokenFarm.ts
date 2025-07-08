import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenFarmModule = buildModule("TokenFarmModule", (m) => {

  const owner = m.getAccount(0);

  const lpToken = m.contract("contracts/LPToken.sol:LPToken", [owner]);
  const dappToken = m.contract("contracts/DAppToken.sol:DAppToken", [owner]);
  const tokenFarm = m.contract("contracts/TokenFarm.sol:TokenFarm", [dappToken, lpToken]);

  // Transferir ownership de DAppToken al TokenFarm
  m.call(dappToken, "transferOwnership", [tokenFarm]);

  return { lpToken, dappToken, tokenFarm };
});

export default TokenFarmModule;
