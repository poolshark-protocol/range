import { SUPPORTED_NETWORKS } from '../../../scripts/constants/supportedNetworks'
import { InitialSetup } from '../../../test/utils/setup/initialSetup'
import { mintSigners20 } from '../../../test/utils/token'
import { getNonce } from '../../utils'
import { CONTRACT_DEPLOYMENT_KEYS } from '../../../scripts/autogen/contract-deployments-keys'
import {
  ContractDeploymentsJson,
  ContractDeploymentsKey,
} from '../../../scripts/util/files/contractDeploymentsJson'
import { ContractDeploymentsKeys } from '../../../scripts/util/files/contractDeploymentKeys'
import { DeploymentActionsJson } from '../../../scripts/util/files/deploymentActionsJson'
import { Contract } from 'ethers'
import { greenLog, yellowLog, redLog } from '../../../test/utils/colors'
import { DeployAssist } from '../../../scripts/util/deployAssist'

export class VerifyContracts {
  private deployAssist: DeployAssist

  private initialSetup: InitialSetup
  private nonce: number

  constructor() {
    this.initialSetup = new InitialSetup()
    // this.psharkGlobalConfigs = new PsharkGlobalConfigs();
    this.deployAssist = new DeployAssist()
  }

  public async preDeployment() {
    //clear out deployments json file for this network
  }

  public async runDeployment() {
    const signers = await ethers.getSigners()
    hre.props.alice = signers[0]
    hre.props.admin = signers[0]
    console.log(hre.network.name)
    if (hre.network.name == 'hardhat') {
      hre.props.bob = signers[1]
      hre.carol = signers[2]
    }
    hre.nonce = await getNonce(hre, hre.props.alice.address)
    await this.deployAssist.verifyContracts()
  }

  public async postDeployment() {}

  public canDeploy(): boolean {
    let canDeploy = true

    if (!hre.network.name) {
      console.log('❌ ERROR: No network name present.')
      canDeploy = false
    }

    return canDeploy
  }
}
