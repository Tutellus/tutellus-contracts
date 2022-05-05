require('dotenv').config()
require('@nomiclabs/hardhat-ganache')
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-truffle5')
require('@nomiclabs/hardhat-etherscan')
require('@openzeppelin/hardhat-upgrades')
require('hardhat-gas-reporter')
require('solidity-coverage')
require('hardhat-interface-generator')
const { random, template } = require('lodash')
const GAS_PRICE_DEFAULT = 50000000000
const GAS_MULTIPLIER_DEFAULT = 1
const chains = require('./chains.json')
const scanners = require('./scanners.json')

const keys = {
  INFURA_API_KEY: process.env.INFURA_API_KEY
}

const getScanUrl = () => {
  const chainId = scanners.current
  const result = scanners.url[chainId]
  return result
}
const getKey = () => {
  const chainId = scanners.current
  const result = scanners.apikey[chainId]
  return result
}
// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.getAddress())
  }
})

const getChainInfo = (chainId) =>
  chains.find((chain) => chain.chainId === parseInt(chainId, 10)) || {}

const concatKeys = (url, keys) => {
  const temp = template(url)
  return temp(keys)
}
const getUrl = (chainId) => {
  const finded = getChainInfo(chainId)
  const rpcNodes = finded.rpc

  const randomIndex = random(0, rpcNodes.length - 1)
  return concatKeys(rpcNodes[randomIndex], keys)
}

const getAccounts = () => {
  if (process.env.MNEMONIC) {
    return {
      mnemonic: process.env.MNEMONIC
    }
  } else {
    if (process.env.PRIVATE_KEY) {
      return [process.env.PRIVATE_KEY]
    } else {
      return undefined
    }
  }
}
// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    rinkeby: {
      url: getUrl(4),
      chainId: 4,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    goerli: {
      url: getUrl(5),
      chainId: 5,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    mainnet: {
      url: getUrl(1),
      chainId: 1,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    bsctestnet: {
      url: getUrl(97),
      chainId: 97,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    bscmainnet: {
      url: getUrl(56),
      chainId: 56,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    polygon: {
      url: getUrl(137),
      chainId: 137,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    polygonmumbai: {
      url: getUrl(80001),
      chainId: 80001,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: getAccounts()
    },
    // hardhat: {
    //   chainId: 31337,
    //   forking: {
    //     url: 'https://speedy-nodes-nyc.moralis.io/' + process.env.MORALIS_API_KEY + '/eth/rinkeby/archive'
    //   },
    //   accounts: getAccounts()
    // },
    // localhost: {
    //   chainId: 31337
    // }
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    compilers: [
      {
        version: '0.7.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.4.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
    enabled: process.env.REPORT_GAS
  },
  etherscan: {
    // url: process.env.ETHERSCAN_URL,
    // apiKey: process.env.ETHERSCAN_KEY

    url: getScanUrl(),
    apiKey: getKey()
  }
}
