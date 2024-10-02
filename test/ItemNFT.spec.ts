import { ethers, getNamedAccounts, upgrades } from 'hardhat';
import { BigNumberish } from 'ethers';
import { expect } from 'chai';
import { DanteItemNFT } from '../typechain-types';

const toBN = (n: BigNumberish) => ethers.BigNumber.from(n);
const data = '0x12345678';

describe('itemNFT', () => {
  let itemNFT: DanteItemNFT;

  beforeEach('Setup', async () => {
    const { testUser } = await getNamedAccounts();

    const DanteItemNFTFactory = await ethers.getContractFactory('DanteItemNFT');
    itemNFT = (await upgrades.deployProxy(DanteItemNFTFactory, {
      kind: 'uups'
    })) as unknown as DanteItemNFT;

    const { minter, pauser } = await getNamedAccounts();
    await itemNFT.grantRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), minter);
    await expect(itemNFT.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), minter)).to.eventually.be
      .true;
    await itemNFT.grantRole(ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']), pauser);
    await expect(itemNFT.hasRole(ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']), pauser)).to.eventually.be
      .true;

    await expect(itemNFT.totalSupply(0)).to.eventually.equal(toBN(0));
    await expect(itemNFT.balanceOf(testUser, 0)).to.eventually.equal(toBN(0));
    await expect(itemNFT.mint(testUser, 0, 1, data)).to.emit(itemNFT, 'TransferSingle');
  });

  describe('Role tests', () => {
    it('Should mint an nft', async () => {
      const { testUser } = await getNamedAccounts();
      await expect(itemNFT.totalSupply(0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.balanceOf(testUser, 0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.uri(0)).to.eventually.equal('https://nft-dev.api.dev.dantegames.com/api/p/nft/items/');
    });

    it('Should not mint an nft from an invalid minter', async () => {
      const { testUser } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);
      await expect(itemNFT.totalSupply(0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.balanceOf(testUser, 0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.connect(testSigner).mint(testUser, 1, 1, data)).to.be.reverted;
      await expect(itemNFT.totalSupply(0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.balanceOf(testUser, 0)).to.eventually.equal(toBN(1));
    });

    it('Should burn an nft and fail for invalid user', async () => {
      const { testUser, newOwner } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);
      const newSigner = await ethers.getSigner(newOwner);
      await expect(itemNFT.totalSupply(0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.balanceOf(testUser, 0)).to.eventually.equal(toBN(1));
      await expect(itemNFT.connect(newSigner).burn(testUser, 0, 1)).to.be.revertedWith(
        'ERC1155: caller is not token owner or approved'
      );
      await expect(itemNFT.connect(testSigner).burn(testSigner.address, 0, 1)).to.not.be.reverted;
      await expect(itemNFT.totalSupply(0)).to.eventually.equal(toBN(0));
      await expect(itemNFT.balanceOf(testUser, 0)).to.eventually.equal(toBN(0));
    });

    it('Pause', async () => {
      const { testUser } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);
      await expect(itemNFT.connect(testSigner).pause()).to.be.revertedWith(/missing role/);
      await itemNFT.pause();
      await expect(itemNFT.mint(testUser, 0, 1, data)).to.be.revertedWith('Pausable: paused');
      await expect(itemNFT.connect(testSigner).unpause()).to.be.revertedWith(/missing role/);
      await itemNFT.unpause();
      await expect(itemNFT.mint(testUser, 0, 1, data)).to.emit(itemNFT, 'TransferSingle');
    });

    it('Should upgrade', async () => {
      const itemNFTFactory = await ethers.getContractFactory('DanteItemNFT');
      await expect(upgrades.upgradeProxy(itemNFT, itemNFTFactory)).to.not.be.reverted;
    });
  });

  describe('Whitelist', () => {
    it('Should control access for enabling and disabling whitelists', async () => {
      const { testUser } = await getNamedAccounts();
      await expect(itemNFT.setWhitelistEnabled(false)).to.not.be.reverted;
      const testSigner = await ethers.getSigner(testUser);
      await expect(itemNFT.connect(testSigner).setWhitelistEnabled(true)).to.be.reverted;
    });

    it('Should control access for adding whitelist addresses', async () => {
      const { testUser } = await getNamedAccounts();
      await expect(itemNFT.addWhitelist(testUser)).to.not.be.reverted;
      const testSigner = await ethers.getSigner(testUser);
      await expect(itemNFT.connect(testSigner).addWhitelist(testUser)).to.be.reverted;
    });

    it('Should allow transfers when whitelist is disabled', async () => {
      const { testUser, newOwner } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);

      await expect(itemNFT.mint(testUser, 0, 1, data)).to.emit(itemNFT, 'TransferSingle');

      await expect(itemNFT.setWhitelistEnabled(true)).to.not.be.reverted;
      await expect(itemNFT.connect(testSigner).safeTransferFrom(testUser, newOwner, 0, 1, data)).to.be.reverted;

      await expect(itemNFT.setWhitelistEnabled(false)).to.not.be.reverted;
      await expect(itemNFT.connect(testSigner).safeTransferFrom(testUser, newOwner, 0, 1, data)).to.not.be.reverted;
    });

    it('Should allow transfers when address is whitelisted', async () => {
      const { testUser, newOwner } = await getNamedAccounts();
      const testSigner = await ethers.getSigner(testUser);

      await expect(itemNFT.mint(testUser, 0, 1, data)).to.emit(itemNFT, 'TransferSingle');
      await expect(itemNFT.mint(testUser, 0, 1, data)).to.emit(itemNFT, 'TransferSingle');

      await expect(itemNFT.setWhitelistEnabled(true)).to.not.be.reverted;
      // await itemNFT.approve(testUser, 1);
      await expect(itemNFT.connect(testSigner).safeTransferFrom(testUser, newOwner, 0, 1, data)).to.be.revertedWith(
        'Transfer Not Allowed'
      );

      await expect(itemNFT.addWhitelist(testUser)).to.not.be.reverted;
      await expect(itemNFT.connect(testSigner).safeTransferFrom(testUser, newOwner, 0, 1, data)).to.not.be.reverted;

      await expect(itemNFT.removeWhitelist(testUser)).to.not.be.reverted;
      await expect(itemNFT.connect(testSigner).safeTransferFrom(testUser, newOwner, 0, 1, data)).to.be.revertedWith(
        'Transfer Not Allowed'
      );
    });
    describe('Cap tests', () => {
      it('Should add a cap', async () => {
        const { testUser, newOwner } = await getNamedAccounts();
        const testSigner = await ethers.getSigner(testUser);
        await expect(itemNFT.mint(testUser, 1, 1, data)).to.emit(itemNFT, 'TransferSingle');
        await expect(itemNFT.updateCap(1, 1)).to.be.revertedWith('Cap is smaller than supply');
        let supply = (await itemNFT.totalSupply(1)).toNumber();

        await expect(itemNFT.updateCap(1, supply + 1))
          .to.emit(itemNFT, 'CapUpdated')
          .withArgs(1, supply + 1);

        await expect(itemNFT.mint(testUser, 1, 1, data)).to.emit(itemNFT, 'TransferSingle');

        await expect(itemNFT.mint(testUser, 1, 1, data)).to.be.revertedWithCustomError(itemNFT, 'ItemCapReached');
      });
      it('batch cap test', async () => {
        const { testUser, newOwner } = await getNamedAccounts();
        const testSigner = await ethers.getSigner(testUser);
        await expect(itemNFT.mintBatch(testUser, [1, 2], [1, 2], data)).to.emit(itemNFT, 'TransferBatch');
        await expect(itemNFT.updateCap(1, 1)).to.be.revertedWith('Cap is smaller than supply');
        let supply = (await itemNFT.totalSupply(1)).toNumber();
        let supply2 = (await itemNFT.totalSupply(2)).toNumber();

        await expect(itemNFT.updateCap(1, supply + 1))
          .to.emit(itemNFT, 'CapUpdated')
          .withArgs(1, supply + 1);
        await expect(itemNFT.updateCap(2, supply2 + 1))
          .to.emit(itemNFT, 'CapUpdated')
          .withArgs(2, supply2 + 1);

        await expect(itemNFT.mint(testUser, 1, 1, data)).to.emit(itemNFT, 'TransferSingle');

        await expect(itemNFT.mintBatch(testUser, [1], [1], data)).to.be.revertedWithCustomError(
          itemNFT,
          'ItemCapReached'
        );
        await expect(itemNFT.mint(testUser, 2, 1, data)).to.emit(itemNFT, 'TransferSingle');
      });
    });
  });
});
