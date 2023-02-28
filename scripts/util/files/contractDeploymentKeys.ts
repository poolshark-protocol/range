import { ContractDeploymentsKey } from './contractDeploymentsJson'
import { FileIOClient } from '../clients/fileIOClient'
import { DeployConstants } from '../../constants/deployConstants'

export class ContractDeploymentsKeys {
  private fileIO: FileIOClient

  constructor() {
    this.fileIO = new FileIOClient()
  }

  public prepareContractDeploymentKeys() {
    const functionName = 'prepareContractDeploymentKeys'

    const contractDeploymentsKeysPrepend = this.fileIO.readFile(
      DeployConstants.KEYS_TS_PREPEND,
      functionName
    )

    this.fileIO.overwriteFile(
      DeployConstants.CONTRACT_DEPLOYMENTS_KEYS_TS_FILENAME,
      contractDeploymentsKeysPrepend,
      functionName
    )
  }

  public async addContractDeploymentKey(key: ContractDeploymentsKey) {
    const functionName = 'addContractDeploymentKey'

    /* Do not update spacing here. */
    const formattedKey = `    {
        networkName: '${key.networkName}',
        objectName: '${key.objectName}'
    },
];`
    /* END: Do not update spacing here. */

    const contractDeploymentsKeysWithoutLastline = await this.fileIO.deleteLastLine(
      DeployConstants.CONTRACT_DEPLOYMENTS_KEYS_TS_FILENAME,
      functionName
    )

    this.fileIO.overwriteFile(
      DeployConstants.CONTRACT_DEPLOYMENTS_KEYS_TS_FILENAME,
      contractDeploymentsKeysWithoutLastline.concat(formattedKey),
      functionName
    )
  }

  public async completeContractDeploymentKeys() {
    const functionName = 'completeContractDeploymentKeys'

    const contractDeploymentsKeysWithoutLastline = await this.fileIO.deleteLastLine(
      DeployConstants.CONTRACT_DEPLOYMENTS_KEYS_TS_FILENAME,
      functionName
    )

    const contractDeploymentsKeysPostpend = this.fileIO.readFile(
      DeployConstants.KEYS_TS_POSTPEND,
      functionName
    )

    this.fileIO.overwriteFile(
      DeployConstants.CONTRACT_DEPLOYMENTS_KEYS_TS_FILENAME,
      contractDeploymentsKeysWithoutLastline.concat(contractDeploymentsKeysPostpend),
      functionName
    )
  }
}
