import { ContractFactory } from 'ethers';
import { ethers, upgrades } from 'hardhat';

async function main() {
  const ProxyUpgrade = (await ethers.getContractFactory('DanteItemNFT')) as unknown as ContractFactory; // Replace with your contract name
  const proxyAddress = '0x89D55600845DB97FA76f4D216E21E05A276aD252'; // Replace with your proxy address
  const proxy = await upgrades.upgradeProxy(proxyAddress, ProxyUpgrade);
  console.log('Proxy upgraded:', proxy.address);
}

main();
