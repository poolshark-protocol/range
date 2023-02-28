import { boolean } from 'hardhat/internal/core/params/argumentTypes'
import { InitialSetup } from '../../../test/utils/setup/initialSetup'
import { getNonce } from '../../utils'
import { VerifyContracts } from './verifyContracts'

export class DeployRangePools {
  private initialSetup: InitialSetup
  private nonce: number

  constructor() {
    this.initialSetup = new InitialSetup()
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

    // deploy contracts onto network
    await this.initialSetup.initialRangePoolSetup()

    // verify contracts on block explorer
    // await hre.run('verify-contracts');
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
