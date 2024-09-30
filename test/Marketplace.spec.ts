import { promises as fs } from 'fs';
import { ethers, getNamedAccounts, deployments, upgrades } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumberish } from 'ethers';
import { expect } from 'chai';
import { getMnemonic } from '../hardhat.config';
import { THardhatRuntimeEnvironmentExtended } from '../types/THardhatRuntimeEnvironmentExtended';
import { DanteItemNFT, DanteToken, HeroNFT, Marketplace } from '../typechain-types';

// const toEther = (n: BigNumberish) => ethers.utils.formatEther(n);
const toBN = (n: BigNumberish) => ethers.BigNumber.from(n);
const toWei = (n: BigNumberish) => ethers.BigNumber.from(10).pow(18).mul(n);

const setupTest = deployments.createFixture(async (hre: THardhatRuntimeEnvironmentExtended) => {
  await deployments.fixture(); // ensure you start from a fresh deployments
  const { deployer, testUser, newOwner } = await getNamedAccounts();

  const danteAddress = await fs.readFile(`./dante-address.txt`, 'utf8');
  const danteToken = (await ethers.getContractAt('DanteToken', danteAddress)) as DanteToken;

  const MarketplaceFactory = await ethers.getContractFactory('Marketplace');
  const auction = (await upgrades.deployProxy(MarketplaceFactory, [danteToken.address, 200, 200, deployer], {
    kind: 'uups'
  })) as unknown as Marketplace;
  await auction.deployed();
  const heronftAddress = await fs.readFile(`./heronft-address.txt`);
  const nft = (await ethers.getContractAt('HeroNFT', heronftAddress.toString())) as HeroNFT;
  const itemnftAddress = await fs.readFile(`./itemnft-address.txt`);
  const item = (await ethers.getContractAt('DanteItemNFT', itemnftAddress.toString())) as DanteItemNFT;

  const signer = ethers.Wallet.fromMnemonic(getMnemonic()).connect(hre.ethers.provider);

  const testSigner = await ethers.getSigner(testUser);
  const testAuction = auction.connect(testSigner);
  const testDante = danteToken.connect(testSigner);
  const testNft = nft.connect(testSigner);
  const testItem = item.connect(testSigner);

  const ownerSigner = await ethers.getSigner(newOwner);
  const ownerAuction = auction.connect(ownerSigner);
  const ownerDante = danteToken.connect(ownerSigner);
  const ownerNft = nft.connect(ownerSigner);
  const ownerItem = item.connect(ownerSigner);

  return {
    deployer: {
      address: deployer,
      auction,
      danteToken,
      nft,
      item
    },
    newOwner: {
      address: ownerSigner.address,
      auction: ownerAuction,
      danteToken: ownerDante,
      nft: ownerNft,
      item: ownerItem
    },
    testUser: {
      address: testUser,
      signer: testSigner,
      auction: testAuction,
      danteToken: testDante,
      nft: testNft,
      item: testItem
    }
  };
});

//    await deployments.fixture(["Distributor"]);
//    await deployments.fixture(["TestToken"]);

describe('Auction Contract', async () => {
  describe('Setup', async () => {
    it('Should deploy Marketplace', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      expect((await deployer.auction.auctionFee()).toString()).to.equal(toBN(200).toString());
    });

    it('Should deploy danteToken', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      expect(
        await deployer.danteToken.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), deployer.address)
      ).to.equal(true);
      await deployer.danteToken.mint(deployer.address, toWei(100));
      expect(await deployer.danteToken.balanceOf(deployer.address)).to.equal(toWei(100));
    });

    it('Should deploy HeroNFT', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      expect(
        await deployer.nft.hasRole(ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']), deployer.address)
      ).to.equal(true);
    });

    it('Should mint a Dante token and allow it for auction', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      expect(await deployer.danteToken.balanceOf(testUser.address)).to.equal(0);
      await deployer.nft.safeMint(testUser.address, 1);
      expect(await deployer.nft.balanceOf(testUser.address)).to.equal(1);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);
    });
  });
  describe('Auctions', async () => {
    it('Should Create an Auction', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(deployer.address, 1);
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 0);
      expect(await deployer.nft.getApproved(0)).to.equal(deployer.auction.address);
      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const endedAt = (await time.latest()) + auctionDuration;
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);
      await deployer.auction.addNFT(deployer.nft.address);
      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(2) // base price
        )
      ).to.not.be.reverted;
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(1);
    });
    it('Should Create 2 Auctions', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(deployer.address, 1);
      await deployer.nft.safeMint(deployer.address, 1);
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 0);
      expect(await deployer.nft.getApproved(0)).to.equal(deployer.auction.address);
      expect(await deployer.nft.getApproved(1)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 1);
      expect(await deployer.nft.getApproved(1)).to.equal(deployer.auction.address);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const endedAt = (await time.latest()) + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);
      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(2) // base price
        )
      ).to.not.be.reverted;
      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          1, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(2) // base price
        )
      ).to.not.be.reverted;
      const openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(2);
      await expect(deployer.auction.getAuctions([openAuctions[1]])).to.not.be.reverted;
      expect((await deployer.auction.getAuctions(openAuctions)).length).to.equal(2);
    });
    it('Should place a bid', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(deployer.address, 1);
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 0);
      expect(await deployer.nft.getApproved(0)).to.equal(deployer.auction.address);
      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const saletime = await time.latest();
      const endedAt = saletime + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);

      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(1000) // base price
        )
      ).to.not.be.reverted;
      const openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(1);
      await expect(testUser.auction.bid(openAuctions[0], toWei(1))).to.be.revertedWith(
        'Bid is smaller than the required increment. Aborting.'
      );
      await expect(testUser.auction.bid(openAuctions[0], toWei(50))).to.be.revertedWith(
        'ERC20: insufficient allowance'
      );
      await testUser.danteToken.approve(deployer.auction.address, toWei(100));
      await expect(testUser.auction.bid(openAuctions[0], toWei(50))).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
      await deployer.danteToken.mint(testUser.address, toWei(5000));
      await expect(testUser.auction.bid(openAuctions[0], toWei(50)))
        .to.emit(testUser.auction, 'AuctionBid')
        .withArgs(testUser.address, toWei(50), openAuctions[0]);
    });
    it('Should place a second bid', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(deployer.address, 1);
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 0);
      expect(await deployer.nft.getApproved(0)).to.equal(deployer.auction.address);
      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const saletime = await time.latest();
      const endedAt = saletime + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);

      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(1000) // base price
        )
      ).to.not.be.reverted;
      const openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(1);
      await expect(testUser.auction.bid(openAuctions[0], toWei(1))).to.be.revertedWith(
        'Bid is smaller than the required increment. Aborting.'
      );
      await expect(testUser.auction.bid(openAuctions[0], toWei(50))).to.be.revertedWith(
        'ERC20: insufficient allowance'
      );
      await testUser.danteToken.approve(deployer.auction.address, toWei(100));
      await expect(testUser.auction.bid(openAuctions[0], toWei(50))).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
      await deployer.danteToken.mint(testUser.address, toWei(5000));
      const passingBid = toWei(50);
      await expect(testUser.auction.bid(openAuctions[0], passingBid))
        .to.emit(testUser.auction, 'AuctionBid')
        .withArgs(testUser.address, toWei(50), openAuctions[0]);

      // same as above, now new test
      await newOwner.danteToken.approve(deployer.auction.address, toWei(5000));
      await deployer.danteToken.mint(newOwner.address, toWei(5000));
      // 4% fails
      await expect(
        newOwner.auction.bid(openAuctions[0], passingBid.add(passingBid.mul(4).div(100)))
      ).to.be.revertedWith('Bid is smaller than the required increment. Aborting.');

      // 5% passes
      await expect(newOwner.auction.bid(openAuctions[0], passingBid.add(passingBid.mul(5).div(100))))
        .to.emit(deployer.auction, 'AuctionBid')
        .withArgs(newOwner.address, passingBid.add(passingBid.mul(5).div(100)), openAuctions[0]);
    });

    it('Should settle auction with bids', async () => {
      // previous tests
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(deployer.address, 1);
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 0);
      expect(await deployer.nft.getApproved(0)).to.equal(deployer.auction.address);
      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const saletime = await time.latest();
      const endedAt = saletime + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);

      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(1000) // base price
        )
      ).to.not.be.reverted;
      let openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(1);
      await expect(testUser.auction.bid(openAuctions[0], toWei(1))).to.be.revertedWith(
        'Bid is smaller than the required increment. Aborting.'
      );
      await expect(testUser.auction.bid(openAuctions[0], toWei(50))).to.be.revertedWith(
        'ERC20: insufficient allowance'
      );
      await testUser.danteToken.approve(deployer.auction.address, toWei(100));
      await expect(testUser.auction.bid(openAuctions[0], toWei(50))).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
      await deployer.danteToken.mint(testUser.address, toWei(5000));
      const passingBid = toWei(50);
      await expect(testUser.auction.bid(openAuctions[0], passingBid))
        .to.emit(testUser.auction, 'AuctionBid')
        .withArgs(testUser.address, toWei(50), openAuctions[0]);

      // same as above, now new test
      await newOwner.danteToken.approve(deployer.auction.address, toWei(5000));
      await deployer.danteToken.mint(newOwner.address, toWei(5000));
      // 4% fails
      await expect(
        newOwner.auction.bid(openAuctions[0], passingBid.add(passingBid.mul(4).div(100)))
      ).to.be.revertedWith('Bid is smaller than the required increment. Aborting.');

      // 5% passes
      await expect(newOwner.auction.bid(openAuctions[0], passingBid.add(passingBid.mul(5).div(100))))
        .to.emit(deployer.auction, 'AuctionBid')
        .withArgs(newOwner.address, passingBid.add(passingBid.mul(5).div(100)), openAuctions[0]);

      // begin new

      await deployer.nft.safeMint(testUser.address, 1);
      await testUser.nft.approve(deployer.auction.address, 1);

      await testUser.auction.createSale(
        true, // is721
        deployer.nft.address, // nft address
        1, // nft token id
        1, // erc1151 token amount - irrelevant here
        endedAt, // auction end timestamp
        toWei(100) // base price
      );
      // refresh auctions
      openAuctions = await deployer.auction.getOpenAuctions();
      await expect(newOwner.auction.bid(openAuctions[1], toWei(80))).to.emit(deployer.auction, 'AuctionBid');
      await expect(testUser.auction.acceptOffer(openAuctions[1]))
        .to.emit(testUser.auction, 'AuctionSettled')
        .withArgs(openAuctions[1]);
    });
    it('Should cancel auction', async () => {
      // previous tests
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(testUser.address, 1);
      await deployer.danteToken.mint(testUser.address, toWei(1000));
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await testUser.nft.approve(testUser.auction.address, 0);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const saletime = await time.latest();
      const endedAt = saletime + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);
      const price = toWei(1000);
      await expect(
        testUser.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          price // base price
        )
      ).to.not.be.reverted;
      await expect(testUser.nft.balanceOf(testUser.address)).to.eventually.equal(0);
      let openAuctions = await deployer.auction.getOpenAuctions();
      await expect(newOwner.auction.cancelAuction(openAuctions[0])).to.be.revertedWith(
        "Auction can't be cancelled, only by seller or admin. Aborting."
      );
      // pay fee
      await expect(testUser.auction.cancelAuction(openAuctions[0])).to.be.revertedWith('ERC20: insufficient allowance');
      // give 2% fee allowance
      await testUser.danteToken.approve(testUser.auction.address, price.mul(2).div(100));
      await expect(testUser.auction.cancelAuction(openAuctions[0]))
        .to.emit(testUser.auction, 'AuctionCancelled')
        .withArgs(openAuctions[0]);
      openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(0);
      await expect(testUser.nft.balanceOf(testUser.address)).to.eventually.equal(1);
    });
    it('Should sell with instant purchase', async () => {
      // previous tests
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(testUser.address, 1);
      await deployer.danteToken.mint(newOwner.address, toWei(1000));
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await testUser.nft.approve(testUser.auction.address, 0);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const saletime = await time.latest();
      const endedAt = saletime + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);
      const price = toWei(1000);
      await expect(
        testUser.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          price // base price
        )
      ).to.not.be.reverted;
      await expect(testUser.nft.balanceOf(testUser.address)).to.eventually.equal(0);
      await expect(testUser.nft.balanceOf(newOwner.address)).to.eventually.equal(0);
      let openAuctions = await deployer.auction.getOpenAuctions();
      await newOwner.danteToken.approve(newOwner.auction.address, price);
      await expect(newOwner.auction.buy(openAuctions[0]))
        .to.emit(newOwner.auction, 'AuctionSettled')
        .withArgs(openAuctions[0]);
      openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(0);
      await expect(testUser.nft.balanceOf(newOwner.address)).to.eventually.equal(1);
    });
    it('Should sell with instant purchase 1155', async () => {
      // previous tests
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.item.mint(testUser.address, 1, 100, []);
      await deployer.danteToken.mint(newOwner.address, toWei(1000));
      await expect(deployer.item.isApprovedForAll(testUser.address, testUser.auction.address)).to.eventually.equal(
        false
      );
      await expect(testUser.item.setApprovalForAll(testUser.auction.address, true))
        .to.emit(testUser.item, 'ApprovalForAll')
        .withArgs(testUser.address, testUser.auction.address, true);
      await expect(deployer.item.addWhitelist(deployer.auction.address))
        .to.emit(deployer.item, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const saletime = await time.latest();
      const endedAt = saletime + auctionDuration;
      const price = toWei(1000);
      await expect(
        testUser.auction.createSale(
          false, // is721
          deployer.item.address, // nft address
          1, // nft token id
          100, // erc1151 token amount
          endedAt, // auction end timestamp
          price // base price
        )
      ).to.be.revertedWith('NFT unauthorized for sale');

      await deployer.auction.addNFT(deployer.item.address);
      await expect(testUser.item.isApprovedForAll(testUser.address, testUser.auction.address)).to.eventually.equal(
        true
      );
      await expect(testUser.item.balanceOf(testUser.address, 1)).to.eventually.equal(100);
      await expect(
        testUser.auction.createSale(
          false, // is721
          deployer.item.address, // nft address
          1, // nft token id
          100, // erc1151 token amount
          endedAt, // auction end timestamp
          price // base price
        )
      ).to.emit(testUser.auction, 'AuctionCreated');

      await expect(testUser.item.balanceOf(testUser.address, 1)).to.eventually.equal(0);
      let openAuctions = await deployer.auction.getOpenAuctions();
      await newOwner.danteToken.approve(newOwner.auction.address, price);
      await expect(newOwner.auction.buy(openAuctions[0]))
        .to.emit(newOwner.auction, 'AuctionSettled')
        .withArgs(openAuctions[0]);
      openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(0);
      await expect(testUser.item.balanceOf(testUser.address, 1)).to.eventually.equal(0);
      await expect(testUser.item.balanceOf(newOwner.address, 1)).to.eventually.equal(100);
    });
  });
  describe('Admin', async () => {
    it('Should Cancel All Auctions', async () => {
      const { deployer, testUser, newOwner } = await setupTest();
      await deployer.nft.safeMint(deployer.address, 1);
      await deployer.nft.safeMint(deployer.address, 1);
      expect(await deployer.nft.getApproved(0)).to.equal(ethers.constants.AddressZero);
      await deployer.nft.approve(deployer.auction.address, 0);
      await deployer.nft.approve(deployer.auction.address, 1);
      await expect(deployer.nft.addWhitelist(deployer.auction.address))
        .to.emit(deployer.nft, 'AddedWhitelist')
        .withArgs(deployer.auction.address);

      expect(await deployer.nft.getApproved(0)).to.equal(deployer.auction.address);
      // empty array = no auctions
      expect((await deployer.auction.getOpenAuctions()).length).to.equal(0);
      // create a finish date 10 blocks after now
      const auctionDuration = 86_400; // one day
      const endedAt = (await time.latest()) + auctionDuration;
      await deployer.auction.addNFT(deployer.nft.address);
      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          0, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(2) // base price
        )
      ).to.not.be.reverted;
      await expect(
        deployer.auction.createSale(
          true, // is721
          deployer.nft.address, // nft address
          1, // nft token id
          1, // erc1151 token amount
          endedAt, // auction end timestamp
          toWei(2) // base price
        )
      ).to.not.be.reverted;
      const openAuctions = await deployer.auction.getOpenAuctions();
      expect(openAuctions.length).to.equal(2);
      await expect(deployer.auction.massCancelAuctions(openAuctions))
        .to.emit(deployer.auction, 'AuctionCancelled')
        .withArgs(openAuctions[0])
        .to.emit(deployer.auction, 'AuctionCancelled')
        .withArgs(openAuctions[1]);
    });
  });
});
