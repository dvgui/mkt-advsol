import { promises as fs } from 'fs';
import { ethers, getNamedAccounts, deployments, upgrades, getChainId } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';

import { DeployFunction } from 'hardhat-deploy/types';
import { THardhatRuntimeEnvironmentExtended } from '../types/THardhatRuntimeEnvironmentExtended';
import { getMnemonic } from '../hardhat.config';
import { HeroNFT } from '../typechain-types';

const func: DeployFunction = async (hre: THardhatRuntimeEnvironmentExtended) => {
  const { deployer } = await getNamedAccounts();
  const feeData = await ethers.provider.getFeeData();
  const HeroFactory = (await ethers.getContractFactory('HeroNFT')) as unknown as ContractFactory;
  upgrades.silenceWarnings();
  const deployData = await HeroFactory.getDeployTransaction();
  const gasLimit = await HeroFactory.signer.estimateGas(deployData);
  if ((await hre.getChainId()) !== '31337') {
    console.log(
      `Deploying with ${deployer} balance ${ethers.utils.formatEther(
        await ethers.provider.getBalance(deployer)
      )} w cost ${ethers.utils.formatEther(gasLimit.mul(feeData.gasPrice as BigNumber))}`
    );
  }
  const heroNFT = (await upgrades.deployProxy(HeroFactory, ['Legend of Dante Hero', 'HERO'], {
    kind: 'uups'
  })) as unknown as HeroNFT;
  await heroNFT.deployed();
  await fs.writeFile(`./heronft-address.txt`, heroNFT.address);
  if ((await hre.getChainId()) !== '31337') {
    console.log(`HeroNFT deployed at ${heroNFT.address}`);
  }
};
export default func;
func.tags = ['HeroNFT'];
