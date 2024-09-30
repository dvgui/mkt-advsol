/* eslint-disable no-undef */
import fs from 'fs';
import { HardhatUserConfig, task } from 'hardhat/config';

// import '@nomicfoundation/hardhat-toolbox';

import 'hardhat-gas-reporter';

import 'hardhat-deploy';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-deploy-ethers';

import '@nomicfoundation/hardhat-chai-matchers';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'hardhat-abi-exporter';

import '@openzeppelin/hardhat-upgrades';
import { utils } from 'ethers';

import chalk from 'chalk';
import '@nomiclabs/hardhat-etherscan';
import { HttpNetworkUserConfig } from 'hardhat/types';

require('dotenv').config();

const { isAddress, getAddress, formatUnits, parseUnits } = utils;

const defaultNetwork = 'localhost';
const etherscanApiKey = process.env.ETHERSCAN_API_KEY || '';
const bscscanApiKey = process.env.BSCSCAN_API_KEY || '';
const infuraKey = process.env.INFURA_ID || '';
const bscTestnet = process.env.QUICKNODE_BSC_TESTNET || '';
const bsc = process.env.QUICKNODE_BSC_MAINNET || '';

export function getMnemonic() {
  try {
    return fs.readFileSync('./mnemonic.txt').toString().trim();
  } catch (e) {
    if (defaultNetwork !== 'localhost') {
      console.log(
        '☢️ WARNING: No mnemonic file created for a deploy account. Try `yarn run generate` and then `yarn run account`.'
      );
    }
  }
  return '';
}

const config: HardhatUserConfig = {
  defaultNetwork,
  /**
   * gas reporter configuration that let's you know
   * an estimate of gas for contract deployments and function calls
   * More here: https://hardhat.org/plugins/hardhat-gas-reporter.html
   */
  gasReporter: {
    currency: 'USD',
    token: 'BNB',
    // ideally get gas price from API but for BNB it is usually 5 gwei
    // gasPriceApi: 'https://api.bscscan.com/api?module=proxy&action=eth_gasPrice',
    gasPrice: 5,
    coinmarketcap: process.env.COINMARKETCAP || undefined,
    enabled: true
  },

  // if you want to deploy to a testnet, mainnet, or xdai, you will need to configure:
  // 1. An Infura key (or similar)
  // 2. A private key for the deployer
  // DON'T PUSH THESE HERE!!!
  // An `example.env` has been provided in the Hardhat root. Copy it and rename it `.env`
  // Follow the directions, and uncomment the network you wish to deploy to.

  networks: {
    hardhat: {
      accounts: {
        mnemonic: getMnemonic(),
        count: 6
      }
    },
    localhost: {
      url: 'http://127.0.0.1:8545/',
      gasPrice: 0,
      accounts: {
        mnemonic: getMnemonic()
      }
      /*
        notice no mnemonic here? it will just use account 0 of the hardhat node to deploy
        (you can put in a mnemonic here to set the deployer locally)
      */
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad', // <---- YOUR INFURA ID! (or it won't work)
      //      url: "https://speedy-nodes-nyc.moralis.io/XXXXXXXXXXXXXXXXXXXXXXXXX/eth/mainnet", // <---- YOUR MORALIS ID! (not limited to infura)
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    optimism: {
      url: 'https://mainnet.optimism.io',
      accounts: {
        mnemonic: getMnemonic()
      },
      companionNetworks: {
        l1: 'mainnet'
      }
    },
    bscTestnet: {
      url: bscTestnet,
      gasPrice: 4000000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    bsc: {
      url: bsc,
      gasPrice: 3000000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    gnosis: {
      url: 'https://rpc.gnosischain.com/',
      gasPrice: 1000000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    polygon: {
      url: 'https://polygon-rpc.com',
      // url: "https://speedy-nodes-nyc.moralis.io/XXXXXXXXXXXXXXXXXXXx/polygon/mainnet", // <---- YOUR MORALIS ID! (not limited to infura)
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraKey}`, // <---- YOUR INFURA ID! (or it won't work)
      //      url: "https://speedy-nodes-nyc.moralis.io/XXXXXXXXXXXXXXXXXXXXXXXXX/eth/goerli", // <---- YOUR MORALIS ID! (not limited to infura)
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    sepolia: {
      url: 'https://rpc.sepolia.org', // <---- YOUR INFURA ID! (or it won't work)
      //      url: "https://speedy-nodes-nyc.moralis.io/XXXXXXXXXXXXXXXXXXXXXXXXX/eth/goerli", // <---- YOUR MORALIS ID! (not limited to infura)
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    zksyncalpha: {
      url: 'https://zksync2-testnet.zksync.dev',
      gasPrice: 100000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    chiado: {
      url: 'https://rpc.chiadochain.net',
      gasPrice: 1000000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    fantom: {
      url: 'https://rpcapi.fantom.network',
      gasPrice: 1000000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    testnetFantom: {
      url: 'https://rpc.testnet.fantom.network',
      gasPrice: 1000000000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      // url: "https://speedy-nodes-nyc.moralis.io/XXXXXXXXXXXXXXXXXXXXXXX/polygon/mumbai", // <---- YOUR MORALIS ID! (not limited to infura)
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    matic: {
      url: 'https://rpc-mainnet.maticvigil.com/',
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    goerliOptimism: {
      url: 'https://goerli.optimism.io/',
      accounts: {
        mnemonic: getMnemonic()
      },
      companionNetworks: {
        l1: 'goerli'
      }
    },
    localOptimism: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: getMnemonic()
      },
      companionNetworks: {
        l1: 'localOptimismL1'
      }
    },
    localOptimismL1: {
      url: 'http://localhost:9545',
      gasPrice: 0,
      accounts: {
        mnemonic: getMnemonic()
      },
      companionNetworks: {
        l2: 'localOptimism'
      }
    },
    localAvalanche: {
      url: 'http://localhost:9650/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43112,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    fujiAvalanche: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43113,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    mainnetAvalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43114,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    testnetHarmony: {
      url: 'https://api.s0.b.hmny.io',
      gasPrice: 1000000000,
      chainId: 1666700000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    mainnetHarmony: {
      url: 'https://api.harmony.one',
      gasPrice: 1000000000,
      chainId: 1666600000,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    moonbeam: {
      url: 'https://rpc.api.moonbeam.network',
      chainId: 1284,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    moonriver: {
      url: 'https://rpc.api.moonriver.moonbeam.network',
      chainId: 1285,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    moonbaseAlpha: {
      url: 'https://rpc.api.moonbase.moonbeam.network',
      chainId: 1287,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    moonbeamDevNode: {
      url: 'http://127.0.0.1:9933',
      chainId: 1281,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    godwoken: {
      url: 'https://godwoken-testnet-v1.ckbapp.dev',
      chainId: 71401,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    goerliArbitrum: {
      url: 'https://goerli-rollup.arbitrum.io/rpc/',
      chainId: 421613,
      accounts: {
        mnemonic: getMnemonic()
      }
    },
    devnetArbitrum: {
      url: 'https://nitro-devnet.arbitrum.io/rpc',
      chainId: 421612,
      accounts: {
        mnemonic: getMnemonic()
      }
    }
  },
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000
          }
        }
      }
    ]
  },
  namedAccounts: {
    deployer: {
      default: 0 // here this will by default take the first account as deployer
    },
    newOwner: {
      default: 1
    },
    testUser: {
      default: 2
    },
    minter: {
      default: 3
    },
    treasury: {
      default: 4
    },
    pauser: {
      default: 5
    },
    userPermit: {
      default: 6
    }
  },
  etherscan: {
    apiKey: {
      mainnet: etherscanApiKey,
      goerli: etherscanApiKey,
      kovan: etherscanApiKey,
      rinkeby: etherscanApiKey,
      ropsten: etherscanApiKey,
      bscTestnet: bscscanApiKey,
      bsc: bscscanApiKey
      // add other network's API key here
    }
  },
  abiExporter: {
    path: './contracts/abi',
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [],
    spacing: 2,
    pretty: false
  },
  mocha: {
    timeout: 30000
  }
};

export default config;

const DEBUG = false;

function debug(text: string) {
  if (DEBUG) {
    console.log(text);
  }
}

task('wallet', 'Create a wallet (pk) link', async (_, { ethers }) => {
  const randomWallet = ethers.Wallet.createRandom();
  const { privateKey } = randomWallet._signingKey();
  console.log(`🔐 WALLET Generated as ${randomWallet.address}`);
  console.log(`🔗 http://localhost:3000/pk#${privateKey}`);
});

task('fundedwallet', 'Create a wallet (pk) link and fund it with deployer?')
  .addOptionalParam('amount', 'Amount of ETH to send to wallet after generating')
  .addOptionalParam('url', 'URL to add pk to')
  .setAction(async (taskArgs, { network, ethers }) => {
    const randomWallet = ethers.Wallet.createRandom();
    const { privateKey } = randomWallet._signingKey();
    console.log(`🔐 WALLET Generated as ${randomWallet.address}`);
    const url = taskArgs.url ? taskArgs.url : 'http://localhost:3000';

    let localDeployerMnemonic;
    try {
      localDeployerMnemonic = fs.readFileSync('./mnemonic.txt');
      localDeployerMnemonic = localDeployerMnemonic.toString().trim();
    } catch (e) {
      /* do nothing - this file isn't always there */
    }

    const amount = taskArgs.amount ? taskArgs.amount : '0.01';
    const tx = {
      to: randomWallet.address,
      value: ethers.utils.parseEther(amount)
    };

    // SEND USING LOCAL DEPLOYER MNEMONIC IF THERE IS ONE
    // IF NOT SEND USING LOCAL HARDHAT NODE:
    if (localDeployerMnemonic) {
      // eslint-disable-next-line new-cap
      let deployerWallet = ethers.Wallet.fromMnemonic(localDeployerMnemonic.toString());
      deployerWallet = deployerWallet.connect(ethers.provider);
      console.log(`💵 Sending ${amount} ETH to ${randomWallet.address} using deployer account`);
      const sendresult = await deployerWallet.sendTransaction(tx);
      console.log(`\n${url}/pk#${privateKey}\n`);
    } else {
      console.log(`💵 Sending ${amount} ETH to ${randomWallet.address} using local node`);
      console.log(`\n${url}/pk#${privateKey}\n`);
      return send(ethers.provider.getSigner(), tx);
    }
  });

task('generate', 'Create a mnemonic for builder deploys', async (_, { ethers }) => {
  const bip39 = require('bip39');
  const { hdkey } = require('ethereumjs-wallet');
  const EthUtil = require('ethereumjs-util');

  const mnemonic = bip39.generateMnemonic();
  if (DEBUG) console.log('mnemonic', mnemonic);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  if (DEBUG) console.log('seed', seed);
  const hdwallet = hdkey.fromMasterSeed(seed);
  const wallet_hdpath = "m/44'/60'/0'/0/";
  const account_index = 0;
  const fullPath = wallet_hdpath + account_index;
  if (DEBUG) console.log('fullPath', fullPath);
  const wallet = hdwallet.derivePath(fullPath).getWallet();
  const privateKey = wallet.getPrivateKey();
  if (DEBUG) console.log('privateKey', privateKey);
  if (DEBUG) console.log(EthUtil.privateToAddress(privateKey));
  const address = `0x${EthUtil.privateToAddress(privateKey).toString('hex')}`;
  console.log(`🔐 Account Generated as ${address} and set as mnemonic in packages/hardhat`);
  console.log("💬 Use 'yarn run account' to get more information about the deployment account.");

  fs.writeFileSync(`./${address}.txt`, mnemonic.toString());
  fs.writeFileSync('./mnemonic.txt', mnemonic.toString());
});

task('mineContractAddress', 'Looks for a deployer account that will give leading zeros')
  .addParam('searchFor', 'String to search for')
  .setAction(async (taskArgs, { network, ethers }) => {
    let contract_address = '';
    let address;

    const bip39 = require('bip39');
    const { hdkey } = require('ethereumjs-wallet');

    let mnemonic = '';
    while (contract_address.indexOf(taskArgs.searchFor) !== 0) {
      mnemonic = bip39.generateMnemonic();
      if (DEBUG) console.log('mnemonic', mnemonic);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      if (DEBUG) console.log('seed', seed);
      const hdwallet = hdkey.fromMasterSeed(seed);
      const wallet_hdpath = "m/44'/60'/0'/0/";
      const account_index = 0;
      const fullPath = wallet_hdpath + account_index;
      if (DEBUG) console.log('fullPath', fullPath);
      const wallet = hdwallet.derivePath(fullPath).getWallet();
      const privateKey = `0x${wallet._privKey.toString('hex')}`;
      if (DEBUG) console.log('privateKey', privateKey);
      const EthUtil = require('ethereumjs-util');
      address = `0x${EthUtil.privateToAddress(wallet._privKey).toString('hex')}`;

      const rlp = require('rlp');
      const keccak = require('keccak');

      const nonce = 0x00; // The nonce must be a hex literal!
      const sender = address;

      const input_arr = [sender, nonce];
      const rlp_encoded = rlp.encode(input_arr);

      const contract_address_long = keccak('keccak256').update(rlp_encoded).digest('hex');

      contract_address = contract_address_long.substring(24); // Trim the first 24 characters.
    }

    console.log(`⛏  Account Mined as ${address} and set as mnemonic in packages/hardhat`);
    console.log(`📜 This will create the first contract: ${chalk.magenta(`0x${contract_address}`)}`);
    console.log("💬 Use 'yarn run account' to get more information about the deployment account.");

    fs.writeFileSync(`./${address}_produces${contract_address}.txt`, mnemonic.toString());
    fs.writeFileSync('./mnemonic.txt', mnemonic.toString());
  });

task('account', 'Get balance informations for the deployment account.', async (_, { ethers }) => {
  const { hdkey } = require('ethereumjs-wallet');
  const bip39 = require('bip39');
  try {
    const mnemonic = fs.readFileSync('./mnemonic.txt').toString().trim();
    if (DEBUG) console.log('mnemonic', mnemonic);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    if (DEBUG) console.log('seed', seed);
    const hdwallet = hdkey.fromMasterSeed(seed);
    const wallet_hdpath = "m/44'/60'/0'/0/";
    const account_index = 0;
    const fullPath = wallet_hdpath + account_index;
    if (DEBUG) console.log('fullPath', fullPath);
    const wallet = hdwallet.derivePath(fullPath).getWallet();
    const privateKey = `0x${wallet._privKey.toString('hex')}`;
    if (DEBUG) console.log('privateKey', privateKey);
    const EthUtil = require('ethereumjs-util');
    const address = `0x${EthUtil.privateToAddress(wallet._privKey).toString('hex')}`;

    const qrcode = require('qrcode-terminal');
    qrcode.generate(address);
    console.log(`‍📬 Deployer Account is ${address}`);

    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const n in config.networks) {
      // console.log(config.networks[n],n)
      try {
        const network = config.networks[n] as HttpNetworkUserConfig;
        const provider = new ethers.providers.JsonRpcProvider(network.url);
        const balance = await provider.getBalance(address);
        console.log(` -- ${n} --  -- -- 📡 `);
        console.log(`   balance: ${ethers.utils.formatEther(balance)}`);
        console.log(`   nonce: ${await provider.getTransactionCount(address)}`);
      } catch (e) {
        if (DEBUG) {
          console.log(e);
        }
      }
    }
  } catch (err) {
    console.log(`--- Looks like there is no mnemonic file created yet.`);
    console.log(`--- Please run ${chalk.greenBright('yarn generate')} to create one`);
  }
});

async function addr(ethers: any, name: any) {
  if (isAddress(name)) {
    return getAddress(name);
  }
  const accounts = await ethers.provider.listAccounts();
  if (accounts[name] !== undefined) {
    return accounts[name];
  }
  throw new Error(`Could not normalize address: ${name}`);
}

task('accounts', 'Prints the list of accounts', async (_, { ethers }) => {
  const accounts = await ethers.provider.listAccounts();
  accounts.forEach((account) => console.log(account));
});

task('blockNumber', 'Prints the block number', async (_, { ethers }) => {
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(blockNumber);
});

task('balance', "Prints an account's balance")
  .addPositionalParam('account', "The account's address")
  .setAction(async (taskArgs, { ethers }) => {
    const balance = await ethers.provider.getBalance(await addr(ethers, taskArgs.account));
    console.log(formatUnits(balance, 'ether'), 'ETH');
  });

function send(signer: any, txparams: any) {
  return signer.sendTransaction(txparams);
}

task('send', 'Send ETH')
  .addParam('from', 'From address or account index')
  .addOptionalParam('to', 'To address or account index')
  .addOptionalParam('amount', 'Amount to send in ether')
  .addOptionalParam('data', 'Data included in transaction')
  .addOptionalParam('gasPrice', 'Price you are willing to pay in gwei')
  .addOptionalParam('gasLimit', 'Limit of how much gas to spend')

  .setAction(async (taskArgs, { network, ethers }) => {
    const from = await addr(ethers, taskArgs.from);
    debug(`Normalized from address: ${from}`);
    const fromSigner = await ethers.provider.getSigner(from);

    let to;
    if (taskArgs.to) {
      to = await addr(ethers, taskArgs.to);
      debug(`Normalized to address: ${to}`);
    }

    const txRequest = {
      from: await fromSigner.getAddress(),
      to,
      value: parseUnits(taskArgs.amount ? taskArgs.amount : '0', 'ether').toHexString(),
      nonce: await fromSigner.getTransactionCount(),
      gasPrice: parseUnits(taskArgs.gasPrice ? taskArgs.gasPrice : '1.001', 'gwei').toHexString(),
      gasLimit: taskArgs.gasLimit ? taskArgs.gasLimit : 24000,
      chainId: network.config.chainId
    };

    debug(`${Number(txRequest.gasPrice) / 1000000000} gwei`);
    debug(JSON.stringify(txRequest, null, 2));

    return send(fromSigner, txRequest);
  });
