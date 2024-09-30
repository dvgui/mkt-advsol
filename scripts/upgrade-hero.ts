import { ContractFactory } from 'ethers';
import { ethers, upgrades } from 'hardhat';

async function main() {
  const ProxyUpgrade = (await ethers.getContractFactory('HeroNFT')) as unknown as ContractFactory; // Replace with your contract name
  const proxyAddress = '0x510ad9a538E89a331c26298E84db77DA1c5548F9'; // Replace with your proxy address
  const proxy = await upgrades.upgradeProxy(proxyAddress, ProxyUpgrade);
  console.log('Proxy upgraded:', proxy.address);
}

main();
