import { promises as fs } from 'fs';
import { ethers, getNamedAccounts, deployments, upgrades } from 'hardhat';

import { BigNumber } from 'ethers';
import { DeployFunction } from 'hardhat-deploy/types';
import { THardhatRuntimeEnvironmentExtended } from '../types/THardhatRuntimeEnvironmentExtended';
import { toWei } from '../test/utils';

const localChainId = '31337';

const func: DeployFunction = async (hre: THardhatRuntimeEnvironmentExtended) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  // const chainId = await getChainId();
  const feeData = await ethers.provider.getFeeData();
  const DanteTokenFactory = await ethers.getContractFactory('DanteToken');

  /*   const danteToken = await upgrades.deployProxy(
    DanteTokenFactory,
    [deployer, toWei(1_000_000_000), 'Dante Token', 'DANTE'],
    {
      kind: 'uups',
      initializer: 'initialize'
    }
  ); */
  await deploy('DanteToken', {
    args: [deployer, toWei(1_000_000_000), 'Dante Token', 'DANTE'],
    from: deployer,
    log: true
  });

  // await danteToken.deployed();
  const danteToken = await deployments.get('DanteToken');

  await fs.writeFile(`./dante-address.txt`, danteToken.address);
  if ((await hre.getChainId()) !== '31337') {
    console.log(`Dante Token deployed at ${danteToken.address}`);
  }
};
export default func;
func.tags = ['DanteToken'];
