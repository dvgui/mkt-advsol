import { ethers, getNamedAccounts, deployments } from 'hardhat';

import { BigNumberish } from 'ethers';
import { expect } from 'chai';
import { DanteToken } from '../typechain-types';

const toWei = (n: BigNumberish) => ethers.BigNumber.from(10).pow(18).mul(n);

describe('DanteToken', function () {
  const setupTest = deployments.createFixture(async () => {
    await deployments.fixture(); // ensure you start from a fresh deployments
    const { deployer, testUser } = await getNamedAccounts();

    const danteDeployment = await deployments.get('DanteToken');
    const danteToken = (await ethers.getContractAt('DanteToken', danteDeployment.address)) as DanteToken;

    const testDante = danteToken.connect(await ethers.getSigner(testUser));
    return {
      deployer: {
        address: deployer,
        danteToken
      },
      testUser: {
        address: testUser,
        danteToken: testDante
      }
    };
  });

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe('Dante Contract', function () {
    it('Should deploy danteToken', async function () {
      const { deployer } = await setupTest();
      expect(
        await deployer.danteToken.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), deployer.address)
      );
    });

    describe('Check Roles', function () {
      it('Set owner as Minter', async function () {
        const { deployer, testUser } = await setupTest();
        await expect(
          deployer.danteToken.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), testUser.address)
        ).to.eventually.be.false;
        await deployer.danteToken.grantRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          testUser.address
        );
        await expect(
          deployer.danteToken.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), testUser.address)
        ).to.eventually.be.true;
      });
    });
    describe('Dante', function () {
      it('Should mint a token', async () => {
        const { deployer, testUser } = await setupTest();
        await expect(testUser.danteToken.mint(testUser.address, toWei(100))).to.be.revertedWith(/missing role/);
        await expect(deployer.danteToken.mint(testUser.address, toWei(100))).to.not.be.reverted;
        expect(await deployer.danteToken.balanceOf(testUser.address)).to.equal(toWei(100));
      });
      it('Check cap', async () => {
        const { deployer, testUser } = await setupTest();
        await expect(deployer.danteToken.cap()).to.eventually.equal(toWei(1_000_000_000));
        await expect(deployer.danteToken.mint(testUser.address, toWei(1_000_000_000))).to.emit(
          deployer.danteToken,
          'Transfer'
        );
        await expect(deployer.danteToken.mint(testUser.address, toWei(1))).to.be.revertedWith(
          'ERC20Capped: cap exceeded'
        );
      });
    });
  });
});
