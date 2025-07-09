import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Signer } from "ethers";
import { DAppToken, LPToken, TokenFarm } from "../typechain-types";
//import { bigint } from "hardhat/internal/core/params/argumentTypes";

describe("TokenFarm - Full Flow", function () {
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;

  let dappToken: DAppToken;
  let lpToken: LPToken;
  let tokenFarm: TokenFarm;

  const initialSupply = ethers.parseEther("10000");

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();



    const LPTokenFactory = await ethers.getContractFactory("LPToken");
    lpToken = await LPTokenFactory.deploy(await owner.getAddress()) as LPToken;
    await lpToken.waitForDeployment();
    

    const DAppTokenFactory = await ethers.getContractFactory("DAppToken");
    dappToken = await DAppTokenFactory.deploy(await owner.getAddress()) as DAppToken;
    await dappToken.waitForDeployment();

    const TokenFarmFactory = await ethers.getContractFactory("TokenFarm");
    tokenFarm = await TokenFarmFactory.deploy(
      await dappToken.getAddress(),
      await lpToken.getAddress()
    ) as TokenFarm;
    await tokenFarm.waitForDeployment();

    await dappToken.connect(owner).transferOwnership(await tokenFarm.getAddress());

    // Mint LP tokens al owner antes de transferir a user1 y user2
    await lpToken.connect(owner).mint(owner.getAddress(), initialSupply * BigInt(2)); 

    await lpToken.connect(owner).transfer(await user1.getAddress(), initialSupply);
    await lpToken.connect(owner).transfer(await user2.getAddress(), initialSupply);

    await lpToken.connect(user1).approve(await tokenFarm.getAddress(), initialSupply);
    await lpToken.connect(user2).approve(await tokenFarm.getAddress(), initialSupply);
  });

  it("permite depositar, distribuir y reclamar recompensas proporcionalmente", async () => {

    await network.provider.send("evm_setAutomine", [false]);

    const deposit1 = ethers.parseEther("100");
    const deposit2 = ethers.parseEther("300");

    await tokenFarm.connect(user1).deposit(deposit1);
    await tokenFarm.connect(user2).deposit(deposit2);

    await network.provider.send("evm_mine");  
    await network.provider.send("evm_setAutomine", [true]);


    const blockBefore = await ethers.provider.getBlockNumber();

    for (let i = 0; i < 10; i++) {
      await network.provider.send("evm_mine");
    }



    const checkpoint1 = (await tokenFarm.stakersDetail(user1.getAddress())).checkpoint;    
    console.log("Checkpoint de user1:", checkpoint1.toString());
    const checkpoint2 = (await tokenFarm.stakersDetail(user1.getAddress())).checkpoint;    
    console.log("Checkpoint de user2:", checkpoint2.toString());


    const blockAfter = await ethers.provider.getBlockNumber();
    const blocksPassed = blockAfter - blockBefore;

    console.log('BLOCKS', '\nBefore:', blockBefore, '\nAfter:', blockAfter, '\nPassed:', blocksPassed);



    await tokenFarm.connect(owner).distributeRewardsAll();


    console.log('Block after distribute', await ethers.provider.getBlockNumber())

    await tokenFarm.connect(user1).claimRewards();
    await tokenFarm.connect(user2).claimRewards();

    const reward1 = await dappToken.balanceOf(await user1.getAddress());
    const reward2 = await dappToken.balanceOf(await user2.getAddress());

    const total = deposit1 + deposit2;
    const expectedReward1 = (BigInt(blocksPassed+1) * deposit1 * 10n ** 18n) / total;
    const expectedReward2 = (BigInt(blocksPassed) * deposit2 * 10n ** 18n) / total;

    console.log(`Total   : ${(BigInt(blocksPassed) * total * 10n ** 18n)}`);
    console.log(`Reward 1: ${reward1} -> Expected ${expectedReward1}`);
    console.log(`Reward 2: ${reward2} -> Expected ${expectedReward2}`);    

    expect(reward1).to.equal(expectedReward1);
    expect(reward2).to.equal(expectedReward2);
  });

  it("permite retirar tokens LP", async () => {
    const amount = ethers.parseEther("100");
    await tokenFarm.connect(user1).deposit(amount);

    await network.provider.send("evm_mine");
    await tokenFarm.connect(owner).distributeRewardsAll();
    await tokenFarm.connect(user1).withdraw();

    const staker = await tokenFarm.stakersDetail(await user1.getAddress());
    expect(staker.stakingBalance).to.equal(0);
    expect(await lpToken.balanceOf(await user1.getAddress())).to.equal(initialSupply);
  });

  it("reclamar sin recompensas da error", async () => {
    await expect(tokenFarm.connect(user1).claimRewards()).to.be.revertedWith("No rewards to claim");
  });
});
