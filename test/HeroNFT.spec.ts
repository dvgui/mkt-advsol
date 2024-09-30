import { ethers, getNamedAccounts, upgrades } from 'hardhat';
import { BigNumberish } from 'ethers';
import { expect } from 'chai';
import { HeroNFT } from '../typechain-types';

const toBN = (n: BigNumberish) => ethers.BigNumber.from(n);

describe('HeroNFT', () => {
  let heroNFT: HeroNFT;

  beforeEach('Setup', async () => {
    const { testUser } = await getNamedAccounts();

    const HeroNFTFactory = await ethers.getContractFactory('HeroNFT');
    heroNFT = (await upgrades.deployProxy(HeroNFTFactory, ['Legend of Dante Hero', 'HERO'], {
      kind: 'uups'
    })) as HeroNFT;

    const { minter, pauser } = await getNamedAccounts();
    await heroNFT.grantRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), minter);
    await expect(heroNFT.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), minter)).to.eventually.be
      .true;
    await heroNFT.grantRole(ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']), pauser);
    await expect(heroNFT.hasRole(ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']), pauser)).to.eventually.be
      .true;

    await expect(heroNFT.totalSupply()).to.eventually.equal(toBN(0));
    await expect(heroNFT.balanceOf(testUser)).to.eventually.equal(toBN(0));
    await expect(heroNFT.safeMint(testUser, 1)).to.emit(heroNFT, 'Mint');
  });

  describe('Role tests', () => {
    it('Should mint an nft', async () => {
      const { testUser } = await getNamedAccounts();
      await expect(heroNFT.totalSupply()).to.eventually.equal(toBN(1));
      await expect(heroNFT.balanceOf(testUser)).to.eventually.equal(toBN(1));
      await expect(heroNFT.tokenURI(0)).to.eventually.equal('https://api.legendofdante.com/tokens/hero/0');
      await expect(heroNFT.tokenTypes(0)).to.eventually.equal(1);
    });

    it('Should not mint an nft from an invalid minter', async () => {
      const { testUser } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);
      await expect(heroNFT.totalSupply()).to.eventually.equal(toBN(1));
      await expect(heroNFT.balanceOf(testUser)).to.eventually.equal(toBN(1));
      await expect(heroNFT.connect(testSigner).safeMint(testUser, 1)).to.be.reverted;
      await expect(heroNFT.totalSupply()).to.eventually.equal(toBN(1));
      await expect(heroNFT.balanceOf(testUser)).to.eventually.equal(toBN(1));
    });

    it('Should burn an nft and fail for invalid user', async () => {
      const { testUser, newOwner } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);
      const newSigner = await ethers.getSigner(newOwner);
      await expect(heroNFT.totalSupply()).to.eventually.equal(toBN(1));
      await expect(heroNFT.balanceOf(testUser)).to.eventually.equal(toBN(1));
      await expect(heroNFT.connect(newSigner).burn(toBN(0))).to.be.revertedWith(
        'ERC721: caller is not token owner or approved'
      );
      await expect(heroNFT.connect(testSigner).burn(toBN(0))).to.not.be.reverted;
      await expect(heroNFT.totalSupply()).to.eventually.equal(toBN(0));
      await expect(heroNFT.balanceOf(testUser)).to.eventually.equal(toBN(0));
    });

    it('Pause', async () => {
      const { testUser } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);
      await expect(heroNFT.connect(testSigner).pause()).to.be.revertedWith(/missing role/);
      await heroNFT.pause();
      await expect(heroNFT.safeMint(testUser, 1)).to.be.revertedWith('Pausable: paused');
      await expect(heroNFT.connect(testSigner).unpause()).to.be.revertedWith(/missing role/);
      await heroNFT.unpause();
      await expect(heroNFT.safeMint(testUser, 1)).to.emit(heroNFT, 'Mint');
    });

    it('Should upgrade', async () => {
      const HeroNFTFactory = await ethers.getContractFactory('HeroNFT');
      await expect(upgrades.upgradeProxy(heroNFT, HeroNFTFactory)).to.not.be.reverted;
    });

    it('Should support 721', async () => {
      const ERC721InterfaceId = '0x80ac58cd';
      await expect(heroNFT.supportsInterface(ERC721InterfaceId)).to.eventually.become(true);
    });
  });

  describe('Whitelist', () => {
    it('Should control access for enabling and disabling whitelists', async () => {
      const { testUser } = await getNamedAccounts();
      await expect(heroNFT.setWhitelistEnabled(false)).to.not.be.reverted;
      const testSigner = await ethers.getSigner(testUser);
      await expect(heroNFT.connect(testSigner).setWhitelistEnabled(true)).to.be.reverted;
    });

    it('Should control access for adding whitelist addresses', async () => {
      const { testUser } = await getNamedAccounts();
      await expect(heroNFT.addWhitelist(testUser)).to.not.be.reverted;
      const testSigner = await ethers.getSigner(testUser);
      await expect(heroNFT.connect(testSigner).addWhitelist(testUser)).to.be.reverted;
    });

    it('Should allow transfers when whitelist is disabled', async () => {
      const { testUser, newOwner } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);

      await expect(heroNFT.safeMint(testUser, 1)).to.emit(heroNFT, 'Mint');

      await expect(heroNFT.setWhitelistEnabled(true)).to.not.be.reverted;
      await expect(heroNFT.connect(testSigner).transferFrom(testUser, newOwner, 1)).to.be.reverted;

      await expect(heroNFT.setWhitelistEnabled(false)).to.not.be.reverted;
      await expect(heroNFT.connect(testSigner).transferFrom(testUser, newOwner, 1)).to.not.be.reverted;
    });

    it('Should allow transfers when address is whitelisted', async () => {
      const { testUser, newOwner } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);

      await expect(heroNFT.safeMint(testUser, 1)).to.emit(heroNFT, 'Mint');
      await expect(heroNFT.safeMint(testUser, 2)).to.emit(heroNFT, 'Mint');

      await expect(heroNFT.setWhitelistEnabled(true)).to.not.be.reverted;
      // await heroNFT.approve(testUser, 1);
      await expect(heroNFT.connect(testSigner).transferFrom(testUser, newOwner, 1)).to.be.revertedWith(
        'Transfer Not Allowed'
      );

      await expect(heroNFT.addWhitelist(testUser)).to.not.be.reverted;
      await expect(heroNFT.connect(testSigner).transferFrom(testUser, newOwner, 1)).to.not.be.reverted;

      await expect(heroNFT.removeWhitelist(testUser)).to.not.be.reverted;
      await expect(heroNFT.connect(testSigner).transferFrom(testUser, newOwner, 2)).to.be.revertedWith(
        'Transfer Not Allowed'
      );
    });
    describe('Cap tests', () => {
      it('Should add a cap', async () => {
        const { testUser, newOwner } = await getNamedAccounts();
        const testSigner = await ethers.getSigner(testUser);
        await expect(heroNFT.safeMint(testUser, 1)).to.emit(heroNFT, 'Mint');
        await expect(heroNFT.updateCap(1, 1)).to.be.revertedWith('Cap is smaller than supply');
        let supply = (await heroNFT.typeSupply(1)).toNumber();

        await expect(heroNFT.updateCap(1, supply + 1))
          .to.emit(heroNFT, 'CapUpdated')
          .withArgs(1, supply + 1);

        await expect(heroNFT.safeMint(testUser, 1)).to.emit(heroNFT, 'Mint');

        await expect(heroNFT.safeMint(testUser, 1)).to.be.revertedWith('Hero Cap reached for that type');
      });
    });
  });
});
