import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { DEPLOY_RANGEPOOLS, VERIFY_CONTRACTS } from '../constants/taskNames'
import { VerifyContracts } from './utils/verifyContracts'

class VerifyContractsTask {
  public deployHedgePools: VerifyContracts
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.deployHedgePools = new VerifyContracts()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(VERIFY_CONTRACTS)
  .setDescription('Verifies all contracts')
  .setAction(async function ({ ethers }) {
    const deployHedgePools: VerifyContractsTask = new VerifyContractsTask()

    if (!deployHedgePools.deployHedgePools.canDeploy()) return

    await deployHedgePools.deployHedgePools.preDeployment()

    await deployHedgePools.deployHedgePools.runDeployment()

    await deployHedgePools.deployHedgePools.postDeployment()

    console.log('Contract verification complete.\n')
  })
