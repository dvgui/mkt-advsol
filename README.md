# Advanced Solidity Final Project

Optimizes an auction contract for lower gas consumption.

## Transaction Costs To Beat

```
·---------------------------------------------|---------------------------|---------------|-----------------------------·
|            Solc version: 0.8.19             ·  Optimizer enabled: true  ·  Runs: 10000  ·  Block limit: 30000000 gas  │
··············································|···························|···············|······························
|  Methods                                    ·                5 gwei/gas                 ·       572.86 usd/bnb        │
·······················|······················|·············|·············|···············|···············|··············
|  Contract            ·  Method              ·  Min        ·  Max        ·  Avg          ·  # calls      ·  usd (avg)  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  acceptOffer         ·          -  ·          -  ·       189293  ·            2  ·       0.54  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  addNFT              ·          -  ·          -  ·        52357  ·            9  ·       0.15  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  bid                 ·      97127  ·     136665  ·       120636  ·           12  ·       0.35  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  buy                 ·     224160  ·     233368  ·       228764  ·            4  ·       0.66  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  cancelAuction       ·          -  ·          -  ·       154155  ·            2  ·       0.44  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  createSale          ·     307873  ·     333267  ·       314514  ·           23  ·       0.90  │
·······················|······················|·············|·············|···············|···············|··············
|  Marketplace         ·  massCancelAuctions  ·          -  ·          -  ·       213084  ·            3  ·       0.61  │
·······················|······················|·············|·············|···············|···············|··············
|  Deployments                                ·                                           ·  % of limit   ·             │
··············································|·············|·············|···············|···············|··············
|  Marketplace                                ·          -  ·          -  ·      4261442  ·       14.2 %  ·      12.21  │
·---------------------------------------------|-------------|-------------|---------------|---------------|-------------·
```

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
