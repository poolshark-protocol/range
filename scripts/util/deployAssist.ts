import { ContractDeploymentsKeys } from './files/contractDeploymentKeys'
import { ContractDeploymentsJson, ContractDeploymentsKey } from './files/contractDeploymentsJson'
import { DeploymentActionsJson } from './files/deploymentActionsJson'
import {
  LOCAL_NETWORKS,
  SUPPORTED_NETWORKS,
  TESTNET_NETWORKS,
} from '../constants/supportedNetworks'
import { ContractFactory, Contract } from 'ethers'
import { greenLog, yellowLog, redLog } from '../constants/colorLog'
import { CONTRACT_DEPLOYMENT_KEYS } from '../autogen/contract-deployments-keys'

export class DeployAssist {
  private contractDeploymentsJson: ContractDeploymentsJson
  private contractDeploymentsKeys: ContractDeploymentsKeys
  private deploymentActions: DeploymentActionsJson

  constructor() {
    this.contractDeploymentsJson = new ContractDeploymentsJson()
    this.contractDeploymentsKeys = new ContractDeploymentsKeys()
    this.deploymentActions = new DeploymentActionsJson()
  }

  public isLocal(): boolean {
    return hre.network.name === LOCAL_NETWORKS.HARDHAT.toString()
  }

  public isTestnet(): boolean {
    return hre.network.name === TESTNET_NETWORKS.GOERLI.toString()
  }

  public async deployContractWithRetry<T extends ContractFactory>(
    network: SUPPORTED_NETWORKS,
    contractFactory: T,
    objectName: string,
    constructorArguments: any[],
    linkedLibraries?: any
  ): Promise<Contract> {
    let contract: Contract

    contract = await this.deployContract(
      network,
      contractFactory,
      objectName,
      constructorArguments,
      linkedLibraries
    )

    return contract
  }

  private async deployContract<T extends ContractFactory>(
    network: SUPPORTED_NETWORKS,
    contractFactory: T,
    objectName: string,
    constructorArguments?: any[],
    linkedLibraries?: any,
    contractName?: string
  ): Promise<Contract> {
    // @ts-ignore
    contractName = contractName ?? contractFactory.name.split('__')[0]

    let contract: Contract
    if (linkedLibraries) {
      // @ts-ignore
      contract = await new contractFactory(linkedLibraries, hre.props.admin).deploy(
        ...constructorArguments,
        {
          nonce: hre.nonce,
        }
      )
    } else {
      // @ts-ignore
      contract = await new contractFactory(hre.props.admin).deploy(...constructorArguments, {
        nonce: hre.nonce,
      })
    }

    await contract.deployTransaction.wait(1)

    // console.log("Waiting for confirmation");

    await this.saveContractDeployment(
      network,
      contractName,
      objectName,
      contract,
      constructorArguments
    )

    // console.log("Saving contract deployment");

    hre.props[objectName] = contract
    hre.props[objectName]._admin = hre.props.admin

    hre.nonce += 1

    return contract
  }

  public async saveContractDeployment(
    network: SUPPORTED_NETWORKS,
    contractName: string,
    objectName: string,
    contract: Contract,
    constructorArguments: any[]
  ) {
    if (
      // true
      !this.isLocal()
    ) {
      this.logContractDeployment(network, contractName, objectName, contract.address)
    }

    if (
      // true
      !this.isLocal()
    ) {
      await this.contractDeploymentsJson.writeContractDeploymentsJsonFile(
        network,
        contractName,
        objectName,
        contract.address,
        constructorArguments
      )
      await this.contractDeploymentsKeys.addContractDeploymentKey({
        networkName: network,
        objectName: objectName,
      })
    }
  }

  public async deleteContractDeployment(network: SUPPORTED_NETWORKS, objectName: string) {
    if (!this.isLocal()) {
      await this.contractDeploymentsJson.deleteContractDeploymentsJsonFile(network, objectName)
      await this.contractDeploymentsKeys.addContractDeploymentKey({
        networkName: network,
        objectName: objectName,
      })
    }
  }

  private logContractDeployment(
    network: SUPPORTED_NETWORKS,
    contractName: string,
    objectName: string,
    contractAddress: string
  ) {
    console.log(`🛰️ ${network}:${contractName}:${objectName} deployed:`, contractAddress)
  }

  public async getContract(
    contractName: string,
    networkName: SUPPORTED_NETWORKS,
    objectName: string
  ): Promise<Contract> {
    const addr = await this.contractDeploymentsJson.getContractAddress({
      networkName,
      objectName,
    })

    console.log(addr)

    return await hre.ethers.getContractAt(contractName, addr)
  }

  private async getScrubbedConstructorArguments(key: ContractDeploymentsKey): Promise<any[]> {
    const originalConstructorArguments: any[] =
      await this.contractDeploymentsJson.getConstructorArguments(key)
    const constructorArguments: any[] = originalConstructorArguments

    originalConstructorArguments.forEach((arg, i) => {
      if (arg.gasLimit !== undefined || arg.value !== undefined) {
        constructorArguments.splice(i, 1)
      }
    })

    return constructorArguments
  }

  public async verifyContracts() {
    console.log(CONTRACT_DEPLOYMENT_KEYS.length)

    for (let k = 0; k < CONTRACT_DEPLOYMENT_KEYS.length; k++) {
      const key: ContractDeploymentsKey = CONTRACT_DEPLOYMENT_KEYS[k]

      const contractName = await this.contractDeploymentsJson.getContractName(key)
      console.log(contractName)
      console.log('test')
      const contract = await this.getContract(
        contractName,
        key.networkName as SUPPORTED_NETWORKS,
        key.objectName
      )
      console.log('test')
      const constructorArguments = await this.getScrubbedConstructorArguments(key)
      console.log('test')
      await this.verifyContract(
        key.networkName,
        contractName,
        key.objectName,
        contract.address,
        constructorArguments
      )
    }
  }

  private async verifyContract(
    networkName: string,
    contractName: string,
    objectName: string,
    address: string,
    constructorArguments: any[]
  ) {
    console.log(
      `\n🔎 Verifying ${contractName}:${objectName} contract on ${networkName.toUpperCase()} scanner: ${address}\n`
    )

    try {
      await hre.run('verify:verify', { address, constructorArguments })

      console.log(
        `\n🔎 ${contractName} contract verified on ${networkName.toUpperCase()} scanner: ${address}\n`
      )

      greenLog(
        `\n✅ Verified ${contractName}:${objectName} contract on ${networkName.toUpperCase()} scanner: ${address}\n`
      )
    } catch (error: any) {
      if (error.message.includes('Reason: Already Verified')) {
        yellowLog(
          `\n🔎 ${contractName} contract already verified on ${networkName.toUpperCase()} scanner: ${address}\n`
        )
      } else if (error.message.includes('Forbidden: Access is denied.')) {
        yellowLog(
          `\n🔎 Please visit ${address} on ${networkName.toUpperCase()} scanner to view verified contract.\n`
        )
      } else if (error.message.includes('Missing or invalid ApiKey')) {
        redLog(`\n🔎 (⚠️ ) Missing or invalid ApiKey: ${address}\n`)
      } else {
        redLog(`\n🔎 ${error}\n`)
      }
    }
  }
}
