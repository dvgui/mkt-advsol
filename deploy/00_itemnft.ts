import { promises as fs } from 'fs';
import { ethers, getNamedAccounts, upgrades } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { DeployFunction } from 'hardhat-deploy/types';
import { THardhatRuntimeEnvironmentExtended } from '../types/THardhatRuntimeEnvironmentExtended';
import { HeroNFT } from '../typechain-types';

const func: DeployFunction = async (hre: THardhatRuntimeEnvironmentExtended) => {
  const { deployer } = await getNamedAccounts();
  // provider workaround, upgrades library does not support custom signer
  const feeData = await ethers.provider.getFeeData();
  const DanteItemFactory = (await ethers.getContractFactory('DanteItemNFT')) as unknown as ContractFactory;
  upgrades.silenceWarnings();

  const deployData = DanteItemFactory.getDeployTransaction();
  const gasLimit = await DanteItemFactory.signer.estimateGas(deployData);

  if ((await hre.getChainId()) !== '31337') {
    console.log(
      `Deploying with ${deployer} balance ${ethers.utils.formatEther(
        await ethers.provider.getBalance(deployer)
      )} w cost ${ethers.utils.formatEther(gasLimit.mul(feeData.gasPrice as BigNumber))}`
    );
  }
  const itemNFT = (await upgrades.deployProxy(DanteItemFactory, {
    kind: 'uups'
  })) as unknown as HeroNFT;
  await itemNFT.deployed();

  await fs.writeFile(`./itemnft-address.txt`, itemNFT.address);
  if ((await hre.getChainId()) !== '31337') {
    console.log(`DanteItemNFT deployed at ${itemNFT.address}`);
  }
};
export default func;
func.tags = ['DanteItemNFT'];
