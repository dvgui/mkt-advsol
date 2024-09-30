# EVM Contracts

List of BSC contracts for distributing rewards, minting NFT, marketplace and others.

## DanteToken
ERC20CappedUpgradeable with ERC-2612 (ERC20 Permit) and burnable extensions.

## HeroNFT
ERC721EnumerableUpgradeable collectible NFTs.
Implementation with custom mint (safeMint) function, transfer whitelist and an extra state added to save the NFT quality.
Max supply per mint type.

## DanteStore
Instant sale marketplace with admin-created listings. Allows minting an NFT by paying with BNB and/or up to 2 more tokens.
Mints 1151 and 721 NFTs. Supports permits.

## Marketplace
Allows users to auction their 721 and 1151 NFTs while setting a fee.
It works with instant sales and counter-offers made by potential buyers that the seller can accept.

## ClaimContract
Sends tokens to users based on an external authorized signature.

## DanteItemNFT
ERC1155 with extensions: supply, upgradeable, burnable.
Like the hero contract, implements an optional cap per ID for mint and mintBatch.

## DanteVesting
Vesting distribution contract. Implements a 25% penalty on early claims.
Based on a period defined by the constructor allows users to claim (mint) tokens until the end based on their allocation.

## FixedStaking
Staking contract with fixed APR and multiple pools.

## ProductStore
Validates purchases based on off-chain signatures. Accepts up to 2 currencies at the same time.

## Season Factory & Lock
Creates a contract for multiple seasons that allows users to lock funds for a determined time.


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
  yarn hardhat deploy --network bscTestnet --tags TokenLock
```

5. Verify with the following command. Make sure the etherscan plugin is properly configured.

```bash
yarn verify --network bscTestnet
```
