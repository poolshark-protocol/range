import { SUPPORTED_NETWORKS } from '../constants/supportedNetworks'

export interface NetworkConfig {
  chainId: number
  gas: number
  gasPrice: number
  url: string
  accounts: string[]
}

type NetworkConfigs = {
  [name in SUPPORTED_NETWORKS]: NetworkConfig
}

const getAccounts = function () {
  return process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : ['']
}

export const NETWORK_CONFIGS: NetworkConfigs = {
  /* Local Network Configs */
  hardhat: {
    chainId: 31337,
    gas: 9000000,
    gasPrice: 100000,
    url: '',
    accounts: [''],
  },
  /* Testnet Network Configs */
  goerli: {
    chainId: 5,
    gas: 9000000,
    gasPrice: 100000,
    url: process.env.GOERLI_URL || '',
    accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
  },
}
