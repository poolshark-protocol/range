import { network } from 'hardhat'
import { string } from 'hardhat/internal/core/params/argumentTypes'
import { CONTRACT_DEPLOYMENT_KEYS } from '../autogen/contract-deployments-keys'
import { greenLog, yellowLog, redLog } from '../constants/colorLog'
import { SUPPORTED_NETWORKS } from '../constants/supportedNetworks'
import { ContractDeploymentsKey } from './files/contractDeploymentsJson'

export async function logContractDeployment(
  network: string,
  contractName: string,
  objectName: string,
  contractAddress: string
) {
  console.log(`📡 ${network}:${contractName}:${objectName} deployed:`, contractAddress)
}

export async function waitToVerify(chainId: number) {
  const tx = await hre.props.alice.sendTransaction({
    to: hre.props.alice.address,
    value: 0,
  })

  const blockConfirmations = 5

  process.stdout.write(`\n🔎 Waiting ${blockConfirmations} block confirmations before verifying`)

  for (let i = 1; i <= blockConfirmations; i++) {
    process.stdout.write('.')
    await tx.wait(i)
    if (i === blockConfirmations) console.log()
  }
}

/**
 * @param singleObjectName [OPTIONAL] If specified, only this contract will be verified.
 */
export async function verifyContractDeployments(singleObjectName?: string) {
  console.log('\n-------------------------------------------------------------------')
  console.log('\n🔎 Starting Deployed Contract Verification...\n')

  await this.prepareWorkspace()

  await this.waitToVerify()

  let lastNetworkName = hre.network.name

  for (let k = 0; k < CONTRACT_DEPLOYMENT_KEYS.length; k++) {
    const key: ContractDeploymentsKey = CONTRACT_DEPLOYMENT_KEYS[k]

    if (singleObjectName && key.objectName !== singleObjectName) {
      continue
    }

    const contractName = await this.contractDeploymentsJson.getContractName(key)
    const contract = await this.getContract(
      contractName,
      key.networkName as SUPPORTED_NETWORKS,
      key.objectName
    )
    const constructorArguments = await this.getScrubbedConstructorArguments(key)

    await this.verifyContract(
      key.networkName,
      contractName,
      key.objectName,
      contract.address,
      constructorArguments
    )
  }

  greenLog('\n✅ Deployed Contract Verification complete.\n')
}

export async function verifyContract(
  chainId: number,
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
