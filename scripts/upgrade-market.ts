import { ContractFactory } from 'ethers';
import { ethers, upgrades } from 'hardhat';

async function main() {
  const ProxyUpgrade = (await ethers.getContractFactory('Marketplace')) as unknown as ContractFactory; // Replace with your contract name
  const proxyAddress = '0xE74222Fed24DCFa7Ab59CD8d37789DE9A217bc46'; // Replace with your proxy address
  const proxy = await upgrades.upgradeProxy(proxyAddress, ProxyUpgrade);
  console.log('Proxy upgraded:', proxy.address);
}

main();
