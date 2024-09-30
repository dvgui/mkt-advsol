import { promises as fs } from 'fs';
import { ethers, getNamedAccounts, upgrades } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { BigNumber } from 'ethers';
import { THardhatRuntimeEnvironmentExtended } from '../types/THardhatRuntimeEnvironmentExtended';
import { Marketplace } from '../typechain-types';

const func: DeployFunction = async (hre: THardhatRuntimeEnvironmentExtended) => {
  // const { deploy } = deployments;
  const { deployer, treasury } = await getNamedAccounts();
  const test = (await hre.getChainId()) === '31337';
  let danteAddress = '0xB4D50ec9765D01509dCaD4Aa332295177b88FC5E';
  if (test) {
    danteAddress = await fs.readFile(`./dante-address.txt`, 'utf8');
  }
  const feeData = await ethers.provider.getFeeData();
  const MarketplaceFactory = await ethers.getContractFactory('Marketplace');
  upgrades.silenceWarnings();
  const deployData = await MarketplaceFactory.getDeployTransaction();
  const gasLimit = await MarketplaceFactory.signer.estimateGas(deployData);

  if ((await hre.getChainId()) !== '31337') {
    console.log(
      `Deploying with ${deployer} balance ${ethers.utils.formatEther(
        await ethers.provider.getBalance(deployer)
      )} w cost ${ethers.utils.formatEther(gasLimit.mul(feeData.gasPrice as BigNumber))}`
    );
  }
  const marketplace = (await upgrades.deployProxy(
    MarketplaceFactory,
    [danteAddress, 2_00, 2_00, test ? treasury : deployer],
    {
      kind: 'uups'
    }
  )) as unknown as Marketplace;

  await marketplace.deployed();

  await fs.writeFile(`./marketplace-address.txt`, marketplace.address);
  if ((await hre.getChainId()) !== '31337') {
    console.log(`Marketplace deployed at ${marketplace.address}`);
  }
};
export default func;
func.tags = ['Marketplace'];
