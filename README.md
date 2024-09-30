# Advanced Solidity Final Project

Optimizes an auction contract for lower gas consumption.

## Project By

- [Guido De Vita](https://github.com/dvgui)
- More...

## Marketplace Contracts

Allows users to auction their 721 and 1151 NFTs while setting a fee.
It works with instant sales and counter-offers made by potential buyers that the seller can accept.

### DanteToken

ERC20CappedUpgradeable with ERC-2612 (ERC20 Permit) and burnable extensions.

### HeroNFT

ERC721EnumerableUpgradeable collectible NFTs.
Implementation with custom mint (safeMint) function, transfer whitelist and an extra state added to save the NFT quality.
Max supply per mint type.

### DanteItemNFT

ERC1155 with extensions: supply, upgradeable, burnable.
Like the hero contract, implements an optional cap per ID for mint and mintBatch.

# Setup

## Installation

Install with yarn

```bash
  yarn install
```

Run tests

```bash
  yarn test
```

## Deployment

1. Create a mnemonic.txt file with your seed phrase and ake sure to set up envs.
2. Delete test token contract
3. Enter your infura key on the env file and make sure hardhat config has the right value as well.
4. Deploy using

```bash
  yarn hardhat deploy --network bscTestnet --tags Marketplace
```

5. Verify with the following command. Make sure the etherscan plugin is properly configured.

```bash
yarn verify --network bscTestnet
```
